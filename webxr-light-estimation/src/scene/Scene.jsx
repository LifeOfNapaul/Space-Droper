import { useRef, useCallback, useEffect, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Quaternion, Euler, Vector3, MathUtils, DoubleSide } from 'three'
import { PlacedObjects } from '../objects/PlacedObjects.jsx'

// ─── Device orientation → camera rotation ────────────────────────────────────
// Rotates the device frame so the camera looks out the back of the phone.
// Matches the formula used in Three.js DeviceOrientationControls.
const Q_DEVICE_TO_WORLD = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

function DeviceOrientationCamera({ onGyroStatus }) {
  const { camera } = useThree()
  const quatRef = useRef(null)

  useEffect(() => {
    const euler   = new Euler()
    const q       = new Quaternion()
    const zAxis   = new Vector3(0, 0, 1)
    const screenQ = new Quaternion()
    let   gotData = false
    let   activeEvent = null

    function onOrientation({ alpha, beta, gamma }) {
      // beta and gamma come from accelerometer+gyroscope — always available
      // alpha comes from magnetometer (compass) — null on many budget phones, that's ok
      if (beta === null || gamma === null) return

      if (!gotData) {
        gotData = true
        onGyroStatus?.('active')
      }

      // gamma must be negated — matches Three.js DeviceOrientationControls formula
      // alpha ?? 0: no compass means yaw starts at 0, which is fine for object placement
      euler.set(
        MathUtils.degToRad(beta),
        MathUtils.degToRad(alpha ?? 0),
        -MathUtils.degToRad(gamma),
        'YXZ',
      )
      q.setFromEuler(euler)
      q.multiply(Q_DEVICE_TO_WORLD)

      const screenAngle = window.screen?.orientation?.angle ?? window.orientation ?? 0
      screenQ.setFromAxisAngle(zAxis, -MathUtils.degToRad(screenAngle))
      q.multiply(screenQ)

      quatRef.current = q.clone()
    }

    // Use relative deviceorientation — works on all devices including those without
    // a magnetometer. Alpha starts at 0 (relative to when page loaded) which is
    // fine for object placement; compass accuracy isn't needed here.
    window.addEventListener('deviceorientation', onOrientation, true)
    return () => window.removeEventListener('deviceorientation', onOrientation, true)
  }, [onGyroStatus])

  useFrame(() => {
    if (quatRef.current) camera.quaternion.copy(quatRef.current)
  })

  return null
}

// ─── Invisible placement surface ─────────────────────────────────────────────
// Floats 2 m in front of the camera, always facing it.
// onPointerDown gives us both world-space position (e.point) and the camera
// quaternion at tap time — images use the quaternion so they face you when placed.
function PlacementSurface({ onPlace }) {
  const ref = useRef()
  const { camera } = useThree()
  const dir = useRef(new Vector3())

  useFrame(() => {
    if (!ref.current) return
    dir.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
    ref.current.position.copy(camera.position).addScaledVector(dir.current, 2)
    ref.current.quaternion.copy(camera.quaternion)
  })

  return (
    <mesh
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation()
        // Pass position + camera orientation so image planes can face you at placement time
        onPlace(e.point.clone(), camera.quaternion.clone())
      }}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} />
    </mesh>
  )
}

// ─── Gyro debug overlay ───────────────────────────────────────────────────────
function GyroDebug() {
  const [abs, setAbs] = useState(null)
  const [rel, setRel] = useState(null)

  useEffect(() => {
    const fmt = (v) => v?.toFixed(1) ?? 'null'
    const absH = ({ alpha, beta, gamma }) => setAbs(`α:${fmt(alpha)} β:${fmt(beta)} γ:${fmt(gamma)}`)
    const relH = ({ alpha, beta, gamma }) => setRel(`α:${fmt(alpha)} β:${fmt(beta)} γ:${fmt(gamma)}`)
    window.addEventListener('deviceorientationabsolute', absH, true)
    window.addEventListener('deviceorientation', relH, true)
    return () => {
      window.removeEventListener('deviceorientationabsolute', absH, true)
      window.removeEventListener('deviceorientation', relH, true)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', bottom: '5rem', left: '0.75rem',
      background: 'rgba(0,0,0,0.7)', color: '#0f0', fontSize: '0.62rem',
      padding: '0.35rem 0.7rem', borderRadius: '0.4rem', zIndex: 20,
      fontFamily: 'monospace', lineHeight: 1.6,
    }}>
      <div>abs: {abs ?? 'no event'}</div>
      <div>rel: {rel ?? 'no event'}</div>
    </div>
  )
}

// ─── Scene root ───────────────────────────────────────────────────────────────
export function Scene({ placedItems, onPlace, onGyroStatus }) {
  const handlePlace = useCallback((pos, quat) => onPlace(pos, quat), [onPlace])

  return (
    <>
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 70, near: 0.01, far: 1000, position: [0, 0, 0] }}
        style={{ position: 'fixed', inset: 0, zIndex: 1 }}
      >
        <DeviceOrientationCamera onGyroStatus={onGyroStatus} />
        <PlacementSurface onPlace={handlePlace} />

        <ambientLight intensity={1.4} />
        <directionalLight position={[1, 3, 2]} intensity={1.2} />

        <PlacedObjects placedItems={placedItems} />
      </Canvas>
      <GyroDebug />
    </>
  )
}
