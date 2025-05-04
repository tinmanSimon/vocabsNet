import { useMemo } from 'react'
import Word from './Word'
import Edge from './Edge'
import generateTestData from './TestData'
import { spreadWords } from './utils/spreadWords'

function Graph() {
    const testData = generateTestData(100, 150)

    const computedNodes = useMemo(() => {
        return spreadWords(testData.nodes, testData.edges, {
            nodeDistance: 50,
            edgeDistance: 30,
            iterations: 300,
            boxSize: 200
        })
    }, [testData.nodes, testData.edges])

    const nodeMap = useMemo(() => {
        const map = {}
        for (const node of computedNodes) {
            map[node.name] = node.position
        }
        return map
    }, [computedNodes])

    return (
        <>
            {testData.edges.map((edge, idx) => {
                const sourcePos = nodeMap[edge.from_name]
                const targetPos = nodeMap[edge.to_name]
                if (!sourcePos || !targetPos) return null

                return (
                    <Edge
                        key={idx}
                        source={sourcePos}
                        target={targetPos}
                        doubleEdge={edge.double_edge}
                    />
                )
            })}
            {computedNodes.map(node => (
                <Word
                    key={node.name}
                    position={node.position}
                    name={node.name}
                />
            ))}
        </>
    )
}

export default Graph
