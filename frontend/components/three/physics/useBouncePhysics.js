// components/three/physics/useBouncePhysics.js
// Custom hook for bounce physics integration with React Three Fiber
'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { World } from '@perplexdotgg/bounce'

// Physics configuration
const GRAVITY = { x: 0, y: -9.81, z: 0 }
const TIME_STEP = 1 / 60

export function useBounceWorld() {
    const worldRef = useRef(null)

    // Initialize world on mount
    useEffect(() => {
        worldRef.current = new World({ gravity: GRAVITY })
        return () => {
            worldRef.current = null
        }
    }, [])

    // Step physics each frame
    useFrame(() => {
        if (worldRef.current) {
            worldRef.current.takeOneStep(TIME_STEP)
        }
    })

    return worldRef
}

export function useDynamicBox(worldRef, options = {}) {
    const {
        width = 0.5,
        height = 0.5,
        depth = 0.5,
        mass = 1,
        position = { x: 0, y: 0, z: 0 },
        friction = 0.5,
        restitution = 0.3,
    } = options

    const bodyRef = useRef(null)
    const meshRef = useRef(null)

    // Create body when world is ready
    useEffect(() => {
        if (!worldRef.current) return

        const world = worldRef.current
        const shape = world.createBox({ width, height, depth })

        bodyRef.current = world.createDynamicBody({
            shape,
            position,
            mass,
            friction,
            restitution,
        })

        return () => {
            // Cleanup body if needed
            bodyRef.current = null
        }
    }, [worldRef.current, width, height, depth, mass, position.x, position.y, position.z, friction, restitution])

    // Sync mesh position with physics body each frame
    useFrame(() => {
        if (bodyRef.current && meshRef.current) {
            const pos = bodyRef.current.position
            const rot = bodyRef.current.rotation

            meshRef.current.position.set(pos.x, pos.y, pos.z)
            meshRef.current.quaternion.set(rot.x, rot.y, rot.z, rot.w)
        }
    })

    const reset = useCallback((newPosition) => {
        if (bodyRef.current) {
            bodyRef.current.position = newPosition || position
            bodyRef.current.linearVelocity = { x: 0, y: 0, z: 0 }
            bodyRef.current.angularVelocity = { x: 0, y: 0, z: 0 }
        }
    }, [position])

    return { meshRef, bodyRef, reset }
}

export function useStaticBox(worldRef, options = {}) {
    const {
        width = 10,
        height = 0.1,
        depth = 10,
        position = { x: 0, y: 0, z: 0 },
        friction = 0.5,
        restitution = 0.3,
    } = options

    const bodyRef = useRef(null)

    useEffect(() => {
        if (!worldRef.current) return

        const world = worldRef.current
        const shape = world.createBox({ width, height, depth })

        bodyRef.current = world.createStaticBody({
            shape,
            position,
            friction,
            restitution,
        })

        return () => {
            bodyRef.current = null
        }
    }, [worldRef.current, width, height, depth, position.x, position.y, position.z, friction, restitution])

    return bodyRef
}
