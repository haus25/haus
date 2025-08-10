'use client'

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Float, MeshDistortMaterial, Sphere, Box } from '@react-three/drei'
import * as THREE from 'three'

// Underground geometric disruption - floating chaos cube
function ChaosGeometry({ position = [0, 0, 0] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.02
      meshRef.current.rotation.z += 0.005
      // subtle floating disruption
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.1}>
      <Box ref={meshRef} position={position} args={[0.5, 0.5, 0.5]}>
        <MeshDistortMaterial
          color="#ff0000"
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0.8}
        />
      </Box>
    </Float>
  )
}

// Bauhaus disruption sphere - pure geometric rebellion
function DisruptionSphere({ position = [0, 0, 0] }) {
  const sphereRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3
      sphereRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  return (
    <Sphere ref={sphereRef} position={position} args={[0.3, 16, 16]}>
      <MeshDistortMaterial
        color="#00ff00"
        attach="material"
        distort={0.4}
        speed={1.5}
        wireframe={true}
      />
    </Sphere>
  )
}

// 3D underground text - words that break free
function Underground3DText({ 
  text, 
  position = [0, 0, 0], 
  color = "#ffffff" 
}: { 
  text: string
  position?: [number, number, number]
  color?: string 
}) {
  const textRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.05}>
      <Text
        ref={textRef}
        position={position}
        fontSize={0.8}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {text.toLowerCase()}
      </Text>
    </Float>
  )
}

// Main underground 3D canvas - reality disruption engine
export function Underground3DCanvas({ 
  children, 
  className = "w-full h-64" 
}: { 
  children?: React.ReactNode
  className?: string 
}) {
  // Fallback for when WebGL is not available
  const [webglSupported, setWebglSupported] = React.useState(true)

  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebglSupported(false)
      }
    } catch (e) {
      setWebglSupported(false)
    }
  }, [])

  if (!webglSupported) {
    return (
      <div className={`${className} flex items-center justify-center bg-bauhaus-concrete/10`}>
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-bauhaus-red/20 mx-auto mb-4 transform rotate-45" />
          <p className="text-sm font-medium">3d elements require webgl</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        onCreated={(state) => {
          // Ensure proper initialization
          state.gl.setClearColor('#000000', 0)
        }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ff0000" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ff00" />
        
        {children}
        
        {/* Default underground elements */}
        <ChaosGeometry position={[-2, 0, 0]} />
        <DisruptionSphere position={[2, 0, 0]} />
      </Canvas>
    </div>
  )
}

// Exportable components for use throughout the app
export { ChaosGeometry, DisruptionSphere, Underground3DText }

// Underground button with 3D depth
export function Underground3DButton({ 
  children, 
  onClick, 
  className = "",
  disabled = false 
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        btn-underground 
        relative 
        overflow-hidden 
        transform-gpu 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span className="relative z-10">{children}</span>
      
      {/* 3D depth illusion with CSS */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-red-500/10 to-red-500/20 pointer-events-none" />
      
      {/* Underground texture overlay */}
      <div className="absolute inset-0 opacity-20 mix-blend-mode-multiply pointer-events-none">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-black/20 to-transparent skew-x-12" />
      </div>
    </button>
  )
}

// 3D floating card container
export function Underground3DCard({ 
  children, 
  className = "" 
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`
      live-element 
      handdrawn-box 
      bg-card 
      p-6 
      depth-moderate 
      hover:depth-dramatic
      transition-all 
      duration-300
      ${className}
    `}>
      {children}
      
      {/* Subtle 3D depth indicators */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full opacity-30" />
      <div className="absolute bottom-2 left-2 w-1 h-1 bg-green-500 rounded-full opacity-40" />
    </div>
  )
}
