import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import {
  BMWScene,
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

const modList: { key: keyof ModFlags; label: string }[] = [
  { key: 'spoiler', label: 'Rear spoiler' },
  { key: 'frontLip', label: 'Front lip' },
  { key: 'sideSkirts', label: 'Side skirts' },
  { key: 'rearDiffuser', label: 'Rear diffuser' },
]

export function Configurator() {
  const [vehicleId, setVehicleId] = useState<string>('bmw-m3')
  const [mods, setMods] = useState<ModFlags>({
    spoiler: false,
    frontLip: false,
    sideSkirts: false,
    rearDiffuser: false,
  })

  const selected = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicleId],
  )

  const showScene = selected?.available === true

  function toggleMod(key: keyof ModFlags) {
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
          <span className="field-label">Styling parts</span>
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
          The car is loaded from <code>public/models/bmw-m3/bmw3.glb</code>{' '}
          (Blender export). Replace that file to update the 3D model. Add-on
          parts are placeholder geometry for layout.
        </p>
      </aside>
    </div>
  )
}
