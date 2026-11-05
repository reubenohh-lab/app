import {test,expect} from '@playwright/test';
test('the exact listening quiz button plays a real MP3 without browser speech synthesis',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:undefined});});
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'Let’s start talking'}).click();await page.getByRole('button').filter({hasText:'Hello, my name is Alex.'}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await page.getByRole('button',{name:'Play Spanish phrase'}).click();
  const audio=page.locator('#example-audio');await expect(audio).toBeVisible();
  await expect.poll(()=>audio.evaluate(a=>!a.paused&&a.currentTime>0&&Number.isFinite(a.duration))).toBe(true);
  expect(await audio.evaluate(a=>a.src)).toMatch(/\/audio\/[a-f0-9]+\.mp3$/);
  await expect(page.locator('#example-caption')).not.toContainText('Mucho gusto');
  // Replay the same actual file, then exercise vocabulary and conversation buttons.
  await page.getByRole('button',{name:'Play Spanish phrase'}).click();await expect.poll(()=>audio.evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
  await page.getByRole('button',{name:'← Back to journey'}).click();await expect(page.locator('#example-player')).toBeHidden();
  await page.getByRole('button',{name:'▤ Word collection'}).click();await page.getByRole('button',{name:'Hear pronunciation'}).click();await expect.poll(()=>audio.evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
  await page.getByRole('button',{name:'◌ Conversations'}).click();await page.getByRole('button',{name:'▶ Listen',exact:true}).click();await expect.poll(()=>audio.evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
  await page.getByRole('button',{name:'≋ Voice studio'}).click();await page.getByLabel('Slower example').check();await page.getByRole('button',{name:'Play example'}).click();await expect.poll(()=>audio.evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);expect(await audio.evaluate(a=>a.playbackRate)).toBe(0.75);
  await page.getByRole('button',{name:'Close example player'}).click();await expect(page.locator('#example-player')).toBeHidden();expect(await audio.evaluate(a=>a.paused)).toBe(true);
});
test('network failures leave native playback controls available with an error message',async({page})=>{
  await page.route('**/audio/*.mp3',route=>route.abort());await page.goto('/');await page.getByRole('button',{name:'▤ Word collection'}).click();await page.getByRole('button',{name:'Hear pronunciation'}).click();
  await expect(page.locator('#example-audio')).toBeVisible();await expect(page.locator('#toast')).toContainText('Could not load the audio');
});
