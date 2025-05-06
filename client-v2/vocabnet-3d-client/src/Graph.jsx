// Graph.jsx
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Word from './Word';

// ← this is the file you uploaded
import Edge from './Edge';

import { randomVecInView } from './utils/randomVecInView';
import generateTestData from './TestData';

/* ------------------------------------------------- *
 * Graph
 *  - manages node / edge arrays
 *  - exposes .applyPayload(payload) to parent (App)
 *  - lets Word handle its own fade; keeps removed
 *    nodes alive until fade‑out finishes
 * ------------------------------------------------- */
const Graph = forwardRef((_, ref) => {
  /* live data */
  const [nodes, setNodes] = useState([]);   // [{ name, position, isRemoving }]
  const [edges, setEdges] = useState([]);   // [{ from_name, to_name, double_edge, isRemoving }]

  const { camera } = useThree();

  const edgeKey = e => `${e.edge_name}-${e.from_name}-${e.to_name}-${e.double_edge ? 1 : 0}`
  const handleWordFadeDone = name =>
    setNodes(prev => prev.filter(n => n.name !== name))
  const handleEdgeFadeDone = key =>
    setEdges(prev => prev.filter(e => edgeKey(e) !== key))

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
                  position: randomVecInView(camera),
                  isRemoving: false
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
                next.push({...e, isRemoving: false});
              }
            });
            return next;
          });
        }

      } else if (mode === 'remove-data') {
        if (words.length) {
            setNodes(prev =>
                prev.map(n =>
                    words.some(w => w.name === n.name) ? { ...n, isRemoving: true } : n
                )
            )
        }
        if (edgeArr.length || words.length) {
            setEdges(prev =>
                prev.map(e =>
                    edgeArr.some(x => edgeKey(x) === edgeKey(e)) ||
                    words.some(w => w.name === e.from_name || w.name === e.to_name)
                    ? { ...e, isRemoving: true }
                    : e
                )
            )
        }
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
            key={edgeKey(e)}
            source={a}
            target={b}
            name={e.edge_name}
            doubleEdge={e.double_edge}
            removing={e.isRemoving}
            onFadeDone={() => handleEdgeFadeDone(edgeKey(e))}
          />
        );
      })}

      {/* --- WORDS --- */}
      {nodes.map(n => (
        <Word
          key={n.name}
          name={n.name}
          position={n.position}
          removing={n.isRemoving}
          onFadeDone={() => handleWordFadeDone(n.name)}
        />
      ))}
    </>
  );
});

export default Graph;
