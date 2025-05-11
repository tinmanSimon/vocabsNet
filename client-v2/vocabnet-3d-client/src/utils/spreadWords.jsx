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

function sq(x){return x*x}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function len(v){return Math.hypot(...v)}
function norm(v){const l=len(v)||1e-6;return [v[0]/l,v[1]/l,v[2]/l]}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}

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

function connectedComponents(nodes, edges) {
  const adj = new Map()
  nodes.forEach(n => adj.set(n.name, []))
  edges.forEach(e => {
    const a = e.from ?? e.from_name, b = e.to ?? e.to_name
    adj.get(a).push(b); adj.get(b).push(a)
  })

  const seen = new Set(), comps = []
  for (const n of nodes.map(v => v.name)) {
    if (seen.has(n)) continue
    const stack=[n], comp=[]
    while (stack.length) {
      const v = stack.pop()
      if (seen.has(v)) continue
      seen.add(v); comp.push(v)
      stack.push(...adj.get(v))
    }
    comps.push(comp)
  }
  return comps
}

// translate every node in a component by [dx,dy,dz]
function translateComponent(pos, comp, dx, dy, dz) {
  for (const name of comp) {
    pos[name][0]+=dx; pos[name][1]+=dy; pos[name][2]+=dz
  }
}

// main routine
function separateComponents(nodes, edges, pos, nodeDist, paddingFactor=2.0) {
  const comps = connectedComponents(nodes, edges)
  if (comps.length <= 1) return  // nothing to do

  const pad = nodeDist * paddingFactor

  // pre‑compute centroids & radii
  const info = comps.map(comp => {
    // centroid
    let cx=0, cy=0, cz=0
    comp.forEach(n => { const p=pos[n]; cx+=p[0]; cy+=p[1]; cz+=p[2] })
    cx/=comp.length; cy/=comp.length; cz/=comp.length
    // radius = max distance to centroid
    let r = 0
    comp.forEach(n => {
      const p=pos[n]
      r = Math.max(r, Math.hypot(p[0]-cx,p[1]-cy,p[2]-cz))
    })
    return { comp, cx, cy, cz, r }
  })

  // simple iterative repulsion between component spheres
  const maxIters = 100
  for (let iter=0; iter<maxIters; iter++) {
    let moved = false
    for (let i=0;i<info.length;i++)
      for (let j=i+1;j<info.length;j++) {
        const A=info[i], B=info[j]
        const dx=A.cx-B.cx, dy=A.cy-B.cy, dz=A.cz-B.cz
        const dist = Math.hypot(dx,dy,dz) || 1e-6
        const minDist = A.r + B.r + pad
        if (dist >= minDist) continue
        // push them apart equally
        const push = (minDist - dist) * 0.5
        const nx = dx/dist, ny=dy/dist, nz=dz/dist
        translateComponent(pos, A.comp,  nx*push, ny*push, nz*push)
        translateComponent(pos, B.comp, -nx*push,-ny*push,-nz*push)
        // update centroids
        A.cx+= nx*push; A.cy+= ny*push; A.cz+= nz*push
        B.cx-= nx*push; B.cy-= ny*push; B.cz-= nz*push
        moved = true
      }
    if (!moved) break
  }
}

// ---------------------------------------------------------------------------

