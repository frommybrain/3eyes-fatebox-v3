// Lights.jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

export default function Lights() {
  const dirLightRef = useRef();
  

  return (
    <>
      {/* Directional light (sun) */}
      <directionalLight
        position={[50, 50, 70]}
        intensity={1.1}
        color={0xffffff}
        castShadow
      />

      {/* Ambient fill light */}
      {/*<ambientLight intensity={1} />*/}
      <Environment files="/images/comfy_cafe_1k.jpg" environmentIntensity={0.65} />
    </>
  );
}
