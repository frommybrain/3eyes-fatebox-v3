// components/three/mainCanvas.jsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import * as THREE from 'three/webgpu'
import Lights from './lights'
import MainScene from './mainScene'

export default function MainCanvas() {

    return (
        <div className="fixed top-0 left-0 w-screen h-screen -z-10">

            <Canvas
                shadows
                dpr={[0.8, 2]}
                camera={{ position: [0, 22, 48], fov: 55, near: 0.1, far: 600 }}
                gl={async (props) => {
                    const renderer = new THREE.WebGPURenderer(props)
                    renderer.shadowMap.enabled = true
                    renderer.shadowMap.type = THREE.BasicShadowMap
                    await renderer.init()
                    return renderer
                }}
            >
                <MainScene />
                <Lights />

                <OrbitControls
                    autoRotate
                    enablePan={false}
                    enableZoom={false}
                    enableRotate={false}
                />

            </Canvas>

        </div>
    )
}
