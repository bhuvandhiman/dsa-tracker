import {recallRuntime} from './runtime-config.js';

// A confirmed write prompts open Recall tabs to read once. Delivery is best
// effort: a closed tab or missing content script must not turn a save into failure.
export async function notifyPracticeChanged(chromeApi,owner,changeId=crypto.randomUUID()){
  try{
    const tabs=await chromeApi.tabs.query({url:recallRuntime.websiteOrigin+'/*'});
    await Promise.allSettled(tabs.filter(tab=>{
      try{return Number.isInteger(tab.id)&&new URL(tab.url).origin===recallRuntime.websiteOrigin;}catch{return false;}
    }).map(tab=>chromeApi.tabs.sendMessage(tab.id,{type:'RECALL_PRACTICE_CHANGED',owner,changeId},{frameId:0})));
  }catch{/* The next dashboard visit will read the saved practice. */}
}
