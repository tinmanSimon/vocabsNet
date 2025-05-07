// spreadWords.jsx  —  strictly‑minimal‑movement layout
//
// Assumptions
//   nodes : [{ name, position?: [x,y,z] }, …]
//   edges : [{ from, to } | { from_name, to_name }, …]
//
// Options (defaults)
//   nodeDistance      : 15   – centre‑to‑centre
//   edgeDistance      : 10   – node to any point on an edge
//   edgeEdgeDistance  : 10   – shortest distance between 2 segments
//   iterations        : 50
//   boxSize           : 200  – starting cube for un‑positioned nodes
//   cellSize          : nodeDistance * 1.1  (for spatial hash)

function sq(x) { return x * x }
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }

// --- helpers ---------------------------------------------------------------

// shortest point on AB to P  →  [qx, qy, qz]
function closestPointOnSegment(px, py, pz, ax, ay, az, bx, by, bz) {
  const ab = [bx-ax, by-ay, bz-az]
  const t  = Math.max(0, Math.min(1,
              ((px-ax)*ab[0] + (py-ay)*ab[1] + (pz-az)*ab[2]) /
              (sq(ab[0]) + sq(ab[1]) + sq(ab[2]) || 1)))
  return [ax + ab[0]*t, ay + ab[1]*t, az + ab[2]*t]
}

// segment–segment distance ‑ returns squared distance **and** the 2 closest pts
function segSegDist2(a1,a2,b1,b2) {
  const u = [a2[0]-a1[0], a2[1]-a1[1], a2[2]-a1[2]]
  const v = [b2[0]-b1[0], b2[1]-b1[1], b2[2]-b1[2]]
  const w0= [a1[0]-b1[0], a1[1]-b1[1], a1[2]-b1[2]]
  const a = dot(u,u), b = dot(u,v), c = dot(v,v), d = dot(u,w0), e = dot(v,w0)
  const D = a*c - b*b || 1
  let sc = (b*e - c*d) / D, tc = (a*e - b*d) / D
  sc = Math.max(0, Math.min(1, sc))
  tc = Math.max(0, Math.min(1, tc))
  const P = [a1[0]+sc*u[0], a1[1]+sc*u[1], a1[2]+sc*u[2]]
  const Q = [b1[0]+tc*v[0], b1[1]+tc*v[1], b1[2]+tc*v[2]]
  return [sq(P[0]-Q[0])+sq(P[1]-Q[1])+sq(P[2]-Q[2]), P, Q]
}

// spatial hash key
const key = (x, y, z, s) =>
  `${Math.floor(x/s)},${Math.floor(y/s)},${Math.floor(z/s)}`

// ---------------------------------------------------------------------------

