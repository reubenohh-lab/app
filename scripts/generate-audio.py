"""Optional offline asset generation. Not run during installation or deployment.

Requires kokoro-onnx==0.4.9, soundfile, ffmpeg, and the official Kokoro v1.0
model/voices files in the directory passed as the first argument.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

import numpy as np
import onnxruntime as rt
import soundfile as sf
from kokoro_onnx import Kokoro

root = Path(__file__).resolve().parents[1]
models = Path(sys.argv[1]).resolve()
output = root / 'public' / 'audio'
output.mkdir(exist_ok=True)
phrases = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {lessons} from './public/curriculum.js'; console.log(JSON.stringify([...new Set(lessons.flatMap(l=>[...l.items.map(i=>i.es),...l.words.map(w=>w[0]),...l.dialogue.map(d=>d[1])]))]));"
], cwd=root))
opts = rt.SessionOptions()
opts.intra_op_num_threads = 3
opts.inter_op_num_threads = 1
session = rt.InferenceSession(str(models / 'kokoro-v1.0.onnx'), sess_options=opts, providers=['CPUExecutionProvider'])
engine = Kokoro.from_session(session, str(models / 'voices-v1.0.bin'))
catalog = {}
for index, text in enumerate(phrases):
    identity = 'kokoro-v1.0/ef_dora/es-419/0.9/' + text
    name = hashlib.sha256(identity.encode()).hexdigest()[:16] + '.mp3'
    target = output / name
    if not target.exists():
        samples, rate = engine.create(text, voice='ef_dora', speed=0.9, lang='es-419')
        assert np.isfinite(samples).all() and np.sqrt(np.mean(samples ** 2)) > 0.001, text
        peak = np.max(np.abs(samples))
        if peak > 0.98:
            samples = samples * (0.98 / peak)
        samples = np.concatenate([np.zeros(int(rate * 0.05)), samples, np.zeros(int(rate * 0.15))])
        with tempfile.TemporaryDirectory() as temporary:
            wav = Path(temporary) / 'clip.wav'
            sf.write(wav, samples, rate)
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', str(target)], check=True)
    catalog[text] = '/audio/' + name
    print(f'{index + 1}/{len(phrases)} {text}', flush=True)
(root / 'public' / 'audio-catalog.js').write_text('// Bundled synthetic Spanish examples. Regenerate with scripts/generate-audio.py.\nexport const audioClips = ' + json.dumps(catalog, ensure_ascii=False, indent=2) + ';\n')
print('Audio catalog complete.', flush=True)
