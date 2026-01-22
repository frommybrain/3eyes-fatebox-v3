// components/three/projectMainScene.jsx
'use client'

import { Physics, RigidBody, CuboidCollider, TrimeshCollider } from '@react-three/rapier'
import { Floor } from "./floor"
import { VendingMachine } from "./vendingMachine"
import { VendingMachineCollider } from "./physics/VendingMachineCollider"
import DroppingBoxManager from "./physics/DroppingBox"

export default function ProjectMainScene() {

    return (
        <Physics gravity={[0, -9.81, 0]}>
            {/* Vending machine visual */}
            <VendingMachine />

            {/* Vending machine physics collider (trimesh) */}
            <VendingMachineCollider />

            {/* Ground collider */}
            <RigidBody type="fixed" position={[0, -0.05, 0]}>
                <CuboidCollider args={[10, 0.05, 10]} />
            </RigidBody>

            {/* Visual floor */}
            <Floor />

            {/* Dropping boxes */}
            <DroppingBoxManager />
        </Physics>
    )
}
