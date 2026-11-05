import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpeaker} from '../public/speech.js';
function fixture(initialVoices=[]) {
  let voices=initialVoices,changed,watchdog;const calls=[],errors=[],states=[];
  const synthesis={speaking:false,pending:false,paused:false,getVoices:()=>voices,addEventListener:(event,fn)=>{changed=fn;},cancel:()=>calls.push('cancel'),resume:()=>{calls.push('resume');synthesis.paused=false;},speak:u=>calls.push(u)};
  const speaker=createSpeaker({synthesis,Utterance:class {constructor(text){this.text=text;}},onError:e=>errors.push(e),onState:s=>states.push(s),setTimer:fn=>{watchdog=fn;return 1;},clearTimer:()=>{watchdog=null;}});
  return {synthesis,speaker,calls,errors,states,setVoices:v=>{voices=v;changed();},timeout:()=>watchdog?.()};
}
test('Safari cold start dispatches synchronously with no voices and a Spanish language',()=>{
  const f=fixture();assert.equal(f.speaker.play('Hola'),true);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].text,'Hola');assert.equal(f.calls[0].lang,'es-MX');assert.equal(f.calls[0].voice,undefined);assert.deepEqual(f.errors,[]);
  f.calls[0].onstart();f.calls[0].onend();assert.deepEqual(f.states,['idle','loading','playing','idle']);
});
test('voices loaded later prefer Mexican Spanish and keep the slow-example setting',()=>{
  const f=fixture([{lang:'en-US'}]);const spanish={lang:'es-MX'},spain={lang:'es-ES'};f.setVoices([spain,spanish]);f.speaker.play('Mucho gusto',{slow:true});assert.equal(f.calls[0].voice,spanish);assert.equal(f.calls[0].rate,0.65);f.speaker.stop();
});
test('paused engines resume in the tap call and repeated examples cancel the old speech',()=>{
  const f=fixture();f.synthesis.paused=true;f.speaker.play('Hola');assert.equal(f.calls[0],'resume');const first=f.calls[1];f.synthesis.speaking=true;f.speaker.play('Gracias');assert.equal(first.onstart,null);assert.equal(f.calls[2],'cancel');assert.equal(f.calls[3].text,'Gracias');f.speaker.stop();
});
test('speech errors and silent startup failures are surfaced rather than silently ignored',()=>{
  const f=fixture();f.speaker.play('Hola');f.calls[0].onerror({error:'language-unavailable'});assert.deepEqual(f.errors,['language-unavailable']);
  f.speaker.play('Gracias');f.timeout();assert.deepEqual(f.errors,['language-unavailable','timeout']);
});
test('unsupported speech engines report a useful failure',()=>{
  let error;const speaker=createSpeaker({onError:e=>{error=e;}});assert.equal(speaker.play('Hola'),false);assert.equal(error,'unsupported');
});
