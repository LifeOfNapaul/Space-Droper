import { useRef } from 'react'
import { Matrix4 } from 'three'
import { useXRHitTest } from '@react-three/xr'

/**
 * Tracks the nearest real surface and shows a ring where the user can place objects.
 * useXRHitTest runs every XR frame with the latest hit-test results.
 * 'viewer' = ray originates from the device camera, which is correct for phone AR.
 */
export function HitTestReticle({ onPositionUpdate }) {
  const reticleRef = useRef()
  const matrixRef  = useRef(new Matrix4())

  useXRHitTest((results, getWorldMatrix) => {
    if (!reticleRef.current) return

    if (results.length > 0) {
      // Fill matrixRef with the world-space pose of the detected surface
      getWorldMatrix(matrixRef.current, results[0])
      reticleRef.current.visible = true
      reticleRef.current.position.setFromMatrixPosition(matrixRef.current)
      onPositionUpdate(reticleRef.current.position)
    } else {
      reticleRef.current.visible = false
    }
  }, 'viewer')

  return (
    <mesh ref={reticleRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.08, 0.12, 32]} />
      <meshBasicMaterial color="white" transparent opacity={0.8} />
    </mesh>
  )
}
