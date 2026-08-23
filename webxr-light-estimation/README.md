# WebXR Light Estimation Testbed

A minimal React Three Fiber app for testing WebXR light estimation. Virtual objects placed in the room are lit by real-world lighting data, making them look like they physically belong in the scene.

---

## Stack

| Package | Version |
|---|---|
| `three` | ^0.169.0 |
| `@react-three/fiber` | ^8.17.10 |
| `@react-three/xr` | ^6.6.9 |
| `vite` + `@vitejs/plugin-basic-ssl` | ^5.4.0 / ^1.1.0 |

---

## Install & run

```bash
cd webxr-light-estimation
npm install
npm run dev
```

The dev server starts on `https://0.0.0.0:5173`.

---

## Testing on a phone over LAN (required)

WebXR AR only works over **HTTPS on a real Android device** — it will not run in a desktop browser or a sandboxed iframe.

1. **Find your laptop's LAN IP** (e.g. `192.168.1.42`):
   - Windows: `ipconfig` → IPv4 Address
   - macOS/Linux: `ifconfig` or `ip a`

2. **Open on your phone**: navigate to `https://192.168.1.42:5173`

3. **Accept the certificate warning**: the dev server uses a self-signed certificate
   (`@vitejs/plugin-basic-ssl`). Tap **Advanced → Proceed** (Chrome) to continue.
   > For a certificate your phone trusts without a warning, install [mkcert](https://github.com/FiloSottile/mkcert), run `mkcert -install && mkcert localhost 192.168.1.42`, then point `vite.config.js` at the generated `.pem` files.

4. **Tap "Enter AR"** — Chrome will ask for camera permission. Grant it.

5. **Slowly pan the phone** across a flat surface until the white ring reticle appears.

6. **Tap the reticle** to place an object. Objects alternate between a metallic sphere and a rough rounded box.

---

## The light-estimation toggle

The small HUD in the top-right corner shows the current lighting mode:

| Status | What's driving the light |
|---|---|
| 🟢 **Light estimation active** | `XREstimatedLight` — colour, intensity, and environment reflections come from the real room |
| 🟠 **Fallback (forced off)** | Plain ambient + directional light, no probe data |
| 🟠 **Fallback (estimating…)** | The device hasn't produced a probe yet; fallback is in use |

Press **Force fallback / Use estimation** to toggle between modes without leaving AR. Because the metallic sphere shows specular reflections and the rough box shows diffuse ambient colour, both effects of estimation are immediately visible.

---

## Project layout

```
src/
├── ar/
│   ├── LightEstimation.jsx   # XREstimatedLight wiring — the core research component
│   ├── HitTestReticle.jsx    # useXRHitTest + reticle mesh
│   └── PlacedObjects.jsx     # Sphere (metallic) + rounded box (rough), PBR materials
├── hud/
│   └── StatusHUD.jsx         # Status indicator + estimation toggle button
├── scene/
│   └── ARScene.jsx           # <Canvas> + <XR>, bridges Canvas↔DOM state
├── store/
│   └── xrStore.js            # createXRStore with light-estimation in optionalFeatures
├── App.jsx                   # Landing screen + HUD mount, XR session subscription
├── main.jsx                  # React root
└── index.css                 # Global reset
```

---

## Device requirements

- Android 9+ with **Chrome 90+**
- ARCore installed and up to date
- Light estimation support varies by device; the HUD status will show "estimating…" until a probe is available (typically 1–3 seconds after the session starts)
- iOS / Safari: WebXR AR is not supported as of 2025
