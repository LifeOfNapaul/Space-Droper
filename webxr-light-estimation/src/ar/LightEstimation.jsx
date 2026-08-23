import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { XREstimatedLight } from 'three/examples/jsm/webxr/XREstimatedLight.js'

/**
 * Wires WebXR light estimation into the Three.js scene.
 *
 * XREstimatedLight hooks into the active WebXR session via the renderer (gl.xr).
 * When the device produces a light probe it fires 'estimationstart' — we add the
 * light to the scene and set scene.environment to its PMREMTexture so all PBR
 * materials pick up real-world ambient colour and reflections.
 *
 * forceOff lets the HUD toggle override estimation mid-session so the difference
 * between real and fallback lighting is immediately visible for comparison.
 */
export function LightEstimation({ forceOff, onStatusChange }) {
  const gl    = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  // Mutable box shared between effects without triggering re-renders
  const state = useRef({ estimating: false, xrLight: null, forceOff })

  // ── Create XREstimatedLight and bind estimation events ─────────────────────
  useEffect(() => {
    const xrLight = new XREstimatedLight(gl)
    state.current.xrLight = xrLight

    const applyLight = () => {
      scene.add(xrLight)
      // environment is a PMREMTexture built from the real-world light probe
      if (xrLight.environment) scene.environment = xrLight.environment
    }

    const removeLight = () => {
      scene.remove(xrLight)
      scene.environment = null
    }

    const onStart = () => {
      state.current.estimating = true
      onStatusChange('active')
      if (!state.current.forceOff) applyLight()
    }

    const onEnd = () => {
      state.current.estimating = false
      onStatusChange('inactive')
      removeLight()
    }

    xrLight.addEventListener('estimationstart', onStart)
    xrLight.addEventListener('estimationend',   onEnd)

    return () => {
      xrLight.removeEventListener('estimationstart', onStart)
      xrLight.removeEventListener('estimationend',   onEnd)
      removeLight()
      state.current.xrLight = null
    }
  }, [gl, scene, onStatusChange])

  // ── React to forceOff toggle while a session is live ───────────────────────
  useEffect(() => {
    state.current.forceOff = forceOff
    const { xrLight, estimating } = state.current
    if (!xrLight || !estimating) return

    if (forceOff) {
      scene.remove(xrLight)
      scene.environment = null
    } else {
      scene.add(xrLight)
      if (xrLight.environment) scene.environment = xrLight.environment
    }
  }, [forceOff, scene])

  return null
}
