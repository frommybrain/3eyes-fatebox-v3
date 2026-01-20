// components/three/floor.jsx
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

extend(THREE)

export default function Floor({ size }) {
    return (
        <>
            <mesh
                position={[0, -0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                castShadow receiveShadow
            >
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial color="#e7e7e7" />
            </mesh>

            
        </>

    )
}
