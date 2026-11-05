import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,award,streak,loadProgress,dayKey} from '../public/progress.js';
import {lessons} from '../public/curriculum.js';
import {audioClips} from '../public/audio-catalog.js';
import {stat} from 'node:fs/promises';
import {server} from '../server.js';
let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(r=>server.close(r)));
test('XP records local calendar days and streak tolerates today being unfinished',()=>{
  const day=new Date(2026,10,5,12);let p=award(freshProgress(),20,day);p=award(p,10,new Date(2026,10,4,12));
  assert.equal(p.xp,30);assert.equal(p.days[dayKey(day)],20);assert.equal(streak(p,day),2);assert.equal(streak(p,new Date(2026,10,6,12)),2);assert.equal(streak(p,new Date(2026,10,7,12)),0);
});
test('invalid backups are rejected and untrusted resume data is discarded',()=>{
  assert.deepEqual(loadProgress('{'),freshProgress());
  assert.deepEqual(loadProgress(JSON.stringify({...freshProgress(),days:{x:'no'}})),freshProgress());
  assert.equal(loadProgress(JSON.stringify({...freshProgress(),lastLesson:{id:'<script>',index:99}})).lastLesson,null);
  const p=award(freshProgress(),40);assert.deepEqual(loadProgress(JSON.stringify(p)),p);
});
test('every lesson has four answerable quizzes, vocabulary and a two-sided conversation',()=>{
  assert.equal(lessons.length,8);assert.equal(new Set(lessons.map(l=>l.id)).size,8);
  for(const l of lessons){assert.equal(l.items.length,4);for(const item of l.items){assert.equal(item.choices.filter(c=>c===item.en).length,1);assert.ok(item.es.length>5);}assert.ok(l.words.length>=4);assert.ok(l.dialogue.some(d=>d[0]==='host'));assert.ok(l.dialogue.some(d=>d[0]==='you'));}
});
test('every lesson, vocabulary word, and dialogue line has a bundled audio asset',async()=>{
  const phrases=new Set(lessons.flatMap(l=>[...l.items.map(i=>i.es),...l.words.map(w=>w[0]),...l.dialogue.map(d=>d[1])]));
  assert.equal(Object.keys(audioClips).length,phrases.size);
  for(const phrase of phrases){const clip=audioClips[phrase];assert.match(clip,/^\/audio\/[a-f0-9]{16}\.mp3$/);assert.ok((await stat(new URL('../public'+clip,import.meta.url))).size>1000,phrase);}
});
test('audio streams use the MIME type and byte ranges needed by Safari',async()=>{
  const url=base+audioClips['Mucho gusto. ¿Y tú?'];
  const full=await fetch(url);assert.equal(full.status,200);assert.equal(full.headers.get('content-type'),'audio/mpeg');const bytes=new Uint8Array(await full.arrayBuffer());
  const partial=await fetch(url,{headers:{Range:'bytes=0-1'}});assert.equal(partial.status,206);assert.equal(partial.headers.get('accept-ranges'),'bytes');assert.equal(partial.headers.get('content-range'),`bytes 0-1/${bytes.length}`);assert.deepEqual(new Uint8Array(await partial.arrayBuffer()),bytes.slice(0,2));
  const suffix=await fetch(url,{headers:{Range:'bytes=-10'}});assert.equal(suffix.status,206);assert.deepEqual(new Uint8Array(await suffix.arrayBuffer()),bytes.slice(-10));
  assert.equal((await fetch(url,{headers:{Range:'bytes=999999999-'}})).status,416);
  const head=await fetch(url,{method:'HEAD'});assert.equal(Number(head.headers.get('content-length')),bytes.length);assert.equal((await head.arrayBuffer()).byteLength,0);
});
test('server serves application assets and reports grading disabled without keys',async()=>{
  const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/Brisa/);
  assert.equal((await fetch(base+'/app.js')).headers.get('content-type'),'text/javascript');
  const health=await (await fetch(base+'/api/health')).json();assert.equal(health.ok,true);
  assert.equal((await fetch(base+'/api/assess?text=Hola',{method:'POST'})).status,503);
  assert.equal((await fetch(base+'/missing')).status,404);
});
test('assessment protects credentials and passes WAV + reference to Azure (mock service)',async()=>{
  process.env.AZURE_SPEECH_KEY='test-key';process.env.AZURE_SPEECH_REGION='eastus';process.env.ASSESSMENT_ACCESS_TOKEN='test-access';
  const original=globalThis.fetch;
  try{
    assert.equal((await original(base+'/api/assess?text=Hola',{method:'POST'})).status,401);
    assert.equal((await original(base+'/api/assess?text=Hola',{method:'POST',headers:{Authorization:'Bearer test-access','Content-Type':'audio/webm'}})).status,415);
    let called=false;
    globalThis.fetch=async(url,options)=>{
      if(String(url).startsWith(base))return original(url,options);
      called=true;assert.match(url,/eastus.stt.speech.microsoft.com/);assert.match(url,/es-MX/);
      assert.equal(JSON.parse(Buffer.from(options.headers['Pronunciation-Assessment'],'base64').toString()).ReferenceText,'Hola');
      assert.equal(options.headers['Ocp-Apim-Subscription-Key'],'test-key');
      return new Response(JSON.stringify({NBest:[{Display:'Hola',PronunciationAssessment:{PronScore:91,AccuracyScore:90},Words:[{Word:'Hola'}]}]}));
    };
    const audio=Buffer.alloc(100);audio.write('RIFF');audio.write('WAVE',8);
    const r=await original(base+'/api/assess?text=Hola',{method:'POST',headers:{Authorization:'Bearer test-access','Content-Type':'audio/wav'},body:audio});
    assert.equal(r.status,200);assert.equal((await r.json()).PronScore,91);assert.equal(called,true);
  } finally{globalThis.fetch=original;delete process.env.AZURE_SPEECH_KEY;delete process.env.AZURE_SPEECH_REGION;delete process.env.ASSESSMENT_ACCESS_TOKEN;}
});
