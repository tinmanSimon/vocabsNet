import { useState, useRef, useCallback } from 'react'
import { Flipper, Flipped } from 'react-flip-toolkit'
import './WordModal.css'          // re‑use existing styles

/* ─ utilities reused by both modals ─ */
const TAG_COLOURS=[
    "#d32f2f", "#c62828", "#b71c1c", "#ad1457", "#880e4f",
    "#6a1b9a", "#4a148c", "#4527a0", "#311b92", "#283593",
    "#1a237e", "#1565c0", "#0d47a1", "#1976d2", "#1e88e5",
    "#2196f3", "#1565c0", "#0277bd", "#01579b", "#00838f",
    "#006064", "#00897b", "#004d40", "#00695c", "#2e7d32",
    "#1b5e20", "#33691e", "#558b2f", "#689f38", "#7cb342",
    "#827717", "#9e9d24", "#afb42b", "#f9a825", "#f57f17",
    "#ef6c00", "#e65100", "#d84315", "#bf360c", "#6d4c41",
    "#4e342e", "#3e2723", "#5d4037", "#263238", "#37474f",
    "#455a64", "#546e7a", "#607d8b", "#78909c", "#90a4ae",
    "#8e24aa", "#7b1fa2", "#6a1b9a", "#5e35b1", "#512da8",
    "#4527a0", "#3949ab", "#303f9f", "#283593", "#1e88e5",
    "#1565c0", "#0d47a1", "#00838f", "#0097a7", "#00acc1",
    "#00bcd4", "#00897b", "#00796b", "#00695c", "#004d40",
    "#43a047", "#388e3c", "#2e7d32", "#1b5e20", "#33691e",
    "#558b2f", "#689f38", "#827717", "#9e9d24", "#afb42b",
    "#f9a825", "#f57f17", "#ef6c00", "#e65100", "#d84315",
    "#bf360c", "#a1887f", "#795548", "#6d4c41", "#5d4037",
    "#4e342e", "#3e2723", "#263238", "#212121", "#37474f",
    "#455a64", "#546e7a", "#607d8b", "#90a4ae", "#78909c"
]
const colourFor=t=>{let h=0;for(const c of t)h=c.charCodeAt(0)+((h<<5)-h)
  return TAG_COLOURS[Math.abs(h)%TAG_COLOURS.length]}

export const TagChip=({tag,idx,onRemove,onDragStart,onDragOver,onDrop,clickable})=>(
  <span className="wm-tag-chip"
        style={{background:colourFor(tag),cursor:clickable?'pointer':'grab'}}
        draggable={!clickable}
        onClick={()=>clickable?.(tag)}
        onDragStart={e=>onDragStart?.(e,idx)}
        onDragOver={e=>onDragOver?.(e,idx)}
        onDrop={e=>onDrop?.(e,idx)}>
    {tag}{!clickable&&<span className="remove" onClick={()=>onRemove(idx)}>✕</span>}
  </span>)

export default function TagInput({
  value,          /* state array  */
  onChange,       /* setter       */
  existingTags,   /* suggestions  */
  placeholder="add tag…",
}){

  const [tagIn,setTagIn]=useState('')
  const [hover,setHover]=useState(-1)
  const dragFrom=useRef(null)

  const addTag=useCallback(t=>{
    t=t.trim();if(!t||value.includes(t))return
    onChange([...value,t]);setTagIn('');setHover(-1)
  },[value,onChange])

  const filtered=existingTags
      .filter(t=>t.toLowerCase().includes(tagIn.toLowerCase()))
      .filter(t=>!value.includes(t))
      .slice(0,8)

  const tagKey=e=>{
    if(e.key==='ArrowDown'){e.preventDefault();setHover(i=>Math.min(i+1,filtered.length-1))}
    else if(e.key==='ArrowUp'){e.preventDefault();setHover(i=>Math.max(i-1,0))}
    else if(e.key==='Enter'){e.preventDefault();hover>-1?addTag(filtered[hover]):addTag(tagIn)}
    else if(e.key==='Backspace'&&tagIn===''&&value.length){onChange(value.slice(0,-1))}
    else hover!==-1&&setHover(-1)
  }

  const rm=i=>onChange(value.filter((_,j)=>j!==i))
  const dragS=(e,i)=>dragFrom.current=i
  const dragO=(e,idx)=>{e.preventDefault();const from=dragFrom.current;if(from===idx)return
    const next=[...value];const[moved]=next.splice(from,1);next.splice(idx,0,moved)
    onChange(next);dragFrom.current=idx}
  const dragE=()=>dragFrom.current=null

  return(
    <Flipper flipKey={value.join(',')}>
      <div className="wm-tag-area">
        {value.map((t,i)=>
          <Flipped key={t} flipId={t}>
            <div><TagChip tag={t} idx={i} onRemove={rm}
                          onDragStart={dragS} onDragOver={dragO} onDrop={dragE}/></div>
          </Flipped>)}
        <input className="wm-tag-input"
               value={tagIn}
               onChange={e=>{setTagIn(e.target.value);setHover(-1)}}
               onKeyDown={tagKey}
               placeholder={placeholder}/>
        {/* suggestions */}
        {filtered.length>0&&(
          <div className="wm-suggest-list">
            {filtered.map((s,i)=>
              <div key={s} className={'wm-suggest-item'+(i===hover?' hover':'')}
                   onMouseEnter={()=>setHover(i)}
                   onMouseLeave={()=>setHover(-1)}
                   onMouseDown={e=>{e.preventDefault();addTag(s)}}>{s}</div>)}
          </div>)}
      </div>
    </Flipper>)
}
