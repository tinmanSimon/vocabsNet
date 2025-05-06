import spreadWords from "./utils/spreadWords"

function generateTestData(n, m) {
    const words = []
    const edges = []
    const edgeNames = ['rel_0', 'rel_1', 'rel_2', 'rel_3', 'rel_4', 'rel_5', 'rel_6', 'rel_7', 'rel_8', 'rel_9']
    const usedPairs = new Set()

    // Generate n unique words
    for (let i = 0; i < n; i++) {
        words.push({
            key: `word_${i}`,
            name: `word_${i}`,
            username: "simon"
        })
    }

    const names = words.map(w => w.name)

    // Generate 2n unique edges
    while (edges.length < m) {
        const fromIndex = Math.floor(Math.random() * n)
        let toIndex = Math.floor(Math.random() * n)

        // Make sure from ≠ to
        if (fromIndex === toIndex) continue

        const from = names[fromIndex]
        const to = names[toIndex]

        const pairKey = `${from}->${to}`
        const reverseKey = `${to}->${from}`

        // Skip if exact or reverse edge already exists
        if (usedPairs.has(pairKey) || usedPairs.has(reverseKey)) continue

        usedPairs.add(pairKey)

        edges.push({
            key: `${edges.length}`,
            edge_name: edgeNames[Math.floor(Math.random() * edgeNames.length)],
            from_name: from,
            to_name: to,
            username: "simon",
            double_edge: false
        })
    }

    return { words: spreadWords(words, edges), edges: edges }
}

export default generateTestData