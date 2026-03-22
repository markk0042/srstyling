import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Contact } from './pages/Contact'

const Configurator = lazy(() =>
  import('./pages/Configurator').then((m) => ({ default: m.Configurator })),
)

function ConfiguratorFallback() {
  return (
    <div
      className="config-page"
      style={{ placeItems: 'center', minHeight: '50vh', color: 'var(--muted)' }}
    >
      Loading configurator…
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/configure"
          element={
            <Suspense fallback={<ConfiguratorFallback />}>
              <Configurator />
            </Suspense>
          }
        />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  )
}
