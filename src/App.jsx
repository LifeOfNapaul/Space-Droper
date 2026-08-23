import { useState, useCallback, useEffect } from 'react'
import { TextureLoader, SRGBColorSpace } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { store } from './store/xrStore.js'
import { CameraBackground } from './camera/CameraBackground.jsx'
import { Scene }    from './scene/Scene.jsx'
import { ARScene }  from './scene/ARScene.jsx'
import { ModelPicker } from './ui/ModelPicker.jsx'
import { StatusHUD }   from './ui/StatusHUD.jsx'

// ── Built-in primitive models ─────────────────────────────────────────────────
const BUILTIN_MODELS = [
  { id: 'sphere', name: 'Sphere', type: 'builtin' },
  { id: 'box',    name: 'Box',    type: 'builtin' },
]

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])
const MODEL_EXTS = new Set(['.glb', '.gltf'])
const extOf = (name) => name.slice(name.lastIndexOf('.')).toLowerCase()

// ── File loaders ─────────────────────────────────────────────────────────────

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    new TextureLoader().load(url, (tex) => {
      tex.colorSpace = SRGBColorSpace
      resolve({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''),
        type: 'image',
        texture: tex,
        aspectRatio: tex.image.width / tex.image.height,
        thumbnailUrl: url,
      })
    }, undefined, (err) => { URL.revokeObjectURL(url); reject(err) })
  })
}

function loadGLTF(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    new GLTFLoader().load(url, (gltf) => {
      URL.revokeObjectURL(url)
      resolve({ id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), type: 'uploaded', scene: gltf.scene })
    }, undefined, (err) => { URL.revokeObjectURL(url); reject(err) })
  })
}

function loadFile(file) {
  const ext = extOf(file.name)
  if (IMAGE_EXTS.has(ext)) return loadImage(file)
  if (MODEL_EXTS.has(ext)) return loadGLTF(file)
  return Promise.reject(new Error(`Unsupported type: ${ext}`))
}

