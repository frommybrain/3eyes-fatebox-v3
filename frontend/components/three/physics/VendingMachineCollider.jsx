// components/three/physics/VendingMachineCollider.jsx
// Trimesh collider for vending machine using @react-three/rapier
'use client'

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, TrimeshCollider } from '@react-three/rapier'

export function VendingMachineCollider() {
    const { nodes } = useGLTF('/models/vendingMachine_hole.glb')

    // Extract vertices and indices from geometry for trimesh
    const colliderData = useMemo(() => {
        // Use the body mesh for collision (it's the main solid part)
        const geometry = nodes.vm_body_Baked?.geometry
        if (!geometry) return null

        const position = geometry.attributes.position
        const index = geometry.index

        // Get vertices as Float32Array
        const vertices = new Float32Array(position.count * 3)
        for (let i = 0; i < position.count; i++) {
            vertices[i * 3] = position.getX(i)
            vertices[i * 3 + 1] = position.getY(i)
            vertices[i * 3 + 2] = position.getZ(i)
        }

        // Get indices as Uint32Array
        let indices
        if (index) {
            indices = new Uint32Array(index.array)
        } else {
            // Non-indexed geometry - create sequential indices
            indices = new Uint32Array(position.count)
            for (let i = 0; i < position.count; i++) {
                indices[i] = i
            }
        }

        return { vertices, indices }
    }, [nodes])

    if (!colliderData) return null

    return (
        <RigidBody type="fixed" colliders={false}>
            <TrimeshCollider
                args={[colliderData.vertices, colliderData.indices]}
                friction={0.5}
                restitution={0.3}
            />
        </RigidBody>
    )
}
