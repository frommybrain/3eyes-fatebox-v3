// components/three/physics/DroppingBox.jsx
// Spawns multiple boxes when purchasing - uses @react-three/rapier
'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useGLTF, useTexture, useKTX2 } from '@react-three/drei'
import * as THREE from 'three'
import usePurchasingStore from '@/store/usePurchasingStore'

// Box configurationusektx2
const DROP_POSITION = [0, 1.5, 0]
const SPAWN_DELAY_MS = 250 // Delay between spawning each box
const MAX_BOXES = 15 // Maximum boxes to keep in scene
const BOX_SCALE = 1 // Scale of the degen box model

// Single box component - receives shared geometry and material
function DroppedBox({ id, initialPosition, geometry, material }) {
    const rigidBodyRef = useRef(null)

    return (
        <RigidBody
            ref={rigidBodyRef}
            position={initialPosition}
            type="dynamic"
            colliders="cuboid"
            restitution={0.5}
            friction={0.1}
            mass={1}
            
        >
            <group scale={BOX_SCALE}>
                <mesh geometry={geometry} material={material} castShadow receiveShadow />
            </group>
        </RigidBody>
    )
}

// Preload the model
useGLTF.preload('/models/degenBox_box.glb')

export default function DroppingBoxManager() {
    const [boxes, setBoxes] = useState([])
    const boxIdCounter = useRef(0)
    const isProcessingRef = useRef(false)

    // Load model and texture ONCE at the manager level
    const { nodes } = useGLTF('/models/degenBox_box.glb')
    const boxTexture = useKTX2('/images/ktx2/degenBox_box_1k.ktx2')

    // Create shared material (memoized to prevent re-creation)
    const sharedMaterial = useMemo(() => {
        const texture = boxTexture.clone()
        texture.flipY = false
        texture.needsUpdate = true
        return new THREE.MeshStandardMaterial({ map: texture })
    }, [boxTexture])

    // Get shared geometry from loaded model
    const sharedGeometry = nodes.Box_Material001_0?.geometry

    // Process pending box drops with staggered timing
    const processDropQueue = useCallback(async () => {
        if (isProcessingRef.current) return
        isProcessingRef.current = true

        const checkAndSpawn = () => {
            const pending = usePurchasingStore.getState().pendingBoxDrops
            if (pending > 0) {
                // Consume one from queue
                usePurchasingStore.getState().consumeBoxDrop()

                // Spawn a new box with slight position randomness to avoid stacking
                const newBox = {
                    id: boxIdCounter.current++,
                    position: [
                        DROP_POSITION[0] + (Math.random() - 0.5) * 0.2,
                        DROP_POSITION[1],
                        DROP_POSITION[2] + (Math.random() - 0.5) * 0.2,
                    ],
                }

                setBoxes(prev => {
                    // Keep only the most recent boxes
                    const updated = [...prev, newBox]
                    if (updated.length > MAX_BOXES) {
                        return updated.slice(-MAX_BOXES)
                    }
                    return updated
                })

                // Schedule next spawn if more pending
                setTimeout(checkAndSpawn, SPAWN_DELAY_MS)
            } else {
                isProcessingRef.current = false
                // Note: endPurchasing is called automatically by consumeBoxDrop
                // when totalDropped reaches totalExpected
            }
        }

        checkAndSpawn()
    }, [])

    // Subscribe to pending box drops
    useEffect(() => {
        const unsubscribe = usePurchasingStore.subscribe((state, prevState) => {
            // When pendingBoxDrops increases, start processing
            if (state.pendingBoxDrops > 0 && !isProcessingRef.current) {
                processDropQueue()
            }
        })

        return unsubscribe
    }, [processDropQueue])

    // Don't render if geometry isn't loaded yet
    if (!sharedGeometry) return null

    return (
        <>
            {boxes.map(box => (
                <DroppedBox
                    key={box.id}
                    id={box.id}
                    initialPosition={box.position}
                    geometry={sharedGeometry}
                    material={sharedMaterial}
                />
            ))}
        </>
    )
}
