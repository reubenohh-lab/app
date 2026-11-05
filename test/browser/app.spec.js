import {test,expect} from '@playwright/test';
import {lessons} from '../../public/curriculum.js';
test('complete a lesson, reload saved XP, skip ahead, and review vocabulary',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.getByRole('button',{name:'Let’s start talking'}).click();
  for(const item of lessons[0].items){await page.getByRole('button').filter({hasText:item.en}).click();await expect(page.getByText('¡Muy bien! You’ve got it.')).toBeVisible();await page.getByRole('button',{name:'Continue →',exact:true}).click();}
  await page.getByRole('button',{name:'Finish lesson ✦'}).click();await expect(page.getByText('+40',{exact:true})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'↗ Your progress'}).click();await expect(page.getByText('40',{exact:true})).toHaveCount(2);
  await page.getByRole('button',{name:'▤ Word collection'}).click();await page.getByRole('button',{name:'Flip vocabulary card'}).click();await page.getByRole('button',{name:'Got it ✓'}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('brisa-progress')).xp)).toBe(42);
  await page.getByRole('button',{name:'◈ Learn'}).click();await page.getByRole('button').filter({hasText:'When plans change'}).click();await expect(page.getByRole('heading',{name:'What does this mean?'})).toBeVisible();
  await expect(page.getByText('¿Puedes hablar más despacio?',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('lesson resumes after reload and wrong answers reveal the correction',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Let’s start talking'}).click();await page.getByRole('button').filter({hasText:'Where is Alex?'}).click();await expect(page.getByText('A little practice makes it stick.')).toBeVisible();await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Pick up where you left off'}).click();await expect(page.getByRole('heading',{name:'Listen. What did you hear?'})).toBeVisible();
});
test('guided conversations open voice practice; recording produces playable WAV',async({page,context})=>{
  await context.grantPermissions(['microphone']);await page.goto('/');await page.getByRole('button',{name:'◌ Conversations'}).click();await page.getByRole('button',{name:'Reveal a reply →'}).click();await page.getByRole('button',{name:'Record this reply'}).click();await expect(page.getByRole('heading',{name:'Hola, me llamo Alex. ¿Y tú?'})).toBeVisible();await page.getByRole('button',{name:'● Start recording'}).click();await expect(page.getByRole('button',{name:'■ Stop recording'})).toBeVisible();await page.waitForTimeout(1400);await page.getByRole('button',{name:'■ Stop recording'}).click();await expect(page.locator('audio')).toBeVisible({timeout:15000});await expect(page.getByRole('button',{name:'Get pronunciation feedback'})).toBeDisabled();
  const metadata=await page.locator('audio').evaluate(async el=>{await el.play();return {src:el.src,duration:el.duration};});expect(metadata.src).toContain('blob:');expect(metadata.duration).toBeGreaterThan(0);
});
test('optional service feedback shows actual returned word and sound scores (mock API)',async({page,context})=>{
  await context.grantPermissions(['microphone']);
  await page.route('**/api/health',route=>route.fulfill({json:{ok:true,assessmentEnabled:true}}));
  let sent=false;
  await page.route('**/api/assess?*',async route=>{
    expect(route.request().headers().authorization).toBe('Bearer private-test-passphrase');
    expect(route.request().postDataBuffer().subarray(0,4).toString()).toBe('RIFF');sent=true;
    await route.fulfill({json:{text:'Hola',PronScore:72,AccuracyScore:70,FluencyScore:80,CompletenessScore:100,words:[{Word:'Hola',PronunciationAssessment:{AccuracyScore:65,ErrorType:'Mispronunciation'},Phonemes:[{Phoneme:'o',PronunciationAssessment:{AccuracyScore:60}}]}]}});
  });
  await page.goto('/');await page.getByRole('button',{name:'≋ Voice studio'}).click();await expect(page.getByText('AZURE CONFIGURED',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'● Start recording'}).click();await page.waitForTimeout(1000);await page.getByRole('button',{name:'■ Stop recording'}).click();await expect(page.locator('audio')).toBeVisible();
  await page.getByLabel('PRIVATE GRADING PASSPHRASE').fill('private-test-passphrase');page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Get pronunciation feedback'}).click();
  await expect(page.getByText('72',{exact:true})).toBeVisible();await expect(page.getByText(/Focus on \/o\//)).toBeVisible();expect(sent).toBe(true);
});
for(const width of [360,390,768,1440])test(`navigation and layout fit ${width}px viewport`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/');
  for(const name of ['◈ Learn','◌ Conversations','▤ Word collection','≋ Voice studio','↗ Your progress']){await page.getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  if(width===390){await page.getByRole('button',{name:'◈ Learn'}).click();await page.screenshot({path:'/tmp/brisa-mobile.png',fullPage:true});}
  if(width===1440){await page.getByRole('button',{name:'◈ Learn'}).click();await page.screenshot({path:'/tmp/brisa-desktop.png',fullPage:true});}
});
