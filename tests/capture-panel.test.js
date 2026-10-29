import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

// A small DOM fixture exercises the real capture handlers and in-flight save.
function panelFixture() {
  let doc;
  class Element {
    constructor(tag) {this.tag=tag;this.children=[];this.attributes={};this.events={};this.style={};this.textContent='';this.value='';}
    append(...children) {for(const child of children){child.parent=this;this.children.push(child);}}
    replaceChildren(...children) {this.children=[];this.append(...children);}
    setAttribute(name,value) {this.attributes[name]=value;}
    getAttribute(name) {return this.attributes[name]??null;}
    addEventListener(name,listener) {(this.events[name]??=[]).push(listener);}
    attachShadow() {const root=new Element('shadow');root.host=this;this.shadowRoot=root;return root;}
    querySelectorAll(selector) {
      const matches=element=>selector==='input:checked'?element.tag==='input'&&element.checked:selector==='[role=status]'?element.attributes.role==='status':element.tag===selector;
      return this.children.flatMap(child=>[...(matches(child)?[child]:[]),...child.querySelectorAll(selector)]);
    }
    querySelector(selector) {return this.querySelectorAll(selector)[0]??null;}
    focus() {doc.activeElement=this;}
    remove() {if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  }
  const originalFocus=new Element('button');
  doc={activeElement:originalFocus,documentElement:new Element('html'),createElement:tag=>new Element(tag),addEventListener(){},getElementById(id){return this.documentElement.children.find(child=>child.id===id)??null;}};
  const problem={url:'https://leetcode.com/problems/two-sum/',problemId:'two-sum',title:'Two Sum',difficulty:'easy'};
  let finishSave,started;
  const saveStarted=new Promise(resolve=>{started=resolve;});
  const runtime={async sendMessage(message){
    if(message.type==='GET_PENDING_CAPTURE')return {};
    if(message.type==='GET_PRACTICE_CONTEXT')return {units:[{slug:'hashing',categoryName:'Arrays & hashing',name:'Hash maps & sets'}]};
    if(message.type==='SAVE_EDITABLE_DRAFT')return {kept:true};
    if(message.type==='SAVE_CAPTURE'){started();return new Promise(resolve=>{finishSave=resolve;});}
    throw new Error('Unexpected message: '+message.type);
  }};
  const context=vm.createContext({URL,Date,crypto:webcrypto,DsaAdapters:[{getProblem:()=>problem,getDetails:()=>({...problem}),getTopics:()=>['Array']}],DsaLegacy:{account:async()=> 'fixture-account'},MutationObserver:class{observe(){}disconnect(){}}});
  vm.runInContext(readFileSync(new URL('../apps/extension/src/capture.js',import.meta.url),'utf8'),context);
  const page={location:{href:problem.url},addEventListener(){},setTimeout(){},clearTimeout(){}};
  const controller=context.DsaCapture.start(doc,page,runtime);
  return {doc,originalFocus,open:()=>controller.open(),saveStarted,finishSave:value=>finishSave(value)};
}

test('Escape keeps the recorder open while saving and closes it after a failed save',async()=>{
  const fixture=panelFixture();await fixture.open();
  const panel=fixture.doc.getElementById('recall-practice-prompt'),root=panel.shadowRoot,form=root.querySelector('form');
  const choices=form.querySelectorAll('input');
  choices.find(input=>input.value==='independent').checked=true;
  choices.find(input=>input.value==='Array').checked=true;
  const saving=form.events.submit[0]({isTrusted:true,preventDefault(){}});
  await fixture.saveStarted;
  const close=root.querySelectorAll('button').find(button=>button.attributes['aria-label']==='Close recording panel');
  assert.equal(close.disabled,true);
  let prevented=false;
  root.events.keydown[0]({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(fixture.doc.getElementById('recall-practice-prompt'),panel);
  assert.equal(root.querySelector('[role=status]').textContent,'Saving…');
  fixture.finishSave({saved:false,error:'API offline. Retry save.'});await saving;
  assert.equal(close.disabled,false);assert.equal(root.querySelector('[role=status]').textContent,'API offline. Retry save.');
  root.events.keydown[0]({key:'Escape',preventDefault(){}});
  assert.equal(fixture.doc.getElementById('recall-practice-prompt'),null);assert.equal(fixture.doc.activeElement,fixture.originalFocus);
});
