// HTML media playback is called directly in the tap handler, including on iOS.
export function createExamplePlayer({audio,clips,onError=()=>{},onState=()=>{}}) {
  let generation=0;
  audio.addEventListener('playing',()=>onState('playing'));
  audio.addEventListener('pause',()=>onState('idle'));
  audio.addEventListener('ended',()=>onState('idle'));
  audio.addEventListener('error',()=>{onState('idle');onError('audio-unavailable');});
  function stop() {generation++;audio.pause();onState('idle');}
  function play(text,{slow=false}={}) {
    const source=clips[text];
    if(!source){onError('audio-unavailable');return false;}
    stop();const request=++generation;
    audio.src=source;audio.playbackRate=slow?0.75:1;audio.preservesPitch=true;
    onState('loading');
    try {
      // Do not fetch, await, or wait for canplay before this call. Safari needs
      // the direct user interaction even when the audio file is still loading.
      const playing=audio.play();
      playing?.catch(error=>{if(request!==generation||error.name==='AbortError')return;onState('idle');onError(error.name==='NotAllowedError'?'tap-native-player':'audio-unavailable');});
      return true;
    } catch {onState('idle');onError('audio-unavailable');return false;}
  }
  return {play,stop};
}
