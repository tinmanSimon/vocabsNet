import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import TagInput,{ TagChip } from './TagInput'
import './WordModal.css'
import './DataModal.css'
import ModalScaffold from './ModalScaffold'

const SearchTagsModal = forwardRef(function SearchTagsModal(props, ref) {
  const {
    open, existingTags, results,           
    onSearch, onWordClick, onClose, onCollapse, 
    zIndexCount, setZIndexCount
  } = props

    const [tags,setTags]=useState([])
    const searchTagsRef = useRef()
    useEffect(()=>{if(open){setTags([])}},[open])

    useImperativeHandle(ref, () => ({
        expand: (params) => searchTagsRef.current?.expand?.(params),
        isCollapsed: () => searchTagsRef.current?.isCollapsed?.(),
        setTargetPosition: (pos) => {
            searchTagsRef.current?.setTargetPosition(pos)
        }
    }))

    return(
        <ModalScaffold
            ref={searchTagsRef}
            title="Search Tags"
            className="wm-box"
            onClose={onClose}
            onSubmit={() => onSearch(tags)}
            submitButtonText = "Search Tags"
            collapseOnClose={true}
            initialism = { <img
                src="src/assets/tags.png"
                alt="icon"
                className="header-icon-img"
            />}
            visible={open}
            minWidth={400}
            minHeight={330}
            initialPos={{ x: 200, y: 80 }}
            initialSize={{ width: 400, height: 330 }}
            onCollapse={onCollapse}
            zIndexCount={zIndexCount}
            setZIndexCount={setZIndexCount}
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
})

export default SearchTagsModal
