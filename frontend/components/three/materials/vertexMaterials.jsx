'use client'
// vertexMaterials.jsx - display geometry vertex colors via MeshStandardNodeMaterial
import { useEffect, useMemo } from 'react'
import { Fn, attribute, vec3, select, uniform } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { extend } from '@react-three/fiber'
import { usePalette, PALETTE_CONFIG } from '../../../lib/world/paletteManager'

extend(THREE)

export function useVertexColorMaterial() {
    const { paletteColors, baseColors } = usePalette()

    // 1. Create uniform nodes for BOTH Base (Source) and Palette (Target) colors
    // We use uniforms for everything now so we can tweak calibration at runtime
    const { baseUniforms, paletteUniforms } = useMemo(() => {
        const bases = PALETTE_CONFIG.map((c) => uniform(new THREE.Color(c.base.r, c.base.g, c.base.b)))
        const targets = PALETTE_CONFIG.map((c) => uniform(new THREE.Color(c.base.r, c.base.g, c.base.b)))
        return { baseUniforms: bases, paletteUniforms: targets }
    }, [])

    // 2. Update uniforms when React state changes (via Leva)
    useEffect(() => {
        PALETTE_CONFIG.forEach((_, i) => {
            // Update Targets
            if (paletteUniforms[i] && paletteColors[i]) {
                paletteUniforms[i].value.setRGB(paletteColors[i].r, paletteColors[i].g, paletteColors[i].b)
            }
            // Update Calibration Bases
            if (baseUniforms[i] && baseColors[i]) {
                baseUniforms[i].value.setRGB(baseColors[i].r, baseColors[i].g, baseColors[i].b)
            }
        })
    }, [paletteColors, baseColors, baseUniforms, paletteUniforms])

    // 3. Build the shader graph
    const vertexColorNode = useMemo(() => {
        const aColor = attribute('color', 'vec3')
        
        const colorFn = Fn(() => {
            // Calculate distance from vertex color to each dynamic base color
            const distances = baseUniforms.map(baseNode => aColor.sub(baseNode).length())

            // Recursively build the selection logic
            const pickClosest = (index) => {
                if (index === distances.length - 1) {
                    return paletteUniforms[index]
                }

                const currentDist = distances[index]
                
                // Compare current distance against all remaining distances
                let isSmallest = null
                // Optimization: compare in chunks or just chain?
                // For ~10 colors, chaining ANDs is fine.
                for (let i = index + 1; i < distances.length; i++) {
                    const check = currentDist.lessThanEqual(distances[i])
                    isSmallest = isSmallest ? isSmallest.and(check) : check
                }

                return select(
                    isSmallest,
                    paletteUniforms[index],
                    pickClosest(index + 1)
                )
            }

            return pickClosest(0)
        })
        
        return colorFn()
    }, [baseUniforms, paletteUniforms])

    return { vertexColorNode }
}

export function VertexMaterial({ roughness = 1, metalness = 0, side = THREE.DoubleSide } = {}) {
    const { vertexColorNode } = useVertexColorMaterial()

    return (
        <meshStandardNodeMaterial
            colorNode={vertexColorNode}
            roughness={roughness}
            metalness={metalness}
            side={side}
        />
    )
}
