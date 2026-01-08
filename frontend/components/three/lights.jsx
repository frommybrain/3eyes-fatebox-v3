// Lights.jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { TileShadowNode } from 'three/addons/tsl/shadows/TileShadowNode.js';
import { useThree } from '@react-three/fiber';

export default function Lights() {
  const dirLightRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    const light = dirLightRef.current;
    if (!light) return;

    // Standard directional light shadow settings (from your original MainScene)
    light.castShadow = true;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 200;
    light.shadow.camera.right = 180;
    light.shadow.camera.left = -180;
    light.shadow.camera.top = 180;
    light.shadow.camera.bottom = -160;
    light.shadow.mapSize.set(1024 * 4, 1024 * 4);
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0;

    // Attach TileShadowNode for WebGPU-style tiled shadow mapping
    const tsm = new TileShadowNode(light, {
      tilesX: 2,
      tilesY: 2,
    });
    light.shadow.shadowNode = tsm;

    return () => {
      light.shadow.shadowNode = null;
    };
  }, []);

  return (
    <>
      {/* Directional light (sun) */}
      <directionalLight
        ref={dirLightRef}
        position={[-50, 50, 70]}
        intensity={1.0}
        color={0xffffff}
        castShadow
      />

      {/* Ambient fill light */}
      <ambientLight intensity={1} />
    </>
  );
}
