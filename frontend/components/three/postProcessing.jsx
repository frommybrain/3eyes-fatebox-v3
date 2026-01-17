import * as THREE from "three/webgpu";
import {
  pass,
  mrt,
  output,
  transformedNormalView,
  metalness,
  emissive,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export function PostProcessing({
  strength = 2.5,
  radius = 0.5,
  quality = "default",
}) {
  const { gl: renderer, scene, camera, size } = useThree();
  const postProcessingRef = useRef(null);

  useEffect(() => {
    if (!renderer || !scene || !camera) return;

    // Create post-processing setup
    const scenePass = pass(scene, camera, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    // Setup Multiple Render Targets (MRT)
    scenePass.setMRT(
      mrt({
        output: output,
        normal: transformedNormalView,
        metalness: metalness,
        emissive: emissive,
      })
    );

    // Get texture nodes
    const scenePassColor = scenePass.getTextureNode("output");
    const scenePassEmissive = scenePass.getTextureNode("emissive");

    // Create bloom pass (bloom from emissive)
    const bloomPass = bloom(scenePassEmissive, strength, radius, 0.6);

    // Final output: beauty + bloom
    const outputNode = scenePassColor.add(bloomPass);

    // Setup post-processing
    const postProcessing = new THREE.PostProcessing(renderer);
    postProcessing.outputNode = outputNode;
    postProcessingRef.current = postProcessing;

    // Handle resize
    if (postProcessingRef.current.setSize) {
      postProcessingRef.current.setSize(size.width, size.height);
      postProcessingRef.current.needsUpdate = true;
    }

    return () => {
      postProcessingRef.current = null;
    };
  }, [renderer, scene, camera, size, strength, radius, quality]);

  useFrame(({ gl }) => {
    if (postProcessingRef.current) {
      gl.clear();
      postProcessingRef.current.render();
    }
  }, 1);

  return null;
}
