import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import {
  BMWScene,
  SPOILER_OPTIONS,
  type ModFlags,
} from '../components/configurator/BMWScene'

const vehicles = [
  {
    id: 'bmw-m3',
    label: 'BMW M3 Sedan (F80)',
    available: true,
  },
  {
    id: 'audi-rs5',
    label: 'Audi RS 5 — coming soon',
    available: false,
  },
  {
    id: 'mercedes-c63',
    label: 'Mercedes-AMG C63 — coming soon',
    available: false,
  },
] as const

const modList: { key: Exclude<keyof ModFlags, 'spoiler'>; label: string }[] =
  [
    { key: 'frontLip', label: 'Front lip' },
    { key: 'sideSkirts', label: 'Side skirts' },
    { key: 'rearDiffuser', label: 'Rear diffuser' },
  ]

export function Configurator() {
  const [vehicleId, setVehicleId] = useState<string>('bmw-m3')
  const [mods, setMods] = useState<ModFlags>({
    spoiler: 'none',
    frontLip: false,
    sideSkirts: false,
    rearDiffuser: false,
  })

  const selected = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicleId],
  )

  const showScene = selected?.available === true

  function toggleMod(key: Exclude<keyof ModFlags, 'spoiler'>) {
    setMods((m) => ({ ...m, [key]: !m[key] }))
  }

  return (
    <div className="config-page">
      <div className="config-canvas-wrap">
        {showScene ? (
          <Canvas
            className="r3f-canvas"
            shadows
            camera={{ position: [4.2, 1.8, 5.2], fov: 42 }}
            gl={{ antialias: true, alpha: false }}
          >
            <color attach="background" args={['#f5f5f7']} />
            <BMWScene flags={mods} />
          </Canvas>
        ) : (
          <div className="canvas-loader canvas-loader--light">
            <p style={{ maxWidth: 320, textAlign: 'center', padding: '0 1rem' }}>
              {selected?.label}
            </p>
          </div>
        )}
      </div>
      <aside className="config-panel">
        <div>
          <h1>Build your look</h1>
          <p className="lead">
            Pick your car, then toggle aero and styling parts. Drag the 3D view
            to orbit — similar to building a kit on Nike By You.
          </p>
        </div>
        <div>
          <span className="field-label">Vehicle</span>
          <select
            className="select"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            aria-label="Vehicle model"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="field-label">Rear spoiler</span>
          <select
            className="select"
            value={mods.spoiler}
            onChange={(e) =>
              setMods((m) => ({
                ...m,
                spoiler: e.target.value as ModFlags['spoiler'],
              }))
            }
            disabled={!showScene}
            aria-label="Rear spoiler option"
          >
            {SPOILER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="field-label">Other styling parts</span>
          <div className="mod-grid">
            {modList.map(({ key, label }) => (
              <label key={key} className="mod-option">
                <input
                  type="checkbox"
                  checked={mods[key]}
                  onChange={() => toggleMod(key)}
                  disabled={!showScene}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <p className="config-hint">
          Car: <code>public/models/bmw-m3/bmw3.glb</code>. Universal spoiler:{' '}
          <code>public/models/parts/universal-spoiler-2.glb</code>. Adjust
          position in code if it does not sit flush on your body.
        </p>
      </aside>
    </div>
  )
}
