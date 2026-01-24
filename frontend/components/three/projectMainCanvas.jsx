// components/three/projectMainCanvas.jsx
'use client'

import { useRef, useEffect, useState, memo } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, CameraControls } from '@react-three/drei'
import Lights from './lights'
import ProjectMainScene from './projectMainScene'
import usePurchasingStore from '@/store/usePurchasingStore'

// =============================================================================
// CAMERA ANIMATION STATE
// =============================================================================
// Uses global zustand store (usePurchasingStore) to coordinate camera animations.
// When purchasing=true (buy clicked), camera lerps to PURCHASING_POSITION.
// When purchasing=false (all boxes dropped), camera returns to BASE_POSITION.
// Subscription is silent (no re-renders) - uses zustand subscribe API.
// =============================================================================

// Timing configuration (in seconds/milliseconds)
const CAMERA_SMOOTH_TIME = 0.2          // Transition duration for camera movements (seconds)
const INTRO_DELAY_MS = 100              // Delay before intro animation starts (milliseconds)

// Base camera position and lookAt target (idle state)
const BASE_POSITION = [-1.89, 1, 2.53]
const BASE_LOOKAT = [0.01, 1.13, -0.09]

// Initial camera position (slightly offset for intro animation)
const INTRO_POSITION = [-3.5, 1.8, 5]
const INTRO_LOOKAT = [0.01, 1.0, -0.09]

// Purchasing camera position and lookAt target (during purchase)
const PURCHASING_POSITION = [-2, 1.1, -3]
const PURCHASING_LOOKAT = [0, 1, 0]

function CameraController({ cameraControlsRef, isReady }) {
    const hasPlayedIntro = useRef(false)

    // Silent subscription - no re-renders on state change
    useEffect(() => {
        if (!isReady) return

        const controls = cameraControlsRef.current
        if (!controls) return

        const moveCameraTo = (purchasing, animate = true) => {
            if (purchasing) {
                // Lerp to purchasing position when buy is clicked
                controls.setLookAt(
                    PURCHASING_POSITION[0], PURCHASING_POSITION[1], PURCHASING_POSITION[2],
                    PURCHASING_LOOKAT[0], PURCHASING_LOOKAT[1], PURCHASING_LOOKAT[2],
                    animate
                )
            } else {
                // Lerp back to base position when all boxes have dropped
                controls.setLookAt(
                    BASE_POSITION[0], BASE_POSITION[1], BASE_POSITION[2],
                    BASE_LOOKAT[0], BASE_LOOKAT[1], BASE_LOOKAT[2],
                    animate
                )
            }
        }

        // Play intro animation on first load
        if (!hasPlayedIntro.current) {
            hasPlayedIntro.current = true

            // Start at intro position (no animation)
            controls.setLookAt(
                INTRO_POSITION[0], INTRO_POSITION[1], INTRO_POSITION[2],
                INTRO_LOOKAT[0], INTRO_LOOKAT[1], INTRO_LOOKAT[2],
                false
            )

            // After a brief delay, animate to base position
            setTimeout(() => {
                if (!usePurchasingStore.getState().purchasing) {
                    controls.setLookAt(
                        BASE_POSITION[0], BASE_POSITION[1], BASE_POSITION[2],
                        BASE_LOOKAT[0], BASE_LOOKAT[1], BASE_LOOKAT[2],
                        true
                    )
                }
            }, INTRO_DELAY_MS)
        }

        // Subscribe to purchasing state changes without causing re-renders
        const unsubscribe = usePurchasingStore.subscribe(
            (state) => moveCameraTo(state.purchasing, true)
        )

        return unsubscribe
    }, [cameraControlsRef, isReady])

    return null
}

// Memoized to prevent re-renders when parent (ProjectPage) re-renders
const ProjectMainCanvas = memo(function ProjectMainCanvas({ onReady }) {
    const cameraControlsRef = useRef(null)
    const [controlsReady, setControlsReady] = useState(false)

    // Callback when CameraControls ref is set
    const handleControlsRef = (controls) => {
        cameraControlsRef.current = controls
        if (controls) {
            setControlsReady(true)
            // Notify parent that canvas is ready
            if (onReady) onReady()
        }
    }

    return (
        <div className="fixed top-0 right-0 w-2/3 h-screen z-10">
            <Canvas
                shadows
                dpr={[0.8, 2]}
            >
                <color attach="background" args={['#e7e7e7']} />
                <fog attach="fog" args={['#e7e7e7', 1, 40]} />
                <ProjectMainScene />
                <Lights />
                <PerspectiveCamera
                    makeDefault
                    position={BASE_POSITION}
                    fov={55}
                    near={0.1}
                    far={100}
                />
                <CameraControls
                    ref={handleControlsRef}
                    smoothTime={CAMERA_SMOOTH_TIME}
                    enabled={false}
                />
                <CameraController cameraControlsRef={cameraControlsRef} isReady={controlsReady} />

            </Canvas>
        </div>
    )
})

export default ProjectMainCanvas
