import { useEffect, useId, useRef, useState } from 'react';
import { request } from './api.js';

function PatternEditor({problem,onSaved,onCancel}) {
  const dialog = useRef(null);
  const firstInput = useRef(null);
  const titleId = useId();
  useEffect(()=>{
    const element = dialog.current;
    element.showModal();
    firstInput.current?.focus();
    return ()=>element.close();
  },[]);
  const candidates = problem.candidates || [];
  const current = problem.placement?.unit;
  const [choice,setChoice] = useState(candidates.some(item=>item.unit === current) ? current : current && problem.placement.source === 'manual' ? '__manual__' : '');
  const [manualUnit,setManualUnit] = useState(current || '');
  const [catalog,setCatalog] = useState(null);
  const [revision,setRevision] = useState(0);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  useEffect(()=>{
    if (choice !== '__manual__') return;
    const controller = new AbortController();
    request('/patterns/placements',{signal:controller.signal}).then(data=>{
      if (!controller.signal.aborted) {setCatalog(data.units.map(unit=>({slug:unit.slug,name:`${unit.categoryName} / ${unit.name}`})));setError('');}
    }).catch(failure=>{if (!controller.signal.aborted) setError(failure.message);});
    return ()=>controller.abort();
  },[choice,revision]);
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');
    try {await request(`/problems/${problem.id}/placement`,{method:'PUT',body:JSON.stringify({unit:choice === '__manual__' ? manualUnit : choice,manual:choice === '__manual__'})});onSaved();}
    catch(failure) {setError(failure.message);}
    finally {setBusy(false);}
  }
  return <dialog className="pattern-dialog" ref={dialog} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}><form className="pattern-editor" onSubmit={save}><p className="eyebrow">Organize this problem</p><h2 id={titleId}>Edit pattern</h2><p className="dialog-problem-name">{problem.title}</p><p className="data-note">Moves goal coverage; recorded practice stays with its original approach.</p><label>Primary pattern<select ref={firstInput} required disabled={busy} value={choice} onChange={event=>{setChoice(event.target.value);setError('');}}><option value="" disabled>Choose a pattern</option>{candidates.map(item=><option key={item.unit} value={item.unit}>{item.categoryName} / {item.name} · {item.source === 'curated' ? 'Curated' : 'LeetCode topics'}</option>)}<option value="__manual__">Manually add to a pattern…</option></select></label>{choice === '__manual__' && <>{catalog ? <label>Choose a pattern manually<select required disabled={busy} value={manualUnit} onChange={event=>setManualUnit(event.target.value)}><option value="">Choose a pattern</option>{catalog.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label> : !error && <p role="status">Loading patterns…</p>}</>}{error && <div role="alert"><p>{error}</p>{choice === '__manual__' && !catalog && <button type="button" className="secondary-button" onClick={()=>setRevision(value=>value+1)}>Try again</button>}</div>}<div className="row-actions"><button className="primary-button" disabled={busy || !choice || (choice === '__manual__' && (!catalog || !catalog.some(item=>item.slug === manualUnit)))}>{busy ? 'Saving…' : 'Save pattern'}</button><button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Cancel</button></div></form></dialog>;
}

export default function PatternMenu({problem,onSaved}) {
  const [menu,setMenu] = useState(false);
  const [editing,setEditing] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menuItem = useRef(null);
  useEffect(()=>{
    if (!menu) return;
    menuItem.current?.focus();
    function outside(event) {if (!root.current?.contains(event.target)) setMenu(false);}
    document.addEventListener('pointerdown',outside);
    return ()=>document.removeEventListener('pointerdown',outside);
  },[menu]);
  function close() {
    root.current?.querySelector('dialog')?.close();
    setMenu(false);setEditing(false);
    trigger.current?.focus();
  }
  return <div className="pattern-menu" ref={root} onKeyDown={event=>{if(event.key === 'Escape' && menu) {event.stopPropagation();close();}}}>
    <button ref={trigger} className="problem-more" aria-label={`Options for ${problem.title}`} aria-expanded={menu} onClick={()=>{if(editing)close();else setMenu(value=>!value);}}>⋯</button>
    {menu && <div className="pattern-menu-options"><button className="text-button" ref={menuItem} onClick={()=>{setMenu(false);setEditing(true);}}>Edit pattern</button></div>}
    {editing && <PatternEditor problem={problem} onCancel={close} onSaved={()=>{close();onSaved();}} />}
  </div>;
}
