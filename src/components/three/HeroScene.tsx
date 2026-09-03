"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function DistortedForm() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { x, y } = state.pointer;
    mesh.rotation.y += 0.0025;
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, y * 0.3, 0.03);
    mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, x * 0.2, 0.03);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.4, 4]} />
        <MeshDistortMaterial color="#c9743a" roughness={0.15} metalness={0.6} distort={0.35} speed={1.5} />
      </mesh>
    </Float>
  );
}

/**
 * R3F's default ResizeObserver-driven canvas sizing doesn't always fire
 * (seen consistently in this environment, canvas stuck at the browser's
 * default 300x150). Measuring the container directly and driving
 * `gl.setSize`/camera aspect ourselves sidesteps that entirely.
 */
function ManualResize() {
  const { gl, camera } = useThree();

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;

    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      gl.setSize(width, height, false);
      // Mutating the Three.js camera instance in place is the correct R3F
      // pattern here — it's an imperative scene-graph object, not React state.
      // eslint-disable-next-line react-hooks/immutability
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [gl, camera]);

  return null;
}

/**
 * Small ambient 3D accent for the hero corner — abstract, not a literal
 * illustration, low-key enough not to compete with the headline or photo.
 * Rendered only by SceneGate, which handles reduced-motion / mobile /
 * WebGL-support fallback.
 */
export function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 1.5]}>
      <ManualResize />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={1.4} color="#e2a25a" />
      <directionalLight position={[-3, -2, -2]} intensity={0.5} color="#2c3e47" />
      <Suspense fallback={null}>
        <DistortedForm />
      </Suspense>
    </Canvas>
  );
}
