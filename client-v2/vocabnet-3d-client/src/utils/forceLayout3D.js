// forceLayout3D.jsx  – force‑directed layout  +  optional component separation
//
// Usage is identical to before.  Pass  splitComponents:true  to let the
// post‑processing push disjoint blobs apart so they no longer overlap.
//
// import forceLayout3D from './utils/forceLayout3D'
// const laidOut = forceLayout3D(nodes, edges, {
//   restLength      : 45,
//   splitComponents : true,   // <— NEW
//   compMargin          : 30,     // gap between components (default 20)
// })
//
export default function forceLayout3D(nodes, edges, opts = {}) {
    const {
      iterations      = 300,
      kRepel          = 20000,
      kSpring         = 3,
      restLength      = 40,
      initialTemp     = 8,
      coolFactor      = 0.95,
      splitComponents = false,   // <- new flag
      compMargin          = 20,      // <- space between components
    } = opts
  
    /* ---------- helpers ---------- */
    const randPos = () => (Math.random() - 0.5) * 200
    const add   = (a, b)   => { a[0]+=b[0]; a[1]+=b[1]; a[2]+=b[2] }
    const sub   = (a, b)   => [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
    const len   = v        => Math.hypot(v[0], v[1], v[2]) || 1e-9
    const scale = (v, s)   => [v[0]*s, v[1]*s, v[2]*s]
  
    /* ---------- initial positions ---------- */
    const pos = {}
    nodes.forEach(n => {
      pos[n.name] = Array.isArray(n.position) && n.position.length === 3
        ? [...n.position]
        : [randPos(), randPos(), randPos()]
    })
  
    /* ---------- detect components ONCE, up front ---------- */
    const adj = {}; nodes.forEach(n => (adj[n.name] = []))
    edges.forEach(e => {
        const a = e.from_name ?? e.from, b = e.to_name ?? e.to
        adj[a].push(b); adj[b].push(a)
    })
    
    const compIndex = {}, groups = []          // idx → [nodeName,…]
    for (const n of nodes) if (compIndex[n.name] === undefined) {
        const idx = groups.length, stack=[n.name]; groups.push([])
        while (stack.length) {
            const cur = stack.pop()
             if (compIndex[cur] !== undefined) continue
             compIndex[cur] = idx; groups[idx].push(cur)
             for (const nb of adj[cur]) stack.push(nb)
        }
    }

    /* ---------- main force‑directed annealing ---------- */
    let T = initialTemp
    for (let it = 0; it < iterations; it++) {
        const disp = {}; nodes.forEach(n => (disp[n.name] = [0,0,0]))
  
        // repulsion **inside each component only**
        for (const group of groups) {
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const a = group[i], b = group[j]
                const delta = sub(pos[a], pos[b])
                const d = len(delta)
                const force = kRepel / (d*d)
                const move = scale(delta, force/d)
                add(disp[a], move)
                add(disp[b], scale(move, -1))
                }
            }
        }
  
        // springs
        for (const e of edges) {
            const a = e.from_name ?? e.from, b = e.to_name ?? e.to
            const delta = sub(pos[a], pos[b])
            const d = len(delta)
            const force = kSpring * (d - restLength)
            const move  = scale(delta, force/d)
            add(disp[a], scale(move, -1))
            add(disp[b], move)
        }
  
        // integrate limited by temperature
        for (const n of nodes) {
            const name = n.name
            const move = disp[name]
            const mLen = len(move)
            add(pos[name], mLen > T ? scale(move, T/mLen) : move)
        }
    
        T *= coolFactor
        if (T < 0.002) break
    }
  
    /* ---------- optional component‑separation pass ---------- */
    if (splitComponents) {
        // groups & compIndex already computed above — reuse them
        const compCnt = groups.length
        if (compCnt > 1) {
            // 3) compute centroid & radius of each component
            const centres = Array.from({length:compCnt}, _=>[0,0,0])
            const counts  = Array(compCnt).fill(0)
            nodes.forEach(n=>{
                const idx = compIndex[n.name]
                add(centres[idx], pos[n.name]); counts[idx]++
            })
            centres.forEach((c,i)=>{ c[0]/=counts[i]; c[1]/=counts[i]; c[2]/=counts[i] })
    
            const radii = Array(compCnt).fill(0)
            nodes.forEach(n=>{
                const idx = compIndex[n.name]
                const r = len(sub(pos[n.name], centres[idx]))
                radii[idx] = Math.max(radii[idx], r)
            })
    
            // 4) simple pairwise push‑apart until no overlaps
            const MAX_SEP_ROUNDS = compCnt * compCnt * 15
            let moved, rounds = 0
            do {
                moved = false
                for (let i = 0; i < compCnt; i++) {
                    for (let j = i+1; j < compCnt; j++) {
                        const delta = sub(centres[i], centres[j])
                        const d = len(delta)
                        const needed = radii[i] + radii[j] + compMargin
                        if (d < needed && d > 1e-6) {
                            const overlap = (needed - d) / 2
                            const shift   = scale(delta, overlap / d)
                            // move every node in comp i one way, comp j the other
                            for (const n of nodes) {
                            if (compIndex[n.name] === i) add(pos[n.name],  shift)
                            else if (compIndex[n.name] === j) add(pos[n.name], scale(shift,-1))
                            }
                            add(centres[i],  shift)
                            add(centres[j], scale(shift,-1))
                            moved = true
                        }
                    }
                }
            } while (moved && ++rounds < MAX_SEP_ROUNDS)          // iterate until all gaps ≥ compMargin
        }
    }
  
    /* ---------- copy back ---------- */
    nodes.forEach(n => { n.position = pos[n.name] })
    return nodes
}
