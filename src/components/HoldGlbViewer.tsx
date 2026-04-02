import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'

interface HoldGlbViewerProps {
  glbUrl: string
  /** Wrapper around the Canvas (e.g. `h-full w-full` or fixed aspect container) */
  className?: string
}

export function HoldGlbViewer({ glbUrl, className }: HoldGlbViewerProps) {
  return (
    <div className={className ?? 'h-full w-full'}>
      <Canvas
        camera={{ position: [2, 2, 2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          }
        >
          <HoldModel glbUrl={glbUrl} />
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  )
}

function HoldModel({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl)
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} />
}
