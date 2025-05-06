function dot(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
}

function closestPointOnSegment(A, B, P) {
    const AB = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const AP = [P[0] - A[0], P[1] - A[1], P[2] - A[2]]
    const abDotAb = AB[0]**2 + AB[1]**2 + AB[2]**2
    const apDotAb = AP[0]*AB[0] + AP[1]*AB[1] + AP[2]*AB[2]
    const t = Math.max(0, Math.min(1, apDotAb / abDotAb))
    return [
        A[0] + AB[0] * t,
        A[1] + AB[1] * t,
        A[2] + AB[2] * t,
    ]
}

function segmentToSegmentDistance(A1, A2, B1, B2) {
    const u = [A2[0] - A1[0], A2[1] - A1[1], A2[2] - A1[2]]
    const v = [B2[0] - B1[0], B2[1] - B1[1], B2[2] - B1[2]]
    const w0 = [A1[0] - B1[0], A1[1] - B1[1], A1[2] - B1[2]]

    const a = dot(u, u)
    const b = dot(u, v)
    const c = dot(v, v)
    const d = dot(u, w0)
    const e = dot(v, w0)

    const denom = a * c - b * b
    let sc = 0, tc = 0

    if (denom !== 0) {
        sc = (b * e - c * d) / denom
        tc = (a * e - b * d) / denom
    }

    sc = Math.max(0, Math.min(1, sc))
    tc = Math.max(0, Math.min(1, tc))

    const closestA = [
        A1[0] + sc * u[0],
        A1[1] + sc * u[1],
        A1[2] + sc * u[2],
    ]
    const closestB = [
        B1[0] + tc * v[0],
        B1[1] + tc * v[1],
        B1[2] + tc * v[2],
    ]

    const dx = closestA[0] - closestB[0]
    const dy = closestA[1] - closestB[1]
    const dz = closestA[2] - closestB[2]

    return {
        distance: Math.sqrt(dx * dx + dy * dy + dz * dz),
        vector: [dx, dy, dz]
    }
}

export default function spreadWords(nodes, edges, options = {}) {
    const minNodeDistance = options.nodeDistance || 15
    const minNodeEdgeDistance = options.edgeDistance || 10
    const minEdgeEdgeDistance = options.edgeEdgeDistance || 10
    const iterations = options.iterations || 30
    const boxSize = options.boxSize || 200

    const positions = {}
    const velocity = {}

    for (const node of nodes) {
        positions[node.name] = [
            (Math.random() - 0.5) * boxSize,
            (Math.random() - 0.5) * boxSize,
            (Math.random() - 0.5) * boxSize,
        ]
        velocity[node.name] = [0, 0, 0]
    }

    const edgeMap = {}
    for (const edge of edges) {
        edgeMap[`${edge.from_name}_${edge.to_name}`] = true
        edgeMap[`${edge.to_name}_${edge.from_name}`] = true
    }

    for (let iter = 0; iter < iterations; iter++) {
        for (const node of nodes) {
            velocity[node.name] = [0, 0, 0]
        }

        // Node-node repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j]
                if (edgeMap[`${a.name}_${b.name}`]) continue

                const posA = positions[a.name]
                const posB = positions[b.name]
                const dx = posA[0] - posB[0]
                const dy = posA[1] - posB[1]
                const dz = posA[2] - posB[2]
                const distSq = dx * dx + dy * dy + dz * dz
                const dist = Math.sqrt(distSq) + 0.01

                if (dist < minNodeDistance) {
                    const push = (minNodeDistance - dist) * 0.5
                    const nx = dx / dist, ny = dy / dist, nz = dz / dist
                    velocity[a.name][0] += nx * push
                    velocity[a.name][1] += ny * push
                    velocity[a.name][2] += nz * push
                    velocity[b.name][0] -= nx * push
                    velocity[b.name][1] -= ny * push
                    velocity[b.name][2] -= nz * push
                }
            }
        }

        // Node-edge repulsion
        for (const node of nodes) {
            const pos = positions[node.name]
            for (const edge of edges) {
                if (edge.from_name === node.name || edge.to_name === node.name) continue

                const from = positions[edge.from_name]
                const to = positions[edge.to_name]
                const closest = closestPointOnSegment(from, to, pos)
                const dx = pos[0] - closest[0]
                const dy = pos[1] - closest[1]
                const dz = pos[2] - closest[2]
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01

                if (dist < minNodeEdgeDistance) {
                    const push = minNodeEdgeDistance - dist
                    const nx = dx / dist, ny = dy / dist, nz = dz / dist
                    velocity[node.name][0] += nx * push
                    velocity[node.name][1] += ny * push
                    velocity[node.name][2] += nz * push
                }
            }
        }

        // Edge-edge repulsion
        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                const e1 = edges[i]
                const e2 = edges[j]
        
                // Skip if edges share any nodes
                if (e1.from_name === e2.from_name || e1.from_name === e2.to_name ||
                    e1.to_name === e2.from_name || e1.to_name === e2.to_name) continue
        
                const p1a = positions[e1.from_name]
                const p1b = positions[e1.to_name]
                const p2a = positions[e2.from_name]
                const p2b = positions[e2.to_name]
        
                const { distance, vector } = segmentToSegmentDistance(p1a, p1b, p2a, p2b)
        
                if (distance < minEdgeEdgeDistance) {
                    const push = (minEdgeEdgeDistance - distance) * 0.25
                    const nx = vector[0] / (distance + 0.01)
                    const ny = vector[1] / (distance + 0.01)
                    const nz = vector[2] / (distance + 0.01)
        
                    // Apply force to both ends of each edge
                    for (const name of [e1.from_name, e1.to_name]) {
                        velocity[name][0] += nx * push
                        velocity[name][1] += ny * push
                        velocity[name][2] += nz * push
                    }
                    for (const name of [e2.from_name, e2.to_name]) {
                        velocity[name][0] -= nx * push
                        velocity[name][1] -= ny * push
                        velocity[name][2] -= nz * push
                    }
                }
            }
        }

        for (const node of nodes) {
            positions[node.name][0] += velocity[node.name][0]
            positions[node.name][1] += velocity[node.name][1]
            positions[node.name][2] += velocity[node.name][2]
        }
    }

    // Return Word objects with position
    return nodes.map(node => ({
        ...node,
        position: positions[node.name]
    }))
}