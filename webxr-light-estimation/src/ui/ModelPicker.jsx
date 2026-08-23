import { useRef } from 'react'

/**
 * Horizontal scrollable strip: built-in shapes, uploaded images/models, Upload button.
 * Image models show a real thumbnail preview; 3D models show an emoji icon.
 */
export function ModelPicker({ models, selectedId, onSelect, onUpload, uploading }) {
  const inputRef = useRef()

  return (
    <div style={styles.wrapper}>
      <div style={styles.scroll}>
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={m.id === selectedId ? { ...styles.card, ...styles.cardSelected } : styles.card}
          >
            {/* Image models show a real thumbnail; everything else shows an icon */}
            {m.type === 'image' && m.thumbnailUrl ? (
              <img
                src={m.thumbnailUrl}
                alt={m.name}
                style={styles.thumb}
              />
            ) : (
              <span style={styles.icon}>{ICONS[m.id] ?? '📦'}</span>
            )}
            <span style={styles.label} title={m.name}>
              {m.name.length > 8 ? m.name.slice(0, 7) + '…' : m.name}
            </span>
          </button>
        ))}

        {/* Upload button — accepts images AND 3D model files */}
        <button
          style={uploading ? { ...styles.uploadBtn, opacity: 0.5 } : styles.uploadBtn}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <span style={styles.icon}>{uploading ? '…' : '+'}</span>
          <span style={styles.label}>{uploading ? 'Loading' : 'Upload'}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.glb,.gltf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) onUpload(Array.from(e.target.files))
          e.target.value = ''
        }}
      />
    </div>
  )
}

const ICONS = { sphere: '⚪', box: '🟫' }

const styles = {
  wrapper: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingTop: 'env(safe-area-inset-top, 0.5rem)',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 80%, transparent)',
  },
  scroll: {
    display: 'flex',
    gap: '0.45rem',
    padding: '0.5rem 0.5rem 0.6rem',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    flexShrink: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.2rem',
    padding: '0.35rem 0.5rem',
    background: 'rgba(255,255,255,0.12)',
    border: '1.5px solid transparent',
    borderRadius: '0.65rem',
    color: '#fff',
    cursor: 'pointer',
    minWidth: '3.4rem',
  },
  cardSelected: {
    background: 'rgba(255,255,255,0.28)',
    border: '1.5px solid rgba(255,255,255,0.75)',
  },
  uploadBtn: {
    flexShrink: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.2rem',
    padding: '0.35rem 0.5rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px dashed rgba(255,255,255,0.4)',
    borderRadius: '0.65rem',
    color: '#fff',
    cursor: 'pointer',
    minWidth: '3.4rem',
  },
  thumb: {
    width: '2rem', height: '2rem',
    objectFit: 'cover',
    borderRadius: '0.3rem',
    display: 'block',
  },
  icon:  { fontSize: '1.2rem', lineHeight: 1 },
  label: { fontSize: '0.58rem', whiteSpace: 'nowrap', opacity: 0.85 },
}
