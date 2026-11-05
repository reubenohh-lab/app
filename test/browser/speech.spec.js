import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    let inTap=false;
    document.addEventListener('click',()=>{inTap=true;setTimeout(()=>{inTap=false;},0);},true);
    window.speechCalls=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speaking:false,pending:false,paused:true,getVoices:()=>[],addEventListener:()=>{},cancel(){this.speaking=false;},resume(){this.paused=false;},
      speak(utterance){window.speechCalls.push({text:utterance.text,lang:utterance.lang,rate:utterance.rate,inTap,paused:this.paused});if(!inTap){utterance.onerror?.({error:'not-allowed'});return;}this.speaking=true;utterance.onstart?.({});}
    }});
  });
});
test('listening buttons work on first tap when Safari has not populated its voice list',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Let’s start talking'}).click();await page.getByRole('button',{name:'Hear it in Spanish'}).click();
  await expect.poll(()=>page.evaluate(()=>window.speechCalls.length)).toBe(1);
  expect(await page.evaluate(()=>window.speechCalls[0])).toMatchObject({text:'Hola, me llamo Alex.',lang:'es-MX',inTap:true,paused:false});
  await expect(page.getByRole('button',{name:'Hear it in Spanish'})).toHaveClass(/speaking/);
  await page.getByRole('button',{name:'← Back to journey'}).click();await page.getByRole('button',{name:'▤ Word collection'}).click();await page.getByRole('button',{name:'Hear pronunciation'}).click();
  expect(await page.evaluate(()=>window.speechCalls.at(-1))).toMatchObject({text:'hola',inTap:true});
  await page.getByRole('button',{name:'◌ Conversations'}).click();await page.getByRole('button',{name:'▶ Listen',exact:true}).click();expect(await page.evaluate(()=>window.speechCalls.at(-1))).toMatchObject({text:'¡Hola! ¿Cómo te llamas?',inTap:true});
  await page.getByRole('button',{name:'≋ Voice studio'}).click();await page.getByLabel('Slower example').check();await page.getByRole('button',{name:'Play example'}).click();const slow=await page.evaluate(()=>window.speechCalls.at(-1));expect(slow.inTap).toBe(true);expect(slow.rate).toBeCloseTo(0.65);
});
