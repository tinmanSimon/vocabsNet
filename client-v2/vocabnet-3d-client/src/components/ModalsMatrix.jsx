// src/components/ModalsMatrix.jsx
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * A draggable 3 × 3 matrix (each cell 60 × 60 px) that exposes
 * its current {x, y} position in real time.
 *
 * Props
 * ─────
 * onPositionChange?: (pos) => void   // optional live-update callback
 */
const ModalsMatrix = forwardRef(({ onPositionChange }, ref) => {
  const [pos, setPos] = useState({ x: 22, y: 22 });
  const posRef = useRef(pos)
  const dragInfo = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const observed = useRef([]);
  const [visible, setVisible] = useState(false);

  const enableModalMove = () => {
    if (observed.current.length === 1) {
      observed.current[0].current?.enableModalMove?.(false)
    } else if (observed.current.length > 1) {
      const centres = getCellCenters();
      observed.current[0].current?.enableModalMove?.(true)
      observed.current[0].current?.setTargetPosition?.(centres[0]);
    }
  }

  // expose current position through a ref, e.g. matrixRef.current.getPos()
    useImperativeHandle(ref, () => ({
        getPos: () => pos,
        
        /** register an external modal (forwardRef) for observation */
        observeModal(modalRef) {
            if (!modalRef?.current) return;
            if (!observed.current.find(o => o === modalRef)) 
                observed.current.push(modalRef);
            if (observed.current.length >= 2) {
              setVisible(true);
              enableModalMove()
            }
            const index = observed.current.indexOf(modalRef);
            const centres = getCellCenters();
            modalRef.current.setTargetPosition?.(centres[index]);
        },

        unObserveModal(modalRef) {
            if (!modalRef?.current) return;
            const index = observed.current.indexOf(modalRef);
            if (index !== -1) {
              observed.current.splice(index, 1);
              if (observed.current.length < 2) {
                setVisible(false);
                enableModalMove()
              }

              // Move the modals to fill the gap
              const centres = getCellCenters();
              observed.current.forEach((ref, idx) => {
                  const api = ref.current;
                  if (api?.isCollapsed?.()) {
                      api.setTargetPosition?.(centres[idx]);
                  }
              });
            }
            
        }
    }), [pos]);

  /* ——— internal handlers ——— */
  const handleMouseDown = e => {
    dragInfo.current = {
      dragging: true,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = e => {
    if (!dragInfo.current.dragging) return;
    const newPos = {
      x: e.clientX - dragInfo.current.offsetX,
      y: e.clientY - dragInfo.current.offsetY
    };
    setPos(newPos);
    posRef.current = newPos
    onPositionChange?.(newPos);
  };

  const handleMouseUp = () => {
    dragInfo.current.dragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    const centres = getCellCenters();
    observed.current.forEach((ref, idx) => {
        const api = ref.current;
        if (api?.isCollapsed?.()) {
            api.setTargetPosition?.(centres[idx]);
        }
    });
  };

  function getCellCenters() {
    const cellSize = 60;
    const centers = [];
  
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        centers.push({
          x: posRef.current.x + col * cellSize + cellSize / 2 - 20,
          y: posRef.current.y + row * cellSize + cellSize / 2 - 20
        });
      }
    }
  
    return centers;
  }

  /* ——— render ——— */
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 180,
        height: 180,
        userSelect: 'none',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      {/* Grid lines only */}
      <svg
        width={180}
        height={180}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none', // 🔒 disable interaction on whole SVG
        }}
      >
        {/* Vertical grid lines */}
        {[1, 2].map(i => (
          <line
            key={`v${i}`}
            x1={60 * i}
            y1={0}
            x2={60 * i}
            y2={180}
            stroke="#888"
            strokeWidth={10}
            style={{
              pointerEvents: 'stroke', // ✅ only interact with the line stroke
              cursor: visible ? 'move' : 'auto',
              opacity: visible ? 1 : 0,            // ← fade in/out
              transition: 'opacity 1.5s ease-in-out'
            }}
            onMouseDown={handleMouseDown}
          />
        ))}
        {/* Horizontal grid lines */}
        {[1, 2].map(i => (
          <line
            key={`h${i}`}
            x1={0}
            y1={60 * i}
            x2={180}
            y2={60 * i}
            stroke="#888"
            strokeWidth={10}
            style={{
              pointerEvents: 'stroke',
              cursor: visible ? 'move' : 'auto',
              opacity: visible ? 1 : 0,            // ← fade in/out
              transition: 'opacity 1.5s ease-in-out'
            }}
            onMouseDown={handleMouseDown}
          />
        ))}
      </svg>
  
    </div>
  );
  
  
  
});

export default ModalsMatrix;
