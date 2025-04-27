import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import Word from './Word'
import Edge from './Edge'
import testData from './TestData'


function Graph() {
    const nodesRef = useRef(testData.nodes)
    const edgesRef = useRef(testData.edges)

    return (
        <>
        {edgesRef.current.map((edge, idx) => {
            const source = nodesRef.current.find(n => n.name === edge.from_name)
            const target = nodesRef.current.find(n => n.name === edge.to_name)
            if (!source || !target) return null

            return (
            <Edge
                key={idx}
                source={source.position}
                target={target.position}
                doubleEdge={edge.double_edge}

            />
            )
        })}
        {nodesRef.current.map(node => (
            <Word key={node.name} position={node.position} name={node.name} />
        ))}
        </>
    )
}

export default Graph