export default function spreadWords(nodes, edges, opt = {}) {
  const minNN   = opt.nodeDistance      ?? 15
  const minNE   = opt.edgeDistance      ?? 10
  const minEE   = opt.edgeEdgeDistance  ?? 10
  const iters   = opt.iterations        ?? 50
  const box     = opt.boxSize           ?? 200
  const cell    = opt.cellSize          ?? minNN * 1.1

  const pos = {}, vel = {}, frozen = {}

  // --- 1) initialise positions --------------------------------------------
  for (const n of nodes) {
    if (Array.isArray(n.position) && n.position.length === 3) {
      pos[n.name]   = [...n.position]
      frozen[n.name]= true
    } else {
      pos[n.name]   = [
        (Math.random()-.5)*box,
        (Math.random()-.5)*box,
        (Math.random()-.5)*box,
      ]
      frozen[n.name]= false
    }
    vel[n.name] = [0,0,0]
  }

  // --- 2) unfreeze overlapping frozen nodes --------------------------------
  for (let i=0;i<nodes.length;i++)
    for (let j=i+1;j<nodes.length;j++) {
      const a = nodes[i].name, b = nodes[j].name
      if (!(frozen[a]&&frozen[b])) continue
      const dx=pos[a][0]-pos[b][0], dy=pos[a][1]-pos[b][1], dz=pos[a][2]-pos[b][2]
      if (Math.hypot(dx,dy,dz) < minNN) { frozen[a]=frozen[b]=false }
    }

  // --- 3) main relaxation ---------------------------------------------------
  for (let step=0; step<iters; step++) {

    // 3a) reset velocities + build spatial hash for quick neighbour look‑up
    const buckets = new Map()
    for (const n of nodes) {
      if (!frozen[n.name]) vel[n.name] = [0,0,0]
      const [x,y,z] = pos[n.name]
      const k = key(x,y,z,cell)
      ;(buckets.get(k)||buckets.set(k,[]).get(k)).push(n.name)
    }

    // helper to iterate neighbours in ±1 cell cube
    const near = ([x,y,z]) => {
      const res=[]
      const X=Math.floor(x/cell), Y=Math.floor(y/cell), Z=Math.floor(z/cell)
      for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
        const b=buckets.get(`${X+i},${Y+j},${Z+k}`); if(b) res.push(...b)
      }
      return res
    }

    // 3b) node‑node
    for (const n of nodes) {
      const a = n.name, pa = pos[a], neigh = near(pa)
      for (const b of neigh) {
        if (a >= b) continue                    // avoid dup pairs
        const pb = pos[b]
        const dx=pa[0]-pb[0], dy=pa[1]-pb[1], dz=pa[2]-pb[2]
        const dist = Math.hypot(dx,dy,dz)
        if (dist >= minNN || dist===0) continue
        const push = (minNN - dist) * 0.5
        const nx=dx/dist, ny=dy/dist, nz=dz/dist
        if (!frozen[a]) { vel[a][0]+=nx*push; vel[a][1]+=ny*push; vel[a][2]+=nz*push }
        if (!frozen[b]) { vel[b][0]-=nx*push; vel[b][1]-=ny*push; vel[b][2]-=nz*push }
      }
    }

    // 3c) node‑edge
    for (const n of nodes) {
      if (frozen[n.name]) continue
      const [px,py,pz]=pos[n.name]
      for (const e of edges) {
        const f   = e.from ?? e.from_name,  t = e.to ?? e.to_name
        if (f===n.name || t===n.name) continue
        const [ax,ay,az]=pos[f], [bx,by,bz]=pos[t]
        const [qx,qy,qz]=closestPointOnSegment(px,py,pz,ax,ay,az,bx,by,bz)
        const dx=px-qx, dy=py-qy, dz=pz-qz, dist=Math.hypot(dx,dy,dz)
        if (dist>=minNE || dist===0) continue
        const push = (minNE - dist)
        vel[n.name][0]+=dx/dist*push
        vel[n.name][1]+=dy/dist*push
        vel[n.name][2]+=dz/dist*push
      }
    }

    // 3d) edge‑edge  (keep it simple but deterministic)
    for (let i=0;i<edges.length;i++)
      for (let j=i+1;j<edges.length;j++) {
        const e1=edges[i], e2=edges[j]
        const f1=e1.from??e1.from_name, t1=e1.to??e1.to_name
        const f2=e2.from??e2.from_name, t2=e2.to??e2.to_name
        const A1=pos[f1], A2=pos[t1], B1=pos[f2], B2=pos[t2]
        const [d2, P, Q] = segSegDist2(A1,A2,B1,B2)
        if (d2 >= sq(minEE) || d2===0) continue
        const dist = Math.sqrt(d2)
        const push = (minEE - dist) * 0.25
        const nx = (P[0]-Q[0])/dist, ny=(P[1]-Q[1])/dist, nz=(P[2]-Q[2])/dist
        for (const node of [f1,t1])
          if (!frozen[node]) { vel[node][0]+=nx*push; vel[node][1]+=ny*push; vel[node][2]+=nz*push }
        for (const node of [f2,t2])
          if (!frozen[node]) { vel[node][0]-=nx*push; vel[node][1]-=ny*push; vel[node][2]-=nz*push }
      }

    // 3e) integrate  (light friction to damp oscillations)
    let maxMove = 0
    for (const n of nodes) {
      if (frozen[n.name]) continue
      const v = vel[n.name]
      v[0]*=0.6; v[1]*=0.6; v[2]*=0.6            // friction
      pos[n.name][0]+=v[0]; pos[n.name][1]+=v[1]; pos[n.name][2]+=v[2]
      maxMove = Math.max(maxMove, Math.hypot(...v))
    }

    // early exit – all movements below 0.1 units ⇒ layout stable
    if (maxMove < 0.1) break
  }

  // --- 4) return new list ---------------------------------------------------
  return nodes.map(n => ({ ...n, position: pos[n.name] }))
}
