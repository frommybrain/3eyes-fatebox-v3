// Lights.jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

export default function Lights() {
  const dirLightRef = useRef();
  

  return (
    <>
      {/* Directional light (sun) */}
      <directionalLight
        position={[50, 50, 70]}
        intensity={1.0}
        color={0xffffff}
        castShadow
      />

      {/* Ambient fill light */}
      <ambientLight intensity={1} />
    </>
  );
}
