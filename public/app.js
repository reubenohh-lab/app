import {lessons} from './curriculum.js';
import {freshProgress,loadProgress,dayKey,award,streak} from './progress.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let progress;
try {progress=loadProgress(localStorage.getItem('brisa-progress'));}catch {progress=freshProgress();}
if(progress.lastLesson&&!lessons.some(l=>l.id===progress.lastLesson.id))progress.lastLesson=null;
let page='learn',filter='All',active=null,answer=null,options=[],reviewIndex=0,flipped=false,conversation=0,turn=0;
let blob=null,blobUrl=null,recorder=null,stream=null,audioContext=null,recordTimer=null,recording=false,busy=false,assessment=null;
let assessmentEnabled=false,customPhrase='',storageWarning=false;
const app=$('#app');
function toast(message) {$('#toast').textContent=message;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function save() {try{localStorage.setItem('brisa-progress',JSON.stringify(progress));}catch{storageWarning=true;toast('Your browser could not save progress. Export a backup in Progress.');}}
function addXP(amount) {progress=award(progress,amount);save();}
function todayXP() {return progress.days[dayKey()]||0;}
const arrow = '<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const navIcons = {
  learn:'<path d="m12 3 9 9-9 9-9-9Z"/><path d="m12 8 4 4-4 4-4-4Z"/>',
  talk:'<path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z"/><path d="M7 10h9M7 14h6"/>',
  review:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  voice:'<path d="M3 9c5-7 13 7 18 0M3 15c5-7 13 7 18 0"/>',
  progress:'<path d="M4 20V10M10 20V5M16 20v-7M22 20V2"/>'
};
function shell(content) {
  content=content.replaceAll('↗',arrow);
  app.innerHTML=`<aside class="sidebar"><a class="brand" href="#learn" aria-label="Brisa home"><img src="/icon.svg" alt="">brisa<span>ESPAÑOL</span></a><nav aria-label="Main navigation">${[['learn','◈','Learn'],['talk','◌','Conversations'],['review','▤','Word collection'],['voice','≋','Voice studio'],['progress','↗','Your progress']].map(([id,icon,label])=>`<button aria-label="${icon} ${label}" data-nav="${id}" class="nav-item ${page===id?'selected':''}" ${page===id?'aria-current="page"':''}><span><svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${navIcons[id]}</svg></span><b>${label}</b></button>`).join('')}</nav><div class="sidebar-note"><span>☀</span><p>A little every day.<br>A world of possibility.</p><small>LATIN AMERICAN SPANISH</small></div></aside><div class="workspace"><header class="topbar"><span class="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><div class="stats"><span title="Current streak">♨ <b>${streak(progress)}</b><small>day streak</small></span><span title="Total experience">✧ <b>${progress.xp}</b><small>XP</small></span><button class="avatar" data-nav="progress" aria-label="Your progress">YOU</button></div></header><main id="main">${content}</main><footer>Made for real life. One conversation at a time.<span>Brisa · Spanish, with a little sunshine.</span></footer></div>`;
}
function heading(kicker,title,description) {return `<div class="page-heading"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>`;}
function render() {
  if(page==='learn') renderLearn();
  if(page==='talk') renderTalk();
  if(page==='review') renderReview();
  if(page==='voice') renderVoice();
  if(page==='progress') renderProgress();
  if(page==='lesson') renderLesson();
}
function renderLearn() {
  const complete=Object.keys(progress.completed).filter(id=>lessons.some(l=>l.id===id)).length;
  const next=lessons.find(l=>!progress.completed[l.id])||lessons[0];
  shell(`<section class="hero"><div class="hero-copy"><div class="pill">✦ SMALL LESSONS. REAL CONNECTIONS.</div><h1>A little Spanish.<br><em>A bigger world.</em></h1><p>For the café around the corner.<br>The person you haven’t met yet.<br>The stories you’ll bring home.</p><button class="primary" data-start="${esc(progress.lastLesson?.id||next.id)}">${progress.lastLesson?'Pick up where you left off':'Let’s start talking'} <span>↗</span></button><small>3–5 minutes · Beginner friendly · Your pace</small></div><div class="hero-art" aria-hidden="true"><div class="sun"></div><div class="arch"><div class="hill far"></div><div class="hill near"></div><div class="road"></div><div class="plant"><svg viewBox="0 0 100 100"><path d="M50 95V42M50 70Q10 75 18 35Q45 35 50 70M50 55Q80 55 81 15Q50 16 50 55" fill="#31563c" stroke="#31563c" stroke-width="5"/></svg></div></div><span class="bubble hola">¡Hola! <i>hello, new friend</i></span><span class="bubble gusto">Mucho gusto. <i>nice to meet you</i></span><span class="art-caption">GOOD CONVERSATIONS<br>START WITH A HELLO.</span><span class="spark">✧</span></div></section><div class="learn-layout"><section class="journey"><div class="section-heading"><div><span class="eyebrow">YOUR LEARNING JOURNEY</span><h2>Out into the world</h2></div><span class="muted">${complete} / ${lessons.length} lessons</span></div><div class="tabs" role="group" aria-label="Lesson category">${['All','People','Travel','Business'].map(f=>`<button data-filter="${f}" class="${filter===f?'active':''}" aria-pressed="${filter===f}">${f==='All'?'All lessons':f==='People'?'Meeting people':f}</button>`).join('')}</div><div class="lesson-list">${lessons.filter(l=>filter==='All'||l.track===filter).map((l)=>`<button class="lesson-card ${progress.completed[l.id]?'done':''}" data-start="${l.id}"><span class="lesson-icon">${l.icon}</span><span class="lesson-info"><small>${l.track.toUpperCase()} <span>· ${l.level}</span></small><strong>${l.title}</strong><span>${l.subtitle}</span></span><span class="lesson-end">${progress.completed[l.id]?'✓':'+40 XP'}<b>${progress.completed[l.id]?'REVISIT':'↗'}</b></span></button>`).join('')}</div><p class="hint">↗ Already know a little? Jump into any lesson. Nothing is locked.</p></section><aside class="right-column"><section class="goal-card"><div class="section-heading"><span class="eyebrow">A LITTLE EVERY DAY</span><span>☀</span></div><h3>Your daily moment</h3><p>Small steps take you places.</p><div class="goal-ring" style="--fill:${Math.min(todayXP()/progress.goal,1)*360}deg"><div><strong>${todayXP()}</strong><span>of ${progress.goal} XP</span></div></div><p class="goal-status">${todayXP()>=progress.goal?'You did it. Today’s goal is complete!':'A few minutes for your future self.'}</p><button class="text-button" data-nav="progress">Adjust your daily goal ↗</button></section><section class="conversation-card"><span class="eyebrow">SAY IT OUT LOUD</span><span class="chat-decoration">“</span><h3>Less studying.<br>More <em>connecting.</em></h3><p>Meet Sofía. Order a café. Get a little lost. Practice the conversations that matter.</p><button class="secondary" data-nav="talk">Try a conversation <span>↗</span></button></section><div class="local-note"><span>◉</span><p>Your journey stays with you.<br><small>Progress saves on this device. No account needed.</small></p></div></aside></div>`);
}
function startLesson(id,resume=true) {
  const lesson=lessons.find(l=>l.id===id);if(!lesson)return;
  active={id,index:0,correct:0};
  if(resume&&progress.lastLesson?.id===id && Number.isInteger(progress.lastLesson.index)&&progress.lastLesson.index>=0&&progress.lastLesson.index<5) active={...progress.lastLesson};
  answer=null;page='lesson';prepareOptions();render();window.scrollTo(0,0);
}
function prepareOptions() {if(!active)return;const lesson=lessons.find(l=>l.id===active.id);const item=lesson.items[active.index];options=item?[...item.choices].sort(()=>Math.random()-.5):[];}
function renderLesson() {
  const lesson=lessons.find(l=>l.id===active.id);const item=lesson.items[active.index];const speaking=active.index===4;
  shell(`<div class="exercise-wrap"><div class="exercise-top"><button class="text-button" data-nav="learn">← Back to journey</button><span>${lesson.title} · ${Math.min(active.index+1,5)} / 5</span></div><progress max="5" value="${active.index}" aria-label="Lesson progress"></progress><span class="eyebrow">${speaking?'MAKE IT YOURS':active.index%2?'TRAIN YOUR EAR':'A LITTLE UNDERSTANDING'}</span><h1>${speaking?'Say it with confidence':active.index%2?'Listen. What did you hear?':'What does this mean?'}</h1>${speaking?`<div class="prompt"><span>YOUR PHRASE</span><h2>${lesson.dialogue[1][1]}</h2><p>${lesson.items[0].note}</p><button class="secondary" data-speak="${esc(lesson.dialogue[1][1])}">▶ Hear an example</button></div><p class="muted">Try saying the phrase aloud. Open the Voice studio for recording and optional detailed pronunciation grading.</p><button class="text-button" data-practice="${esc(lesson.dialogue[1][1])}">Practice and record in Voice studio ↗</button><div class="exercise-actions"><button class="primary" data-finish>Finish lesson ✦</button></div>`:`<div class="prompt">${active.index%2?`<button class="listen-button" data-speak="${esc(item.es)}" aria-label="Play Spanish phrase">▶</button><p>Tap to hear the phrase. You can replay it.</p><details><summary>Show Spanish transcript</summary><h2>${item.es}</h2></details>`:`<h2>${item.es}</h2><button class="text-button" data-speak="${esc(item.es)}">▶ Hear it in Spanish</button>`}</div><div class="answers" role="group" aria-label="Translation answers">${options.map((o,i)=>`<button data-answer="${i}" ${answer!==null?'disabled':''} class="answer ${answer!==null&&o===item.en?'correct':answer===i?'incorrect':''}"><span>${i+1}</span>${o}${answer!==null&&o===item.en?' <b>✓</b>':''}</button>`).join('')}</div>${answer!==null?`<div class="feedback ${options[answer]===item.en?'positive':'gentle'}"><strong>${options[answer]===item.en?'¡Muy bien! You’ve got it.':'A little practice makes it stick.'}</strong><p>${item.es} = ${item.en}</p><small>${item.note}</small></div><div class="exercise-actions"><button class="primary" data-next>Continue →</button></div>`:'<p class="hint">Choose the closest English translation.</p>'}`}</div>`);
}
function finishLesson() {
  const first=!progress.completed[active.id];const points=first?20+active.correct*5:10;
  progress.completed[active.id]={date:dayKey(),correct:active.correct};
  lessons.find(l=>l.id===active.id).words.forEach(([es])=>{if(!progress.words[es]) progress.words[es]={known:false,reviews:0};});
  progress.lastLesson=null;addXP(points);
  shell(`<section class="completion"><div class="completion-sun">✦</div><span class="eyebrow">ONE STEP CLOSER TO YOUR NEXT ADVENTURE</span><h1>Look at you, speaking Spanish.</h1><p>You finished “${lessons.find(l=>l.id===active.id).title}”.<br>Take these phrases out into the world.</p><div class="result-stats"><div><strong>+${points}</strong><span>XP EARNED</span></div><div><strong>${active.correct}/4</strong><span>QUIZ ANSWERS</span></div><div><strong>${streak(progress)}</strong><span>DAY STREAK</span></div></div><button class="primary" data-nav="talk">Put it into conversation ↗</button><button class="text-button" data-nav="learn">Back to your journey</button></section>`);active=null;
}
function renderTalk() {
  const l=lessons[conversation];
  shell(`${heading('REAL WORDS. REAL CONNECTIONS.','Let’s talk about it.','Practice both sides of the moments you’ll actually have. Listen, answer aloud, and make the conversation your own.')}<div class="talk-layout"><section><div class="scenario-grid">${lessons.map((lesson,i)=>`<button class="scenario ${conversation===i?'active':''}" data-scenario="${i}"><span>${lesson.icon}</span><strong>${lesson.title}</strong><small>${lesson.track}</small></button>`).join('')}</div><div class="tip"><strong>A conversation, at your pace.</strong><p>These are guided role-plays, with suggested replies. Try your own answer before revealing the next line. There is no live AI conversation service connected.</p></div></section><section class="dialogue-card"><div class="dialogue-header"><span class="person-avatar">S</span><div><h3>A moment with Sofía</h3><small>${l.subtitle}</small></div><span class="badge">GUIDED</span></div><div class="dialogue-lines">${l.dialogue.slice(0,turn+1).map(([who,text])=>`<div class="dialogue-line ${who}"><span>${who==='host'?'SOFÍA':'YOU · SUGGESTED REPLY'}</span><p>${text}</p><button class="text-button" data-speak="${esc(text)}">▶ Listen</button>${who==='you'?`<button class="text-button" data-practice="${esc(text)}">Record this reply ↗</button>`:''}</div>`).join('')}</div>${turn<l.dialogue.length-1?`<button class="primary" data-turn>${l.dialogue[turn+1][0]==='you'?'Reveal a reply':'Hear what comes next'} →</button>`:`<div class="feedback positive"><strong>Now make it your own.</strong><p>Swap in your name, your home country, or your favorite drink.</p></div><button class="secondary" data-restart-talk>Practice again ↻</button>`}</section></div>`);
}
function reviewWords() {return lessons.flatMap(l=>l.words.map(([es,en])=>({es,en,lesson:l.title})));}
function renderReview() {
  const words=reviewWords(),word=words[reviewIndex%words.length],known=words.filter(w=>progress.words[w.es]?.known).length;
  shell(`${heading('PACK A FEW GOOD WORDS','Your word collection.','Little phrases that open doors. Tap a card, say it aloud, and come back to the words you’re still learning.')}<div class="review-layout"><section class="review-card"><div class="section-heading"><span class="eyebrow">${esc(word.lesson)}</span><span>${reviewIndex%words.length+1} / ${words.length}</span></div><button class="flashcard" data-flip aria-label="Flip vocabulary card"><small>${flipped?'ENGLISH':'SPANISH'}</small><strong>${flipped?word.en:word.es}</strong><span>↻ Tap to ${flipped?'see Spanish':'reveal meaning'}</span></button><button class="text-button" data-speak="${esc(word.es)}">▶ Hear pronunciation</button>${flipped?`<div class="review-buttons"><button class="secondary" data-review="again">Still learning</button><button class="primary" data-review="known">Got it ✓</button></div>`:'<p class="hint">Try remembering the meaning before you flip.</p>'}</section><aside class="collection-summary"><span class="eyebrow">READY FOR REAL LIFE</span><h2>${known}<small> / ${words.length}</small></h2><p>phrases marked familiar</p><progress value="${known}" max="${words.length}" aria-label="Familiar words"></progress><p>Every phrase is available from the start. Marking a word familiar earns 2 XP the first time.</p><h3>Keep an ear out for…</h3>${words.filter(w=>!progress.words[w.es]?.known).slice(0,5).map(w=>`<div class="word-row"><strong>${w.es}</strong><span>${w.en}</span></div>`).join('')||'<p>All familiar! Revisit them to keep them fresh.</p>'}</aside></div>`);
}
function currentPhrase() {return customPhrase||lessons[conversation].dialogue.find(d=>d[0]==='you')[1];}
function renderVoice() {
  shell(`${heading('FIND YOUR SPANISH VOICE','A little louder. A little braver.','Listen to a phrase, give it a try, and hear yourself back. Confidence comes one conversation at a time.')}<div class="voice-layout"><section class="voice-card"><label for="phrase">YOUR PRACTICE PHRASE</label><select id="phrase" ${recording||busy?'disabled':''}><option value="">Choose a useful phrase…</option>${lessons.map(l=>`<optgroup label="${l.title}">${l.dialogue.filter(d=>d[0]==='you').map(d=>`<option value="${esc(d[1])}" ${currentPhrase()===d[1]?'selected':''}>${d[1]}</option>`).join('')}</optgroup>`).join('')}</select><h2>${esc(currentPhrase())}</h2><button class="secondary" data-speak="${esc(currentPhrase())}">▶ Play example</button><label class="speed-label"><input id="slow" type="checkbox"> Slower example</label><div class="recording-area"><div class="waveform ${recording?'recording':''}" aria-hidden="true">${[20,35,55,28,65,42,75,45,25,60,35,20,45,65,25].map(h=>`<i style="height:${h}px"></i>`).join('')}</div><strong role="status">${recording?'Listening… speak your phrase':blob?'Nice. Now listen back.':'Your voice belongs in the conversation.'}</strong><p>${recording?'Recording stops automatically after 30 seconds.':'Microphone access requires HTTPS or localhost.'}</p><button class="${recording?'stop-button':'primary'}" data-record ${busy?'disabled':''}>${recording?'■ Stop recording':'● '+(blob?'Record again':'Start recording')}</button></div>${blobUrl?`<label for="playback">YOUR RECORDING</label><audio id="playback" controls src="${blobUrl}"></audio><p class="privacy-note">Recordings stay in this browser until you request a score. They are not saved when you close or reload the app.</p><button class="secondary" data-assess ${!assessmentEnabled||busy?'disabled':''}>${busy?'Assessing pronunciation…':'Get pronunciation feedback ↗'}</button>`:''}${assessment?renderAssessment():''}</section><aside><section class="assessment-note"><span class="eyebrow">HONEST FEEDBACK, BETTER PRACTICE</span><h3>More than a guess.</h3><p>${assessmentEnabled?'Azure pronunciation assessment is configured. Each score request sends this recording and phrase to Microsoft and may incur usage charges.':'Accurate grading is not connected yet. No pronunciation scores are invented from your recording.'}</p><span class="badge ${assessmentEnabled?'connected':''}">${assessmentEnabled?'AZURE CONFIGURED':'GRADING NOT CONNECTED'}</span><p>Optional Azure AI Speech assessment provides accuracy, fluency, completeness, and sound-level feedback for Mexican Spanish (es-MX).</p><details><summary>Service, privacy & costs</summary><p>Requires an Azure Speech resource, key, and region on the server, plus a private grading passphrase. Audio is sent to Microsoft only when you request feedback.</p><p>Speech and pronunciation assessment are usage-billed by audio duration. Features, free quotas, and rates vary by plan and region. Confirm current charges before enabling.</p><a href="https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/" target="_blank" rel="noopener">View official Azure Speech pricing ↗</a><p>Keep your Azure key out of this browser. See the deployment guide for setup, access protection, and spending limits.</p></details>${assessmentEnabled?`<label for="grading-token">PRIVATE GRADING PASSPHRASE</label><input id="grading-token" type="password" autocomplete="off" placeholder="From your server settings"><small>Held in this tab only; never saved to progress.</small>`:''}</section><section class="tip"><h3>A traveler’s pronunciation kit</h3><p><b>Vowels:</b> keep a, e, i, o, u short and steady.</p><p><b>Silent h:</b> hola begins with an “o” sound.</p><p><b>r / rr:</b> pero has a tap; perro has a trill.</p><p><b>Latin American s:</b> gracias uses an “s” sound, though accents vary.</p><small>These are general practice tips, not an assessment of your recording.</small></section></aside></div>`);
}
function renderAssessment() {
  const scoreKeys=[['PronScore','Overall'],['AccuracyScore','Accuracy'],['FluencyScore','Fluency'],['CompletenessScore','Completeness']];
  const words=assessment.words||[];
  const issues=words.filter(w=>w.PronunciationAssessment?.AccuracyScore<80 || (w.PronunciationAssessment?.ErrorType&&w.PronunciationAssessment.ErrorType!=='None'));
  return `<section class="assessment-result"><span class="eyebrow">AZURE ASSESSMENT · ES-MX</span><h3>Your pronunciation feedback</h3><div class="score-grid">${scoreKeys.map(([k,label])=>`<div><strong>${Number.isFinite(assessment[k])?Math.round(assessment[k]):'—'}</strong><small>${label}</small></div>`).join('')}</div><p>Heard: ${esc(assessment.text)}</p>${issues.length?`<h4>Give these words another try</h4>${issues.map(w=>`<div class="sound-feedback"><b>${esc(w.Word)}</b><span> Accuracy: ${Math.round(w.PronunciationAssessment?.AccuracyScore||0)}/100 · ${esc(w.PronunciationAssessment?.ErrorType||'')}</span>${(w.Phonemes||[]).filter(p=>p.PronunciationAssessment?.AccuracyScore<80).map(p=>`<p>Focus on /${esc(p.Phoneme)}/ — ${Math.round(p.PronunciationAssessment.AccuracyScore)}/100. Replay the example, isolate this sound, then blend it into “${esc(w.Word)}”.</p>`).join('')}</div>`).join('')}`:'<p>No word-level issues below the practice threshold of 80 were flagged. Keep listening and repeating.</p>'}<small>Automated scores are estimates and can vary with microphone quality and accent. Sound symbols are supplied by Azure; feedback is limited to the detail returned by the service.</small></section>`;
}
function renderProgress() {
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {day:dayKey(d),label:d.toLocaleDateString(undefined,{weekday:'short'}),xp:progress.days[dayKey(d)]||0};});
  shell(`${heading('EVERY LITTLE STEP COUNTS','Look how far you’re going.','Your progress is saved in this browser. Take a backup if you’re switching devices.')}<div class="progress-grid"><section class="metric"><span>✧</span><strong>${progress.xp}</strong><p>Total XP</p></section><section class="metric"><span>♨</span><strong>${streak(progress)}</strong><p>Day streak</p></section><section class="metric"><span>◈</span><strong>${Object.keys(progress.completed).filter(id=>lessons.some(l=>l.id===id)).length}</strong><p>Lessons completed</p></section></div><div class="progress-layout"><section class="panel"><h2>Your week in little steps</h2><div class="week-chart">${days.map(d=>`<div><small>${d.xp} XP</small><div class="bar-track"><i style="height:${Math.max(3,Math.min(d.xp/Math.max(progress.goal,...days.map(d=>d.xp))*100,100))}%"></i></div><span>${d.label}</span></div>`).join('')}</div><p class="muted">Earn any XP to keep a streak. Your daily XP goal is a separate personal target. Dates follow your device’s local time.</p></section><section class="panel"><span class="eyebrow">MAKE ROOM FOR A LITTLE SPANISH</span><h2>Your daily goal</h2><div class="goal-choices">${[[15,'A little hello'],[30,'A daily moment'],[50,'A bigger adventure']].map(([n,l])=>`<button data-goal="${n}" class="${progress.goal===n?'active':''}" aria-pressed="${progress.goal===n}"><b>${n} XP</b><span>${l}</span></button>`).join('')}</div><p>${todayXP()} of ${progress.goal} XP today ${todayXP()>=progress.goal?'· Goal complete ✓':''}</p></section></div><section class="panel backup"><div><h3>Keep your journey close</h3><p>No account or cloud sync. Export a backup to move your progress to another browser or phone.${storageWarning?' Saving is currently unavailable in this browser.':''}</p></div><button class="secondary" data-export>Export progress ↓</button><label class="secondary import-label">Import backup ↑<input type="file" id="import" accept="application/json,.json"></label></section>`);
}
let gradingToken='',audioGeneration=0;
async function speak(text) {
  if(!('speechSynthesis' in window))return toast('Spoken examples are not supported by this browser. Try Safari or Chrome.');
  speechSynthesis.cancel();
  let voices=speechSynthesis.getVoices();
  if(!voices.length){await new Promise(r=>setTimeout(r,200));voices=speechSynthesis.getVoices();}
  const voice=voices.find(v=>/^es[-_]MX/i.test(v.lang))||voices.find(v=>/^es[-_](US|CO|AR)/i.test(v.lang))||voices.find(v=>/^es/i.test(v.lang));
  if(!voice)return toast('No Spanish voice is installed. Enable a Spanish text-to-speech voice in your device settings.');
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-MX';utterance.voice=voice;utterance.rate=$('#slow')?.checked?0.65:0.88;
  utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')toast('Could not play the example. Check your device’s speech settings.');};speechSynthesis.speak(utterance);
}
function clearAudio() {audioGeneration++;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;blob=null;assessment=null;}
function stopRecording() {clearTimeout(recordTimer);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());recording=false;}
async function record() {
  if(recording){stopRecording();return;}
  if(busy)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toast('Recording needs HTTPS and a supported browser such as Safari or Chrome.');
  try {
    busy=true;renderVoice();
    window.speechSynthesis?.cancel();
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true}});
    if(page!=='voice'){stream.getTracks().forEach(t=>t.stop());busy=false;return;}
    clearAudio();const generation=audioGeneration;const context=new AudioContext();audioContext=context;await context.resume();
    recorder=new MediaRecorder(stream);const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      busy=true;recording=false;if(page==='voice')renderVoice();
      try {const original=new Blob(chunks,{type:recorder.mimeType});const converted=await toWav(original,context);if(generation===audioGeneration){blob=converted;blobUrl=URL.createObjectURL(blob);}}catch {toast('Could not process this recording. Try recording again.');}
      finally{await context.close();busy=false;if(page==='voice')renderVoice();}
    };
    recorder.start();busy=false;recording=true;recordTimer=setTimeout(stopRecording,30000);renderVoice();
  }catch {busy=false;stream?.getTracks().forEach(t=>t.stop());if(audioContext&&audioContext.state!=='closed')audioContext.close();if(page==='voice')renderVoice();toast('Microphone access was unavailable. Allow microphone access in your browser settings and try again.');}
}
async function toWav(input,context) {
  const decoded=await context.decodeAudioData(await input.arrayBuffer());
  const length=Math.min(Math.round(decoded.duration*16000),480000);
  const offline=new OfflineAudioContext(1,length,16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
  const result=await offline.startRendering(),samples=result.getChannelData(0),buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
  const str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');view.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,s<0?s*32768:s*32767,true);}
  return new Blob([buffer],{type:'audio/wav'});
}
async function assess() {
  if(!blob||busy)return;
  gradingToken=$('#grading-token')?.value||gradingToken;
  if(!gradingToken)return toast('Enter your private grading passphrase first.');
  if(!confirm('Send this recording to Microsoft Azure for pronunciation assessment? This may incur usage charges on the configured account.'))return;
  busy=true;renderVoice();
  try{const response=await fetch('/api/assess?text='+encodeURIComponent(currentPhrase()),{method:'POST',headers:{'Content-Type':'audio/wav','Authorization':'Bearer '+gradingToken},body:blob,signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw Error(data.error);assessment=data;}
  catch(error){toast(error.message||'Assessment failed. Please try again.');}finally{busy=false;if(page==='voice')renderVoice();}
}
function navigate(destination) {
  if(recording)stopRecording();
  window.speechSynthesis?.cancel();page=destination;render();window.scrollTo(0,0);
}
app.addEventListener('click',async e=>{
  const b=e.target.closest('button, a.brand');if(!b||b.disabled)return;
  if(b.matches('a.brand')){e.preventDefault();navigate('learn');}
  if(b.dataset.nav)navigate(b.dataset.nav);
  if(b.dataset.filter){filter=b.dataset.filter;renderLearn();}
  if(b.dataset.start)startLesson(b.dataset.start);
  if(b.dataset.speak)speak(b.dataset.speak);
  if(b.dataset.answer!==undefined&&answer===null){answer=Number(b.dataset.answer);const l=lessons.find(l=>l.id===active.id);if(options[answer]===l.items[active.index].en)active.correct++;renderLesson();}
  if(b.hasAttribute('data-next')){active.index++;answer=null;progress.lastLesson={...active};save();prepareOptions();renderLesson();}
  if(b.hasAttribute('data-finish'))finishLesson();
  if(b.dataset.scenario!==undefined){conversation=Number(b.dataset.scenario);turn=0;renderTalk();}
  if(b.hasAttribute('data-turn')){turn++;renderTalk();const line=lessons[conversation].dialogue[turn];if(line[0]==='host')speak(line[1]);}
  if(b.hasAttribute('data-restart-talk')){turn=0;renderTalk();}
  if(b.dataset.practice){customPhrase=b.dataset.practice;clearAudio();navigate('voice');}
  if(b.hasAttribute('data-flip')){flipped=!flipped;renderReview();}
  if(b.dataset.review){const word=reviewWords()[reviewIndex%reviewWords().length];progress.words[word.es]={known:b.dataset.review==='known',reviews:(progress.words[word.es]?.reviews||0)+1,everRewarded:progress.words[word.es]?.everRewarded||false};if(b.dataset.review==='known'&&!progress.words[word.es].everRewarded){progress.words[word.es].everRewarded=true;addXP(2);}save();reviewIndex++;flipped=false;renderReview();}
  if(b.dataset.goal){progress.goal=Number(b.dataset.goal);save();renderProgress();toast('Daily goal updated.');}
  if(b.hasAttribute('data-record'))record();
  if(b.hasAttribute('data-assess'))assess();
  if(b.hasAttribute('data-export')){const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,progress},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='brisa-progress-'+dayKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
app.addEventListener('input',e=>{if(e.target.id==='grading-token')gradingToken=e.target.value;});
app.addEventListener('change',async e=>{
  if(e.target.id==='phrase'&&e.target.value){customPhrase=e.target.value;stopRecording();clearAudio();renderVoice();}
  if(e.target.id==='import'){
    const file=e.target.files[0];if(!file)return;if(file.size>100000)return toast('That backup is too large.');
    try{const data=JSON.parse(await file.text());if(data.version!==1||!data.progress||!Number.isFinite(data.progress.xp))throw Error();const restored=loadProgress(JSON.stringify(data.progress),null);if(!restored)throw Error();if(restored.lastLesson&&!lessons.some(l=>l.id===restored.lastLesson.id))restored.lastLesson=null;if(!confirm('Replace the progress on this device with this backup?'))return;progress=restored;save();renderProgress();toast('Your journey is restored.');}catch{toast('This is not a valid Brisa progress backup.');}
  }
});
window.addEventListener('pagehide',()=>{stopRecording();window.speechSynthesis?.cancel();});
render();
fetch('/api/health').then(r=>r.json()).then(data=>{assessmentEnabled=data.assessmentEnabled;if(page==='voice')renderVoice();}).catch(()=>{});
