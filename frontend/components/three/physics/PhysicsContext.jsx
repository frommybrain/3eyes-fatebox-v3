// components/three/physics/PhysicsContext.jsx
// Shared physics world context for bounce physics
'use client'

import { createContext, useContext, useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { World } from '@perplexdotgg/bounce'

// Physics configuration
const GRAVITY = { x: 0, y: -9.81, z: 0 }
const FIXED_TIME_STEP = 1 / 60
const MAX_SUB_STEPS = 3

const PhysicsContext = createContext(null)

export function usePhysics() {
    const context = useContext(PhysicsContext)
    if (!context) {
        throw new Error('usePhysics must be used within a PhysicsProvider')
    }
    return context
}

export function PhysicsProvider({ children }) {
    const worldRef = useRef(null)
    const accumulatorRef = useRef(0)
    const isActiveRef = useRef(false)

    // Initialize world
    useEffect(() => {
        worldRef.current = new World({ gravity: GRAVITY })
        return () => {
            worldRef.current = null
        }
    }, [])

    // Step physics each frame
    useFrame((state, delta) => {
        if (!worldRef.current || !isActiveRef.current) return

        // Fixed timestep with accumulator for stable simulation
        accumulatorRef.current += delta

        let steps = 0
        while (accumulatorRef.current >= FIXED_TIME_STEP && steps < MAX_SUB_STEPS) {
            worldRef.current.takeOneStep(FIXED_TIME_STEP)
            accumulatorRef.current -= FIXED_TIME_STEP
            steps++
        }

        // Prevent accumulator from growing too large
        if (accumulatorRef.current > FIXED_TIME_STEP * MAX_SUB_STEPS) {
            accumulatorRef.current = 0
        }
    })

    // Reset world (create fresh world with new bodies)
    const resetWorld = useCallback(() => {
        worldRef.current = new World({ gravity: GRAVITY })
        accumulatorRef.current = 0
        return worldRef.current
    }, [])

    // Activate/deactivate physics stepping
    const setActive = useCallback((active) => {
        isActiveRef.current = active
    }, [])

    // Get current world
    const getWorld = useCallback(() => worldRef.current, [])

    const value = {
        getWorld,
        resetWorld,
        setActive,
        isActiveRef,
    }

    return (
        <PhysicsContext.Provider value={value}>
            {children}
        </PhysicsContext.Provider>
    )
}
