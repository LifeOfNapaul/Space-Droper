/**
 * Shows the current lighting mode and lets the user toggle between
 * real-world estimation and a plain fallback — the core comparison for the research.
 */
export function StatusHUD({ status, forceOff, onToggle }) {
  const isLive = status === 'active' && !forceOff

  const label = isLive
    ? 'Light estimation active'
    : forceOff
      ? 'Fallback (forced)'
      : 'Awaiting estimation…'

  return (
    <div style={s.container}>
      <div style={s.row}>
        <span style={{ ...s.dot, background: isLive ? '#4caf50' : '#ff9800' }} />
        <span style={s.label}>{label}</span>
      </div>
      <button onClick={onToggle} style={s.toggle}>
        {forceOff ? 'Use estimation' : 'Force fallback'}
      </button>
    </div>
  )
}

const s = {
  container: {
    position: 'fixed',
    top: '5rem',       // sits below the ModelPicker strip
    right: '0.75rem',
    zIndex: 10,
    background: 'rgba(0,0,0,0.60)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '0.7rem',
    padding: '0.55rem 0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    minWidth: '10rem',
  },
  row: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  dot: {
    width: '0.45rem', height: '0.45rem',
    borderRadius: '50%', flexShrink: 0,
    transition: 'background 0.3s',
  },
  label:  { fontSize: '0.68rem', color: '#fff' },
  toggle: {
    fontSize: '0.65rem', fontWeight: 600,
    padding: '0.28rem 0.6rem',
    background: 'rgba(255,255,255,0.14)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: '0.35rem',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
}
