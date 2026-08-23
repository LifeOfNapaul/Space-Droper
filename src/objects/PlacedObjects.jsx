import { useMemo } from 'react'
import { Box3, Vector3, DoubleSide } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Renders every item in placedItems.
 * Each item: { position: Vector3, quaternion: Quaternion, model: { type, ... } }
 *
 * type 'image'    → flat plane with the photo as a texture, oriented to face the
 *                   camera at the moment it was placed (uses item.quaternion)
 * type 'builtin'  → sphere or rounded box, orientation not meaningful so ignored
 * type 'uploaded' → cloned GLTF scene, auto-scaled to 0.25 m max dimension
 */
export function PlacedObjects({ placedItems }) {
  return (
    <>
      {placedItems.map((item, i) => (
        <PlacedItem
          key={i}
          position={item.position}
          quaternion={item.quaternion}
          model={item.model}
        />
      ))}
    </>
  )
}

function PlacedItem({ position, quaternion, model }) {
  if (model.type === 'image') {
    return (
      <ImagePlane
        position={position}
        quaternion={quaternion}
        texture={model.texture}
        aspectRatio={model.aspectRatio}
      />
    )
  }
  if (model.type === 'builtin') {
    return model.id === 'sphere'
      ? <MetallicSphere position={position} />
      : <RoughBox position={position} />
  }
  if (model.type === 'uploaded' && model.scene) {
    return <UploadedModel position={position} scene={model.scene} />
  }
  return null
}

// ── Image plane ──────────────────────────────────────────────────────────────
// Max dimension is capped at 0.5 m so both landscape and portrait photos look natural.
const MAX_DIM = 0.5

function ImagePlane({ position, quaternion, texture, aspectRatio }) {
  const [width, height] = aspectRatio >= 1
    ? [MAX_DIM, MAX_DIM / aspectRatio]   // landscape
    : [MAX_DIM * aspectRatio, MAX_DIM]   // portrait

  return (
    // quaternion = camera orientation captured at tap time → image faces you
    <mesh position={position} quaternion={quaternion}>
      <planeGeometry args={[width, height]} />
      {/*
        meshBasicMaterial ignores scene lighting so the photo keeps its
        original colours regardless of the ambient/directional lights above.
        DoubleSide makes it visible when you walk around behind it.
      */}
      <meshBasicMaterial map={texture} transparent side={DoubleSide} />
    </mesh>
  )
}

// ── Built-in shapes ──────────────────────────────────────────────────────────

function MetallicSphere({ position }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 32, 32]} />
      <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.05} />
    </mesh>
  )
}

function RoughBox({ position }) {
  const geo = useMemo(() => new RoundedBoxGeometry(0.12, 0.12, 0.12, 4, 0.025), [])
  return (
    <mesh position={position} geometry={geo}>
      <meshStandardMaterial color="#c8b89a" metalness={0.05} roughness={0.85} />
    </mesh>
  )
}

// ── Uploaded GLTF model ──────────────────────────────────────────────────────

function UploadedModel({ position, scene }) {
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    const box = new Box3().setFromObject(c)
    const size = box.getSize(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0.001) c.scale.multiplyScalar(0.25 / maxDim)
    return c
  }, [scene])

  return <primitive object={cloned} position={position} />
}
