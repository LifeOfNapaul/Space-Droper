import { useEffect, useRef, useState } from 'react'

/**
 * Renders the rear camera feed as a full-screen video element behind the canvas.
 * getUserMedia requires HTTPS (or localhost) — see README for LAN setup.
 *
 * We keep constraints minimal (just facingMode) so the browser picks the best
 * supported resolution. Requesting an exact resolution can reject on many Android
 * devices even though the camera is available.
 */
export function CameraBackground({ onError }) {
  const videoRef = useRef()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let stream = null

    async function start() {
      try {
        // Try rear camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch {
        try {
          // Fall back to any available camera if rear camera fails
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } catch (err) {
          console.error('Camera unavailable:', err)
          setFailed(true)
          onError?.('Camera access failed — please allow camera permission and reload.')
          return
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Some Android browsers need an explicit play() call
        videoRef.current.play().catch(() => {})
      }
    }

    start()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [onError])

  if (failed) return null

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
      }}
    />
  )
}
