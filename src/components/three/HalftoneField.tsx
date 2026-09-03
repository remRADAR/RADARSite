"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main(){
    float aspect = uRes.x / max(uRes.y, 1.0);
    float t = uTime * 0.05;

    // Halftone cell grid in pixel space.
    float dotSize = 11.0;
    vec2 px = vUv * uRes;
    vec2 cid = floor(px / dotSize);
    vec2 cuv = fract(px / dotSize) - 0.5;

    // Sample the flowing field at each cell centre.
    vec2 sp = (cid * dotSize) / uRes;
    sp.x *= aspect;
    float n = fbm(sp * 3.2 + vec2(t, -t * 0.6));

    // Pointer ripple.
    vec2 ptr = uPointer; ptr.x *= aspect;
    float dp = distance(sp, ptr);
    n += 0.45 * exp(-dp * 4.5);

    float radius = clamp(n, 0.0, 1.0) * 0.72;
    float dist = length(cuv);
    float dot = smoothstep(radius, radius - 0.09, dist);

    vec3 ink = vec3(0.047);
    vec3 flare = vec3(1.0, 0.231, 0.0);
    vec3 col = mix(ink, flare, smoothstep(0.62, 0.95, n));

    float alpha = dot * 0.55;
    gl_FragColor = vec4(col, alpha);
  }
`;

function Field() {
  const { gl } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pointer = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    []
  );

  // Mutating uniform values every frame is the standard, correct R3F render
  // loop — these are imperative GPU objects, not React state.
  /* eslint-disable react-hooks/immutability */
  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    // Read the real drawing buffer each frame — robust against
    // resize-observer timing issues.
    uniforms.uRes.value.set(gl.domElement.width, gl.domElement.height);
    // state.pointer is -1..1; map to 0..1, eased toward target.
    const tx = state.pointer.x * 0.5 + 0.5;
    const ty = state.pointer.y * 0.5 + 0.5;
    pointer.current.x += (tx - pointer.current.x) * 0.06;
    pointer.current.y += (ty - pointer.current.y) * 0.06;
    uniforms.uPointer.value.copy(pointer.current);
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}

/**
 * Full-viewport animated halftone dot field — the signature WebGL moment.
 * A flowing FBM noise field rendered as a grid of ink/flare dots that swell
 * and ripple under the pointer. Rendered only through SceneGate.
 */
export function HalftoneField() {
  return (
    <Canvas
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      style={{ width: "100%", height: "100%" }}
    >
      <Field />
    </Canvas>
  );
}
