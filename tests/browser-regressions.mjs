// Run with a connected Codex browser tab and its documented viewport capability.
// Read-only with respect to practice data: no recording, removal or restore is submitted.
import assert from 'node:assert/strict';
/* global document, window */
export async function verifyDashboard(tab,viewport,url){
  await tab.goto(url);
  await tab.playwright.getByRole('button',{name:'Open Arrays & hashing',exact:true}).waitFor({state:'visible'});
  await tab.playwright.getByRole('button',{name:'Retention',exact:true}).click();
  assert.equal(await tab.playwright.getByRole('button',{name:'Retention',exact:true}).getAttribute('aria-pressed'),'true');
  await tab.playwright.getByRole('textbox',{name:'Search patterns',exact:true}).fill('no-pattern-should-match-this');
  await tab.playwright.getByText('No matching patterns',{exact:true}).waitFor({state:'visible'});
  await tab.playwright.getByRole('textbox',{name:'Search patterns',exact:true}).fill('arrays');
  await tab.playwright.getByRole('button',{name:'Open Arrays & hashing',exact:true}).click();
  await tab.playwright.getByRole('heading',{name:'Arrays & hashing',exact:true}).waitFor({state:'visible'});
  assert.ok((await tab.url()).includes('pattern=arrays-hashing'));
  await tab.reload();
  await tab.playwright.getByRole('heading',{name:'Arrays & hashing',exact:true}).waitFor({state:'visible'});
  for(const width of [320,375,768,1024,1440]){
    await viewport.set({width,height:1000});
    const dimensions=await tab.playwright.evaluate(()=>({innerWidth:window.innerWidth,width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(Math.abs(dimensions.innerWidth-width)<=1,'The tested tab must be the active preview tab for viewport changes (one-pixel device rounding allowed).');
    assert.ok(dimensions.scroll<=dimensions.width,`Detail overflow at ${width}: ${JSON.stringify(dimensions)}`);
  }
  await tab.playwright.getByRole('textbox',{name:'Search patterns',exact:true}).fill('graphs');
  await tab.playwright.getByRole('button',{name:'Open Graphs',exact:true}).waitFor({state:'visible'});
  await tab.playwright.getByRole('textbox',{name:'Search patterns',exact:true}).fill('');
  await tab.playwright.getByRole('button',{name:'All patterns',exact:true}).click();
  await tab.playwright.getByRole('button',{name:'Open Arrays & hashing',exact:true}).waitFor({state:'visible'});
  await tab.back();
  await tab.playwright.getByRole('heading',{name:'Arrays & hashing',exact:true}).waitFor({state:'visible'});
  await tab.playwright.getByRole('button',{name:'Settings',exact:true}).click();
  await tab.playwright.getByRole('heading',{name:'Workspace settings',exact:true}).waitFor({state:'visible'});
  await tab.playwright.getByRole('button',{name:'Close',exact:true}).click();
  await viewport.reset();
  return {passed:['perspective state','search empty state','featured search','detail URL and reload','detail search','browser back','workspace settings','320/375/768/1024/1440 responsive detail']};
}
