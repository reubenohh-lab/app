import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExamplePlayer} from '../public/audio-player.js';
function fixture() {
  const events={},calls=[],errors=[],states=[];
  const audio={addEventListener:(name,callback)=>{events[name]=callback;},pause:()=>calls.push('pause'),play:()=>{calls.push('play');return Promise.resolve();}};
  const player=createExamplePlayer({audio,clips:{Hola:'/audio/hola.mp3'},onError:e=>errors.push(e),onState:s=>states.push(s)});
  return {audio,player,events,calls,errors,states};
}
test('real media playback is requested synchronously without a speech engine',()=>{
  const f=fixture();assert.equal(f.player.play('Hola'),true);assert.deepEqual(f.calls,['pause','play']);assert.equal(f.audio.src,'/audio/hola.mp3');assert.equal(f.audio.playbackRate,1);f.events.playing();assert.equal(f.states.at(-1),'playing');f.events.ended();assert.equal(f.states.at(-1),'idle');
});
test('slower examples preserve pitch and stop cancels playback',()=>{
  const f=fixture();f.player.play('Hola',{slow:true});assert.equal(f.audio.playbackRate,0.75);assert.equal(f.audio.preservesPitch,true);f.player.stop();assert.equal(f.calls.at(-1),'pause');
});
test('autoplay rejection asks for a native control tap and an old rejection is ignored',async()=>{
  const f=fixture();f.audio.play=()=>Promise.reject({name:'NotAllowedError'});f.player.play('Hola');await Promise.resolve();assert.deepEqual(f.errors,['tap-native-player']);
  f.errors.length=0;f.player.play('Hola');f.player.stop();await Promise.resolve();assert.deepEqual(f.errors,[]);
});
test('missing and failed clips report failures without inventing audio',()=>{
  const f=fixture();assert.equal(f.player.play('missing'),false);assert.deepEqual(f.calls,[]);f.events.error();assert.deepEqual(f.errors,['audio-unavailable','audio-unavailable']);
});
