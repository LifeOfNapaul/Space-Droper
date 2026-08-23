import { createXRStore } from '@react-three/xr'

// light-estimation must be in optionalFeatures — it is not a first-class store option.
// dom-overlay lets our ModelPicker and HUD render on top of the AR passthrough.
export const store = createXRStore({
  customSessionInit: {
    requiredFeatures: ['local'],
    optionalFeatures: ['hit-test', 'light-estimation', 'dom-overlay'],
    domOverlay: { root: document.body },
  },
})
