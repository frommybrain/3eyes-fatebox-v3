// components/three/mainCanvas.jsx
'use client'

import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, AccumulativeShadows, RandomizedLight, CameraControls } from '@react-three/drei'
import Lights from './lights'
import MainScene from './mainScene'
import { easing } from 'maath'
import useViewStore, { HOME_CONFIG, ABOUT_POSITIONS, CAMERA_SMOOTH_TIME } from '@/store/useViewStore'

// Mouse-based camera rig - applies subtle movement based on pointer position
function CameraRig({ groupRef }) {
    useFrame((state, delta) => {
        if (groupRef.current) {
            // Apply subtle rotation based on mouse position
            easing.damp3(
                groupRef.current.rotation,
                [state.pointer.y * 0.1, -state.pointer.x * 0.15, 0],
                0.25,
                delta
            )
        }
    })
    return null
}

// Camera controller that handles view transitions using CameraControls
function CameraViewController({ cameraControlsRef }) {
    const { currentView, aboutIndex, isTransitioning, onTransitionComplete, getCurrentConfig } = useViewStore()
    const initializedRef = useRef(false)
    const lastViewRef = useRef(currentView)
    const lastAboutIndexRef = useRef(aboutIndex)

    // Initialize camera position on mount and handle view/index changes
    useEffect(() => {
        const controls = cameraControlsRef.current
        if (!controls) return

        // Initialize on first run (no animation)
        if (!initializedRef.current) {
            const config = HOME_CONFIG
            controls.setLookAt(
                config.position[0], config.position[1], config.position[2],
                config.target[0], config.target[1], config.target[2],
                false // no animation on init
            )
            initializedRef.current = true
            return
        }

        // Handle view or index changes (with animation)
        const viewChanged = currentView !== lastViewRef.current
        const indexChanged = aboutIndex !== lastAboutIndexRef.current

        if (viewChanged || indexChanged) {
            const config = getCurrentConfig()
            if (config) {
                controls.setLookAt(
                    config.position[0], config.position[1], config.position[2],
                    config.target[0], config.target[1], config.target[2],
                    true // enable smooth transition
                )
            }
            lastViewRef.current = currentView
            lastAboutIndexRef.current = aboutIndex
        }
    }, [currentView, aboutIndex, cameraControlsRef, getCurrentConfig])

    // Listen for camera controls end event to mark transition complete
    useEffect(() => {
        const controls = cameraControlsRef.current
        if (!controls) return

        const handleEnd = () => {
            if (isTransitioning) {
                onTransitionComplete()
            }
        }

        controls.addEventListener('rest', handleEnd)
        return () => controls.removeEventListener('rest', handleEnd)
    }, [cameraControlsRef, isTransitioning, onTransitionComplete])

    return null
}

export default function MainCanvas() {
    const cameraControlsRef = useRef()
    const cameraGroupRef = useRef()

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

                {/* Camera group - mouse interaction applies rotation to this group */}
                <group ref={cameraGroupRef}>
                    <PerspectiveCamera
                        makeDefault
                        fov={55}
                        near={0.1}
                        far={100}
                    />
                </group>

                {/* CameraControls for smooth view transitions */}
                <CameraControls
                    ref={cameraControlsRef}
                    smoothTime={CAMERA_SMOOTH_TIME}
                    draggingSmoothTime={0.2}
                    // Disable user interaction - we control the camera programmatically
                    enabled={true}
                    mouseButtons={{
                        left: 0,    // Disable left click
                        middle: 0,  // Disable middle click
                        right: 0,   // Disable right click
                        wheel: 0,   // Disable wheel
                    }}
                    touches={{
                        one: 0,     // Disable single touch
                        two: 0,     // Disable two finger touch
                        three: 0,   // Disable three finger touch
                    }}
                />

                {/* Mouse-based subtle camera movement */}
                <CameraRig groupRef={cameraGroupRef} />

                {/* Camera view controller - handles view transitions */}
                <CameraViewController cameraControlsRef={cameraControlsRef} />

                <AccumulativeShadows temporal frames={10} scale={10} colorBlend={1} opacity={0.5}>
                    <RandomizedLight amount={8} position={[20, 30, 20]} />
                </AccumulativeShadows>
            </Canvas>
        </div>
    )
}
