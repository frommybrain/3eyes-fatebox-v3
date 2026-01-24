// components/three/mainCanvas.jsx
'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import Lights from './lights'
import MainScene from './mainScene'
import { easing } from 'maath'

// =============================================================================
// PURCHASING STATE FLAG
// =============================================================================
// The `purchasing` prop is passed from ProjectPage.jsx when a user is buying a box.
// This flag can be used to trigger animations or visual effects in the 3D scene:
//
// Usage in MainCanvas:
//   - purchasing={true}  → User clicked "Buy Box", transaction in progress
//   - purchasing={false} → Idle state, no purchase happening
//
// Potential uses:
//   - Animate the box model (shake, glow, spin)
//   - Change lighting/environment during purchase
//   - Add particle effects
//   - Camera movement/zoom
//
// To implement: Pass `purchasing` prop down to MainScene or create a new
// animation component that responds to this state.
// =============================================================================

// Base camera position and lookAt target
const BASE_POSITION = [-2.19, 1.13, 3.03]
const BASE_LOOKAT = [0.01, 1.23, -0.09]

function CameraController() {
    useFrame((state, delta) => {
        // Apply mouse offset to base position
        const targetX = BASE_POSITION[0] + state.pointer.x * 0.5
        const targetY = BASE_POSITION[1] + state.pointer.y * 0.3
        const targetZ = BASE_POSITION[2]

        easing.damp3(state.camera.position, [targetX, targetY, targetZ], 0.25, delta)
        state.camera.lookAt(BASE_LOOKAT[0], BASE_LOOKAT[1], BASE_LOOKAT[2])
    })
    return null
}




export default function MainCanvas({ purchasing = false }) {
    // See PURCHASING STATE FLAG comment at top of file for usage details

    return (
        <div className="fixed top-0 left-0 w-screen h-screen z-0">

            <Canvas
                shadows
                dpr={[0.8, 2]}

            >
                <color attach="background" args={['#e7e7e7']} />
                <fog attach="fog" args={['#e7e7e7', 1, 40]} />
                <MainScene />
                <Lights />
                <PerspectiveCamera
                    makeDefault
                    position={BASE_POSITION}
                    fov={55}
                    near={0.1}
                    far={100}
                />
                <CameraController />
            </Canvas>
        </div>
    )
}
