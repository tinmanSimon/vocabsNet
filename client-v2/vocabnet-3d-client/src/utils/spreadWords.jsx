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

export default function spreadWords(nodes, edges, options = {}) {
    const minNodeDistance = options.nodeDistance || 15
    const minNodeEdgeDistance = options.edgeDistance || 10
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