export default function spreadWords(
  nodes,
  edges,
  options = {}
){
  // ─────────── parameters & derived values
  const {
    nodeDistance       =15,
    edgeDistance       =10,
    edgeEdgeDistance   =10,
    idealEdgeLength    =nodeDistance*1.2,
    maxEdgeFactor      =2,
    iterations         =50,
    boxSize            =200,
    cellSize           =nodeDistance*1.1,
    new_nodes          =[],
    camera             =null,
    concave        = true,
    concaveStrength= 0.25,
  } = options

  const newSet = new Set(new_nodes)
  const maxEdgeLength = idealEdgeLength*maxEdgeFactor
  const desiredRadius = Math.max(nodeDistance * Math.cbrt(nodes.length) * 1.15, nodeDistance * 3);  

  // ─────────── state vectors
  const pos  = {}   // name -> [x,y,z]
  const vel  = {}
  const frozen = {} // bool

  // helper to seed brand‑new nodes directly in front of the camera
  function seedInView(){
    if(!camera)return[(Math.random()-.5)*boxSize,(Math.random()-.5)*boxSize,(Math.random()-.5)*boxSize]
    const {position:[cx,cy,cz],direction:[dx,dy,dz]} = camera
    const dir = norm([dx,dy,dz])
    // push 1½ × ideal length away from camera, then jitter slightly
    return [
      cx + dir[0] * desiredRadius + (Math.random() - .5) * nodeDistance * .3,
      cx + dir[1] * desiredRadius + (Math.random() - .5) * nodeDistance * .3,
      cx + dir[2] * desiredRadius + (Math.random() - .5) * nodeDistance * .3,
    ]
  }

  // ─────────── 1) initialise positions
  for(const n of nodes){
    if(Array.isArray(n.position)&&n.position.length===3){
      pos[n.name]=[...n.position]
      frozen[n.name]=!newSet.has(n.name)        // newly‑added nodes always start unfrozen
    }else{
      pos[n.name]= newSet.has(n.name) ? seedInView()
                   : [(Math.random()-.5)*boxSize,(Math.random()-.5)*boxSize,(Math.random()-.5)*boxSize]
      frozen[n.name]=false
    }
    vel[n.name]=[0,0,0]
  }

  // ─────────── 2) relax
  for(let step=0;step<iterations;step++){
    // 2a) build spatial hash + zero velocities
    const buckets=new Map()
    for(const n of nodes){
      if(!frozen[n.name]) vel[n.name]=[0,0,0]
      const p=pos[n.name],k=key(p[0],p[1],p[2],cellSize)
      ;(buckets.get(k)||buckets.set(k,[]).get(k)).push(n.name)
    }
    const neighbours=([x,y,z])=>{
      const res=[],X=Math.floor(x/cellSize),Y=Math.floor(y/cellSize),Z=Math.floor(z/cellSize)
      for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
        const b=buckets.get(`${X+i},${Y+j},${Z+k}`); if(b) res.push(...b)
      }
      return res
    }

    // 2b) node‑node repulsion (minimum distance)
    for(const aNode of nodes){
      const a=aNode.name,pa=pos[a],neighboursA=neighbours(pa)
      for(const b of neighboursA){
        if(a>=b)continue
        const pb=pos[b],delta=sub(pa,pb),d=len(delta)
        if(d===0||d>=nodeDistance)continue
        const push=(nodeDistance-d)*0.5,normD=delta.map(v=>v/d)
        if(!frozen[a]) vel[a]=vel[a].map((v,i)=>v+normD[i]*push)
        if(!frozen[b]) vel[b]=vel[b].map((v,i)=>v-normD[i]*push)
      }
    }

    // 2c) node‑edge clearance
    for(const n of nodes){
      if(frozen[n.name])continue
      const p=pos[n.name]
      for(const e of edges){
        const f=e.from_name??e.from,t=e.to_name??e.to
        if(f===n.name||t===n.name)continue
        const [ax,ay,az]=pos[f],[bx,by,bz]=pos[t]
        const [qx,qy,qz]=closestPointOnSegment(p[0],p[1],p[2],ax,ay,az,bx,by,bz)
        const delta=[p[0]-qx,p[1]-qy,p[2]-qz],d=len(delta)
        if(d===0||d>=edgeDistance)continue
        const push=(edgeDistance-d)
        const normD=delta.map(v=>v/d)
        vel[n.name]=vel[n.name].map((v,i)=>v+normD[i]*push)
      }
    }

    // 2d) edge‑edge clearance
    for(let i=0;i<edges.length;i++)
      for(let j=i+1;j<edges.length;j++){
        const e1=edges[i],e2=edges[j]
        const f1=e1.from_name??e1.from,t1=e1.to_name??e1.to
        const f2=e2.from_name??e2.from,t2=e2.to_name??e2.to
        const [d2,P,Q]=segSegDist2(pos[f1],pos[t1],pos[f2],pos[t2])
        if(d2===0||d2>=sq(edgeEdgeDistance))continue
        const d=Math.sqrt(d2),push=(edgeEdgeDistance-d)*0.25,normD=sub(P,Q).map(v=>v/d)
        for(const node of[f1,t1])
          if(!frozen[node]) vel[node]=vel[node].map((v,i)=>v+normD[i]*push)
        for(const node of[f2,t2])
          if(!frozen[node]) vel[node]=vel[node].map((v,i)=>v-normD[i]*push)
      }

    // 2e) edge‑spring attraction (keep edges from getting too long)
    for(const e of edges){
      const f=e.from_name??e.from,t=e.to_name??e.to
      const a=pos[f],b=pos[t],delta=sub(b,a),d=len(delta)||1e-6
      const isNewEdge = newSet.has(f)||newSet.has(t)
      const limit = isNewEdge ? maxEdgeLength*2 : maxEdgeLength
      if(d<=limit) continue
      // if both nodes are currently frozen, loosen them a bit so they can move
      if(frozen[f]&&frozen[t]){frozen[f]=false; frozen[t]=false}
      const pull=(d-limit)*0.5
      const normD=delta.map(v=>v/d)
      if(!frozen[f]) vel[f]=vel[f].map((v,i)=>v+normD[i]*pull)
      if(!frozen[t]) vel[t]=vel[t].map((v,i)=>v-normD[i]*pull)
    }

    // 2f) integrate + damping
    let maxMove=0
    for(const n of nodes){
      if(frozen[n.name])continue
      const v=vel[n.name]
      v[0]*=0.6;v[1]*=0.6;v[2]*=0.6
      pos[n.name][0]+=v[0];pos[n.name][1]+=v[1];pos[n.name][2]+=v[2]
      maxMove=Math.max(maxMove,len(v))
    }

    // 2g) concavity – hollow out the middle so nodes hug a shell
    if (concave) {
      for (const n of nodes) {
        if (frozen[n.name]) continue
        const p = pos[n.name]
        const r = len(p) || 1e-6
        const dir = p.map(v => v / r)          // unit vector from centre → node
        const delta = desiredRadius - r        // +ve means “inside” the shell
        // ‑ inside: push outward strongly ‑ //
        // ‑ outside: let it drift back in very gently (1/5 the force) ‑ //
        const factor = delta > 0 ?  concaveStrength
                                :  concaveStrength * 0.2
        for (let i = 0; i < 3; i++)
          vel[n.name][i] += dir[i] * delta * factor
      }
    }

    if(maxMove<0.05) break   // stable enough
  }

  // 2h) quick component‑separation pass (same as before)
  separateComponents(nodes, edges, pos, nodeDistance, 0.5)

  // 3) centre everything around origin (unchanged)
  const all=Object.values(pos)
  const cx=all.reduce((s,p)=>s+p[0],0)/all.length
  const cy=all.reduce((s,p)=>s+p[1],0)/all.length
  const cz=all.reduce((s,p)=>s+p[2],0)/all.length
  for(const p of all){p[0]-=cx;p[1]-=cy;p[2]-=cz}

  // 4) pack results back out
  return nodes.map(n=>({...n,position:pos[n.name]}))
}
