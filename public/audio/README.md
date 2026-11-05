# Bundled Spanish examples

These are synthetic speech examples, generated offline using Kokoro v1.0
(Apache-2.0 model), the `ef_dora` Spanish voice, the `es-419` Latin American
Spanish phonemizer, and kokoro-onnx 0.4.9. They are not human voice recordings.

Model and voice source:
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Only generated MP3 outputs are bundled. The model, voice weights, and generation
dependencies are not shipped or downloaded by the app or by Render. No speech
API is called to play examples. Each filename identifies the phrase and voice
configuration by a SHA-256 prefix. See `scripts/generate-audio.py` to regenerate.
