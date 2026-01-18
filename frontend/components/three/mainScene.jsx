// components/three/mainScene.jsx
'use client'

import Floor from "./floor"
import { VendingMachine } from "./vendingMachine"
import { DegenBoxLogo } from "./degenBoxLogo"

export default function MainScene() {

    return (
        <>
            <VendingMachine />
            <DegenBoxLogo />
            <Floor size={100} />
        </>

    )
}
