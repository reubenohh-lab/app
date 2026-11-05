export const freshProgress = () => ({xp:0,goal:30,days:{},completed:{},words:{},lastLesson:null});
export function dayKey(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function award(progress, amount, date=new Date()) {const next=structuredClone(progress);const day=dayKey(date);next.xp+=amount;next.days[day]=(next.days[day]||0)+amount;return next;}
export function streak(progress,date=new Date()) {const cursor=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);if(!progress.days[dayKey(cursor)]) cursor.setDate(cursor.getDate()-1);let count=0;while(progress.days[dayKey(cursor)]) {count++;cursor.setDate(cursor.getDate()-1);}return count;}
export function loadProgress(raw, fallback=freshProgress()) {
  try {
    const p=JSON.parse(raw);
    if(!p || !Number.isSafeInteger(p.xp)||p.xp<0 || ![15,30,50].includes(p.goal) || !p.days || !p.completed || !p.words || [p.days,p.completed,p.words].some(v=>typeof v!=='object'||Array.isArray(v))) return fallback;
    if(Object.entries(p.days).some(([k,v])=>!/^\d{4}-\d{2}-\d{2}$/.test(k)||!Number.isSafeInteger(v)||v<0))return fallback;
    const last=p.lastLesson;
    const lastLesson=last&&typeof last.id==='string'&&/^[a-z]{1,30}$/.test(last.id)&&Number.isInteger(last.index)&&last.index>=0&&last.index<=4&&Number.isInteger(last.correct)&&last.correct>=0&&last.correct<=4?{id:last.id,index:last.index,correct:last.correct}:null;
    return {xp:p.xp,goal:p.goal,days:p.days,completed:p.completed,words:p.words,lastLesson};
  } catch{return fallback;}
}