// Shows a warning after 2s if no gyroscope data has arrived yet
function GyroWarn() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', top: '5rem', left: '0.75rem', right: '0.75rem',
      zIndex: 10, background: 'rgba(200,80,0,0.85)', color: '#fff',
      fontSize: '0.72rem', padding: '0.5rem 0.8rem', borderRadius: '0.5rem',
      textAlign: 'center', lineHeight: 1.4,
    }}>
      Gyroscope not detected — objects will stick to screen. Make sure you are on HTTPS and motion sensors are enabled.
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────
export default function App() {
  // WebXR detection
  const [xrSupported,  setXRSupported]  = useState(false)
  const [inXRSession,  setInXRSession]  = useState(false)

  // Camera fallback mode
  const [cameraRunning,    setCameraRunning]    = useState(false)
  const [orientationWarn,  setOrientationWarn]  = useState(false)
  const [gyroActive,       setGyroActive]       = useState(false)

  // Light estimation state (WebXR mode only)
  const [estimationStatus, setEstimationStatus] = useState('inactive')
  const [forceOff,         setForceOff]         = useState(false)

  // Shared state: models, selection, placed objects
  const [models,      setModels]      = useState(BUILTIN_MODELS)
  const [selectedId,  setSelectedId]  = useState('sphere')
  const [placedItems, setPlacedItems] = useState([])
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState(null)

  // ── Detect WebXR immersive-ar support on mount ────────────────────────────
  useEffect(() => {
    navigator.xr
      ?.isSessionSupported('immersive-ar')
      .then(setXRSupported)
      .catch(() => setXRSupported(false))
  }, [])

  // ── Track XR session start/end via the store ──────────────────────────────
  useEffect(() => {
    return store.subscribe((state) => setInXRSession(!!state.session))
  }, [])

  // ── Camera fallback: request permissions ─────────────────────────────────
  async function handleStartCamera() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })

      // iOS 13+ requires an explicit permission prompt for the gyroscope.
      // If denied, rotation tracking won't work and objects will not stay in place.
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const result = await DeviceOrientationEvent.requestPermission().catch(() => 'denied')
        if (result !== 'granted') setOrientationWarn(true)
      }

      setCameraRunning(true)
    } catch {
      setError('Camera access denied — please allow camera permission and reload.')
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (files) => {
    setUploading(true)
    for (const file of files) {
      try {
        const model = await loadFile(file)
        setModels((prev) => [...prev, model])
        setSelectedId(model.id)
      } catch (err) {
        console.error('Load failed:', file.name, err)
      }
    }
    setUploading(false)
  }, [])

  // ── Place selected model at tapped position ───────────────────────────────
  const handlePlace = useCallback((position, quaternion) => {
    const model = models.find((m) => m.id === selectedId)
    if (model) setPlacedItems((prev) => [...prev, { position, quaternion, model }])
  }, [models, selectedId])

  const handleClear = useCallback(() => setPlacedItems([]), [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const isActive      = inXRSession || cameraRunning
  const selectedName  = models.find((m) => m.id === selectedId)?.name ?? ''

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── WebXR canvas — always mounted when supported so the session can attach.
            Transparent + invisible until the session starts.                  */}
      {xrSupported && (
        <ARScene
          placedItems={placedItems}
          onPlace={handlePlace}
          forceOff={forceOff}
          onEstimationStatusChange={setEstimationStatus}
        />
      )}

      {/* ── Camera fallback — when camera mode is active (any device) ─────────── */}
      {cameraRunning && (
        <>
          <CameraBackground onError={setError} />
          <Scene placedItems={placedItems} onPlace={handlePlace} onGyroStatus={setGyroActive} />
        </>
      )}

      {/* ── Landing screen — shown until a session or camera starts ─────────── */}
      {!isActive && (
        <div style={s.landing}>
          <h1 style={s.heading}>SPACE DROPER</h1>
          <p style={s.sub}>Drop 3D photos and place them anywhere in a room</p>

          {error && <p style={s.error}>{error}</p>}

          {xrSupported ? (
            <>
              <button
                style={s.btn}
                onClick={() =>
                  store.enterAR().catch((err) => {
                    console.error('AR session failed:', err)
                    setError('Could not start AR — try enabling WebXR in your browser settings.')
                  })
                }
              >
                Enter AR
              </button>
              <button style={s.btnSecondary} onClick={handleStartCamera}>
                Use Camera Instead
              </button>
            </>
          ) : (
            <button style={s.btn} onClick={handleStartCamera}>Start Camera</button>
          )}

          <p style={s.note}>Camera permission required</p>
        </div>
      )}

      {/* ── Orientation warning (camera mode, iOS permission denied) ────────── */}
      {orientationWarn && cameraRunning && (
        <div style={s.orientWarn}>
          Gyroscope access denied — objects may not stay in place. Reload and allow motion permission.
        </div>
      )}

      {/* ── Gyro not firing warning ──────────────────────────────────────────── */}
      {cameraRunning && !gyroActive && !orientationWarn && (
        <GyroWarn onActive={() => setGyroActive(true)} />
      )}

      {/* ── Shared UI: model picker + bottom bar ────────────────────────────── */}
      {isActive && (
        <>
          <ModelPicker
            models={models}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpload={handleUpload}
            uploading={uploading}
          />
          <div style={s.bottomBar}>
            <span style={s.hint}>Tap to place · {selectedName}</span>
            {placedItems.length > 0 && (
              <button style={s.clearBtn} onClick={handleClear}>Clear all</button>
            )}
          </div>
        </>
      )}

      {/* ── Light estimation HUD — WebXR mode only ──────────────────────────── */}
      {inXRSession && (
        <StatusHUD
          status={estimationStatus}
          forceOff={forceOff}
          onToggle={() => setForceOff((v) => !v)}
        />
      )}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  landing: {
    position: 'fixed', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '0.8rem', background: '#0a0a0a', padding: '2rem', textAlign: 'center',
    zIndex: 20,
  },
  heading: {
    fontSize: '1.6rem', fontWeight: 700, color: '#fff',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  sub:   { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', maxWidth: '22rem', lineHeight: 1.5 },
  btn:   { marginTop: '1rem', padding: '0.85rem 3rem', fontSize: '1rem', fontWeight: 700,
           background: '#fff', color: '#000', border: 'none', borderRadius: '2rem', cursor: 'pointer' },
  btnSecondary: { padding: '0.6rem 2rem', fontSize: '0.85rem', fontWeight: 600,
                  background: 'transparent', color: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '2rem', cursor: 'pointer' },
  note:  { fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem' },
  error: { fontSize: '0.8rem', color: '#ff6b6b', maxWidth: '22rem' },
  bottomBar: {
    position: 'fixed', bottom: '1.5rem', left: 0, right: 0,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '0.75rem', zIndex: 10, pointerEvents: 'none',
  },
  hint: {
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    color: '#fff', fontSize: '0.8rem', padding: '0.4rem 1rem',
    borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.15)',
  },
  orientWarn: {
    position: 'fixed', top: '5rem', left: '0.75rem', right: '0.75rem',
    zIndex: 10, background: 'rgba(200,80,0,0.85)', color: '#fff',
    fontSize: '0.72rem', padding: '0.5rem 0.8rem', borderRadius: '0.5rem',
    textAlign: 'center', lineHeight: 1.4,
  },
  clearBtn: {
    background: 'rgba(255,60,60,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: 600,
    padding: '0.35rem 0.9rem', border: 'none', borderRadius: '2rem',
    cursor: 'pointer', pointerEvents: 'all',
  },
}
