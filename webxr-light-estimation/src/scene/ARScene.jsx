import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { XR, useXR } from '@react-three/xr'
import { store } from '../store/xrStore.js'
import { LightEstimation } from '../ar/LightEstimation.jsx'
import { HitTestReticle } from '../ar/HitTestReticle.jsx'
import { PlacedObjects } from '../objects/PlacedObjects.jsx'

/**
 * WebXR AR canvas.
 *
 * Mounting strategy: this Canvas is always rendered when WebXR is supported,
 * even before the session starts. It is transparent (gl.alpha) so it is invisible
 * on the landing screen. When store.enterAR() is called and the session starts,
 * the renderer attaches to the XR session automatically.
 *
 * Tap handling: we listen to the XR session's 'select' event (fired by screen
 * taps in handheld AR) rather than DOM click, because DOM pointer events are
 * unreliable on the canvas during an immersive session.
 */
export function ARScene({ placedItems, onPlace, forceOff, onEstimationStatusChange }) {
  const [estimationActive, setEstimationActive] = useState(false)
  const reticlePositionRef = useRef(null) // updated every frame by HitTestReticle
  const cameraRef          = useRef(null) // updated every frame by CameraSync

  const handleStatusChange = useCallback((status) => {
    setEstimationActive(status === 'active')
    onEstimationStatusChange(status)
  }, [onEstimationStatusChange])

  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      camera={{ near: 0.01, far: 100 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1 }}
      onCreated={({ gl, scene }) => {
        // Transparent clear so the WebXR camera passthrough shows through the canvas
        gl.setClearColor(0, 0, 0, 0)
        scene.background = null
      }}
    >
      <XR store={store}>
        <ARContent
          placedItems={placedItems}
          estimationActive={estimationActive}
          forceOff={forceOff}
          onStatusChange={handleStatusChange}
          reticlePositionRef={reticlePositionRef}
          cameraRef={cameraRef}
          onPlace={onPlace}
        />
      </XR>
    </Canvas>
  )
}

function ARContent({
  placedItems, estimationActive, forceOff,
  onStatusChange, reticlePositionRef, cameraRef, onPlace,
}) {
  const session     = useXR((s) => s.session)
  const { camera }  = useThree()
  const useFallback = !estimationActive || forceOff

  // Keep camera ref current so the select handler can read the quaternion
  useFrame(() => { cameraRef.current = camera })

  // XR 'select' fires on every screen tap in handheld AR
  useEffect(() => {
    if (!session) return
    const handleSelect = () => {
      if (!reticlePositionRef.current) return
      // Pass position + camera orientation so image planes face you at placement
      onPlace(
        reticlePositionRef.current.clone(),
        cameraRef.current?.quaternion.clone() ?? null,
      )
    }
    session.addEventListener('select', handleSelect)
    return () => session.removeEventListener('select', handleSelect)
  }, [session, onPlace, reticlePositionRef, cameraRef])

  return (
    <>
      {/* ── Fallback lighting — active when estimation is off or not yet available */}
      {useFallback && <ambientLight intensity={1.2} />}
      {useFallback && <directionalLight position={[1, 2, 1]} intensity={0.8} />}

      {/* ── Light estimation — replaces fallback with real-world probe data */}
      <LightEstimation forceOff={forceOff} onStatusChange={onStatusChange} />

      {/* ── Hit-test reticle — only meaningful inside an active XR session */}
      {session && (
        <HitTestReticle
          onPositionUpdate={(pos) => { reticlePositionRef.current = pos }}
        />
      )}

      <PlacedObjects placedItems={placedItems} />
    </>
  )
}
