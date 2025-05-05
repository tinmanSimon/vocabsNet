// Graph.jsx
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import Word from './Word';

// ← this is the file you uploaded
import Edge from './Edge';

import { randomVecNear } from './utils/randomVecNear';

/* ------------------------------------------------- *
 * Graph
 *  - manages node / edge arrays
 *  - exposes .applyPayload(payload) to parent (App)
 *  - lets Word handle its own fade; keeps removed
 *    nodes alive until fade‑out finishes
 * ------------------------------------------------- */
const Graph = forwardRef((_, ref) => {
  /* live data */
  const [nodes, setNodes] = useState([]);   // [{ name, position }]
  const [edges, setEdges] = useState([]);   // [{ from_name, to_name, double_edge? }]

  /* ----------------  public API  ---------------- */
  useImperativeHandle(ref, () => ({
    applyPayload({ words = [], edges: edgeArr = [], mode }) {
      if (mode === 'add-data') {
        /** ---------- add words ---------- */
        if (words.length) {
          setNodes(prev => {
            const next = [...prev];
            words.forEach(w => {
              if (!next.find(n => n.name === w.name)) {
                next.push({
                  name: w.name,
                  position: w.position ?? randomVecNear(null)
                });
              }
            });
            return next;
          });
        }
        
        /** ---------- add edges ---------- */
        if (edgeArr.length) {
          setEdges(prev => {
            const next = [...prev];
            edgeArr.forEach(e => {
              if (!next.find(x =>
                   x.from_name === e.from_name &&
                   x.to_name   === e.to_name)) {
                next.push(e);
              }
            });
            return next;
          });
        }

      } else if (mode === 'remove-data') {
        // TODO
      }
    }
  }));

  /* lookup positions for edges */
  const posMap = Object.fromEntries(nodes.map(n => [n.name, n.position]));

  return (
    <>
      {/* --- EDGES --- */}
      {edges.map(e => {
        const a = posMap[e.from_name];
        const b = posMap[e.to_name];
        if (!a || !b) return null; 
        return (
          <Edge
            key={`${e.edge_name}-${e.from_name}-${e.to_name}-${e.double_edge ? '0' : '1'}`}
            source={a}
            target={b}
            doubleEdge={e.double_edge}
          />
        );
      })}

      {/* --- WORDS --- */}
      {nodes.map(n => (
        <Word
          key={n.name}
          name={n.name}
          position={n.position}
        />
      ))}
    </>
  );
});

export default Graph;
