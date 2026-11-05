import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const root = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.mp3':'audio/mpeg' };
const enabled = () => Boolean(process.env.AZURE_SPEECH_KEY && /^[a-z0-9-]+$/.test(process.env.AZURE_SPEECH_REGION || '') && process.env.ASSESSMENT_ACCESS_TOKEN);
const limits = new Map();
const json = (res,status,data) => {res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
export const server = http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','microphone=(self), camera=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  try {
    const url = new URL(req.url, 'http://localhost');
    if(url.pathname === '/api/health') return json(res,200,{ok:true,assessmentEnabled:enabled()});
    if(url.pathname === '/api/assess' && req.method === 'POST') {
      if(!enabled()) return json(res,503,{error:'Pronunciation grading is not connected. Recording and replay still work.'});
      const supplied = Buffer.from((req.headers.authorization || '').replace(/^Bearer /,''));
      const expected = Buffer.from(process.env.ASSESSMENT_ACCESS_TOKEN);
      if(supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) return json(res,401,{error:'Enter your private grading passphrase in Voice settings.'});
      const now = Date.now();
      for(const [ip,entry] of limits) if(now-entry.time>60000) limits.delete(ip);
      const ip=req.socket.remoteAddress;
      const entry=limits.get(ip)||{time:now,count:0};
      if(++entry.count>10) return json(res,429,{error:'Please wait a minute before another assessment.'});
      limits.set(ip,entry);
      const reference=url.searchParams.get('text');
      if(!reference || reference.length>300) return json(res,400,{error:'A short reference phrase is required.'});
      if(!(req.headers['content-type']||'').startsWith('audio/wav')) return json(res,415,{error:'Please send WAV audio.'});
      const chunks=[];let size=0;
      for await(const chunk of req) {size+=chunk.length;if(size>1100000) return json(res,413,{error:'Recording is too long. Limit it to 30 seconds.'});chunks.push(chunk);}
      const audio=Buffer.concat(chunks);
      if(audio.length<44 || audio.toString('ascii',0,4)!=='RIFF' || audio.toString('ascii',8,12)!=='WAVE') return json(res,400,{error:'Invalid WAV recording.'});
      const assessment=Buffer.from(JSON.stringify({ReferenceText:reference,GradingSystem:'HundredMark',Granularity:'Phoneme',Dimension:'Comprehensive',EnableMiscue:true})).toString('base64');
      const upstream=await fetch(`https://${process.env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=es-MX&format=detailed`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':process.env.AZURE_SPEECH_KEY,'Pronunciation-Assessment':assessment,'Content-Type':'audio/wav; codecs=audio/pcm; samplerate=16000'},body:audio,signal:AbortSignal.timeout(25000)});
      if(!upstream.ok) return json(res,502,{error:`Speech service returned ${upstream.status}. Check the service region, quota, and subscription.`});
      const result=await upstream.json();
      const best=result.NBest?.[0];
      if(!best?.PronunciationAssessment) return json(res,422,{error:'No clear speech was assessed. Try again in a quiet place.'});
      return json(res,200,{text:best.Display,...best.PronunciationAssessment,words:best.Words});
    }
    if(req.method!=='GET' && req.method!=='HEAD') return json(res,405,{error:'Method not allowed'});
    const file=path.resolve(root, '.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)) return json(res,403,{error:'Forbidden'});
    const body=await readFile(file);
    const isAudio=path.extname(file)==='.mp3';
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':isAudio?'public, max-age=31536000, immutable':'no-cache','Content-Length':body.length};
    if(isAudio) {
      headers['Accept-Ranges']='bytes';
      if(req.headers.range) {
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start=range?.[1]?Number(range[1]):0;
        let end=range?.[2]?Number(range[2]):body.length-1;
        if(range&&!range[1]&&range[2]){start=Math.max(0,body.length-Number(range[2]));end=body.length-1;}
        if(!range||(!range[1]&&!range[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=body.length||end<start) {
          res.writeHead(416,{'Content-Range':`bytes */${body.length}`});return res.end();
        }
        end=Math.min(end,body.length-1);
        res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1});
        return res.end(req.method==='HEAD'?undefined:body.subarray(start,end+1));
      }
    }
    res.writeHead(200,headers);
    res.end(req.method==='HEAD'?undefined:body);
  } catch(error) {json(res,error.code==='ENOENT'?404:500,{error:error.code==='ENOENT'?'Not found':'Request failed. Please try again.'});}
});
if(process.argv[1]===fileURLToPath(import.meta.url)) server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Brisa listening on port '+(process.env.PORT||3000)));
