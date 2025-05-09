import { useState, useEffect, useRef } from 'react'
import TagInput,{ TagChip } from './TagInput'
import './WordModal.css'
import './DataModal.css'

export default function SearchTagsModal({
  open, existingTags, results,              // ← results is array of word‑objects
  onSearch, onWordClick, onClose,
}){

  /* position + resize copied from SearchModal */
    const MIN_W=330,MIN_H=330
    const [pos,setPos]=useState({x:180,y:120})
    const [size,setSize]=useState({width:MIN_W,height:MIN_H})
    const dragRef=useRef(null)
    /* …identical drag/resize handlers as SearchModal… */

    const [tags,setTags]=useState([])
    useEffect(()=>{if(open){setTags([])}},[open])


    const startDrag = (e) => {
        dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
        window.addEventListener('mousemove', moveDrag)
        window.addEventListener('mouseup', endDrag)
    }
    const moveDrag = (e) => {
        const { sx, sy, ox, oy } = dragRef.current
        setPos({ x: ox + e.clientX - sx, y: oy + e.clientY - sy })
    }
    const endDrag = () => {
        window.removeEventListener('mousemove', moveDrag)
        window.removeEventListener('mouseup', endDrag)
    }

    const startResize = (e, dir) => {
        e.preventDefault(); e.stopPropagation()
        const { clientX: sx, clientY: sy } = e
        const { width: sw, height: sh }   = size
        const { x: sl, y: st }            = pos
      
        const onMove = (e) => {
          let dx = e.clientX - sx, dy = e.clientY - sy
          let w = sw, h = sh, nx = sl, ny = st
      
          if (dir.includes('e')) w = Math.max(MIN_W, sw + dx)
          if (dir.includes('s')) h = Math.max(MIN_H, sh + dy)
          if (dir.includes('w')) {
            let desiredW = sw - dx
            if (desiredW < MIN_W) { desiredW = MIN_W; dx = sw - MIN_W }
            w = desiredW
            nx = sl + dx
          }
          if (dir.includes('n')) {
            let desiredH = sh - dy
            if (desiredH < MIN_H) { desiredH = MIN_H; dy = sh - MIN_H }
            h = desiredH
            ny = st + dy
          }
      
          setSize({ width: w, height: h })
          setPos({ x: nx, y: ny })
        }
      
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
      
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }
        
    if (!open) return null

    return(
        <div className="wm-search-box"
            style={{left:pos.x,top:pos.y,width:size.width,height:size.height}}>
            <div className="wm-header" onMouseDown={startDrag}>Search Tags</div>

            <div className="wm-content" style={{gap:12}}>
                <TagInput value={tags} onChange={setTags} existingTags={existingTags}/>

                {/* WORD RESULTS (Always show box) */}
                <div style={{
                    flex: 1,
                    width: '80%',
                    margin: '0 auto',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    padding: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    overflowY: 'auto',
                    minHeight: 80,
                }}>
                    {results?.map(w =>
                    <TagChip key={w.name} tag={w.name} clickable={() => onWordClick(w.name)} />
                    )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="adm-actions">
                    <button className="btn-submit" onClick={() => onSearch(tags)}>Search Tags</button>
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                </div>
            </div>

        {/* resize handles identical to SearchModal */}
        {['n','e','s','w','ne','se','sw','nw'].map(dir => (
            <div
                key={dir}
                className={`wm-resize-handle wm-${dir}`}
                onMouseDown={(e) => startResize(e, dir)}
            />
        ))}
        </div>
    )
}
