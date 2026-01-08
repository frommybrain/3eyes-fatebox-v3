// components/three/floor.jsx
import { extend } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { GridMaterial } from './materials/GridMaterial'
extend(THREE)

export default function Floor({ size }) {
    return (
        <mesh
            position={[0, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >
            <planeGeometry args={[size, size]} />
            <GridMaterial />
        </mesh>
    )
}
