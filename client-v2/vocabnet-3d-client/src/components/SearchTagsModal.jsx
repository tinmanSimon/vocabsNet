import { useState, useEffect, useRef } from 'react'
import TagInput,{ TagChip } from './TagInput'
import './WordModal.css'
import './DataModal.css'
import ModalScaffold from './ModalScaffold'

export default function SearchTagsModal({
  open, existingTags, results,              // ← results is array of word‑objects
  onSearch, onWordClick, onClose,
}){
    const [tags,setTags]=useState([])
    useEffect(()=>{if(open){setTags([])}},[open])

    return(
        <ModalScaffold
            title="Search Tags"
            className="wm-box"
            onClose={onClose}
            onSubmit={() => onSearch(tags)}
            submitButtonText = "Search Tags"
            visible={open}
            minWidth={360}
            minHeight={330}
            initialPos={{ x: 200, y: 80 }}
            initialSize={{ width: 360, height: 330 }}
            >
            <div className="wm-content" style={{gap:12}}>
                <TagInput value={tags} onChange={setTags} existingTags={existingTags}/>
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
            </div>
        </ModalScaffold>
    )
}
