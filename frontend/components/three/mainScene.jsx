// components/three/mainScene.jsx
'use client'

import { SoftShadows, Stage } from "@react-three/drei"
import Floor from "./floor"
import { VendingMachine } from "./vendingMachine"

export default function MainScene() {

    return (
        <>

                <VendingMachine />
                <Floor size={100} />
        </>

    )
}
