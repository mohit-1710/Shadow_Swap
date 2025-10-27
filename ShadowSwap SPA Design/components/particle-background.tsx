"use client"

import { useEffect, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Points, PointMaterial } from "@react-three/drei"
import * as THREE from "three"

interface ParticleProps {
  count?: number
}

function ParticleSystem({ count = 5000 }: ParticleProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const particlesRef = useRef<Float32Array | null>(null)
  const velocityRef = useRef<Float32Array | null>(null)
  const { size } = useThree()

  useEffect(() => {
    if (!pointsRef.current) return

    // Initialize particles
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100
      positions[i + 1] = (Math.random() - 0.5) * 100
      positions[i + 2] = (Math.random() - 0.5) * 100

      velocities[i] = (Math.random() - 0.5) * 0.5
      velocities[i + 1] = (Math.random() - 0.5) * 0.5
      velocities[i + 2] = (Math.random() - 0.5) * 0.5
    }

    particlesRef.current = positions
    velocityRef.current = velocities

    if (pointsRef.current.geometry) {
      pointsRef.current.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    }
  }, [count])

  useFrame(() => {
    if (!pointsRef.current || !particlesRef.current || !velocityRef.current) return

    const positions = particlesRef.current
    const velocities = velocityRef.current

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += velocities[i]
      positions[i + 1] += velocities[i + 1]
      positions[i + 2] += velocities[i + 2]

      // Wrap around boundaries
      if (positions[i] > 50) positions[i] = -50
      if (positions[i] < -50) positions[i] = 50
      if (positions[i + 1] > 50) positions[i + 1] = -50
      if (positions[i + 1] < -50) positions[i + 1] = 50
      if (positions[i + 2] > 50) positions[i + 2] = -50
      if (positions[i + 2] < -50) positions[i + 2] = 50
    }

    if (pointsRef.current.geometry) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <Points ref={pointsRef} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#ffd700" size={0.15} sizeAttenuation={true} />
    </Points>
  )
}

export function ParticleBackground() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ParticleSystem count={5000} />
      </Canvas>
    </div>
  )
}
