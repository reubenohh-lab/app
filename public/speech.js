// Keep speech dispatch synchronous: Safari may reject speech queued after an await.
export function createSpeaker({synthesis,Utterance,onError=()=>{},onState=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}) {
  let voices=[],current=null,watchdog=null;
  function refreshVoices() {try {voices=synthesis?.getVoices()||[];}catch {voices=[];}}
  refreshVoices();
  synthesis?.addEventListener?.('voiceschanged',refreshVoices);
  function clearWatchdog() {if(watchdog!==null)clearTimer(watchdog);watchdog=null;}
  function stop() {
    clearWatchdog();
    const previous=current;current=null;
    if(previous){previous.onstart=null;previous.onend=null;previous.onerror=null;}
    if(synthesis?.speaking||synthesis?.pending)synthesis.cancel();
    onState('idle');
  }
  function play(text,{slow=false}={}) {
    if(!synthesis||!Utterance){onError('unsupported');return false;}
    stop();refreshVoices();
    try {
      const utterance=new Utterance(text);
      // A strong reference prevents mobile engines from losing the utterance.
      current=utterance;
      const voice=voices.find(v=>/^es[-_]MX$/i.test(v.lang))||voices.find(v=>/^es[-_](US|CO|AR|CL|PE)/i.test(v.lang))||voices.find(v=>/^es/i.test(v.lang));
      utterance.lang=voice?.lang||'es-MX';
      if(voice)utterance.voice=voice;
      // An empty list is normal during Safari startup. Let the engine resolve lang.
      utterance.rate=slow?0.65:0.88;utterance.volume=1;utterance.pitch=1;
      utterance.onstart=()=>{if(current!==utterance)return;clearWatchdog();onState('playing');};
      utterance.onend=()=>{if(current!==utterance)return;clearWatchdog();current=null;onState('idle');};
      utterance.onerror=event=>{if(current!==utterance)return;clearWatchdog();current=null;onState('idle');if(!['interrupted','canceled'].includes(event.error))onError(event.error||'failed');};
      onState('loading');
      watchdog=setTimer(()=>{if(current===utterance){stop();onError('timeout');}},10000);
      if(synthesis.paused)synthesis.resume();
      synthesis.speak(utterance);
      return true;
    } catch {clearWatchdog();current=null;onState('idle');onError('failed');return false;}
  }
  return {play,stop};
}
