import {
  Center,
  OrbitControls,
  Environment,
  Html,
  useGLTF,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type SpoilerChoice = 'none' | 'universal-spoiler-2'

export type ModFlags = {
  spoiler: SpoilerChoice
  frontLip: boolean
  sideSkirts: boolean
  rearDiffuser: boolean
}

/** Blender export — place file at `public/models/bmw-m3/bmw3.glb` */
export const GLB_URL = '/models/bmw-m3/bmw3.glb'

/** Universal rear spoiler add-on */
export const SPOILER_UNIVERSAL_URL = '/models/parts/universal-spoiler-2.glb'

export const SPOILER_OPTIONS: { id: SpoilerChoice; label: string }[] = [
  { id: 'none', label: 'No spoiler' },
  { id: 'universal-spoiler-2', label: 'Universal spoiler (rear)' },
]

const carbon = (
  <meshStandardMaterial
    color="#141414"
    metalness={0.55}
    roughness={0.38}
    envMapIntensity={0.9}
  />
)

const GLASS_NAME =
  /glass|window|windshield|mirror|headlight|tail.?light|taillight|lamp|indicator|fog|beam|sunroof|panorama|side.?glass|wiper/i

const DEBUG_GLTF_NORMALS =
  import.meta.env.VITE_GLTF_DEBUG_NORMALS === 'true'
const DEBUG_GLTF_MESH_LOG =
  import.meta.env.VITE_GLTF_DEBUG_MESH_LOG === 'true'

function eachMeshMaterial(
  mesh: THREE.Mesh,
  fn: (mat: THREE.Material) => void,
) {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  list.forEach((mat) => {
    if (mat) fn(mat)
  })
}

function passOpaqueDepthAlpha(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    eachMeshMaterial(child, (mat) => {
      mat.transparent = false
      mat.opacity = 1
      if ('alphaTest' in mat) {
        ;(mat as THREE.Material & { alphaTest: number }).alphaTest = 0
      }
      mat.depthWrite = true
      mat.depthTest = true
      mat.needsUpdate = true
    })
  })
}

function passDoubleSide(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    eachMeshMaterial(child, (mat) => {
      mat.side = THREE.DoubleSide
      mat.needsUpdate = true
    })
  })
}

function passDebugMeshNormalMaterial(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const mats = child.material
    if (Array.isArray(mats)) {
      child.material = mats.map(() => new THREE.MeshNormalMaterial())
    } else {
      child.material = new THREE.MeshNormalMaterial()
    }
  })
}

function passDebugLogMeshes(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    console.log('[GLTF mesh]', child.name || '(unnamed)', child)
  })
}

function fixPhysicalTransmission(mat: THREE.Material, meshName: string) {
  const nameSaysGlass = GLASS_NAME.test(meshName.toLowerCase())
  if (!(mat instanceof THREE.MeshPhysicalMaterial) || nameSaysGlass) return
  mat.transmission = 0
  mat.thickness = 0
  mat.attenuationDistance = Number.POSITIVE_INFINITY
  if (mat.envMapIntensity === 0) {
    mat.envMapIntensity = 1
  }
  mat.needsUpdate = true
}

function cloneMergedGltfScene(gltf: {
  scene: THREE.Object3D
  scenes?: THREE.Object3D[]
}): THREE.Group {
  const root = new THREE.Group()
  const scenes = gltf.scenes
  if (scenes && scenes.length > 1) {
    scenes.forEach((scene) => {
      root.add(scene.clone(true))
    })
  } else {
    root.add(gltf.scene.clone(true))
  }
  return root
}

function prepareGlbMesh(root: THREE.Object3D) {
  root.traverse((o) => {
    o.visible = true
  })

  root.traverse((child) => {
    if (child instanceof THREE.LOD) {
      child.autoUpdate = false
      child.levels.forEach((level) => {
        if (level.object) level.object.visible = true
      })
    }
  })

  passOpaqueDepthAlpha(root)
  passDoubleSide(root)

  if (DEBUG_GLTF_NORMALS) {
    passDebugMeshNormalMaterial(root)
    passDebugLogMeshes(root)
  } else if (DEBUG_GLTF_MESH_LOG) {
    passDebugLogMeshes(root)
  }

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      child.visible = true
      if (!DEBUG_GLTF_NORMALS) {
        eachMeshMaterial(child, (mat) =>
          fixPhysicalTransmission(mat, child.name),
        )
      }
    }
    if (child instanceof THREE.InstancedMesh) {
      child.castShadow = true
      child.receiveShadow = true
      child.visible = true
      if (!DEBUG_GLTF_NORMALS) {
        const mat = child.material
        if (Array.isArray(mat)) {
          mat.forEach((m) => m && fixPhysicalTransmission(m, child.name))
        } else if (mat) {
          fixPhysicalTransmission(mat, child.name)
        }
      }
    }
  })
}

const _tmpV = new THREE.Vector3()
const _meshToRoot = new THREE.Matrix4()

/**
 * `Box3.setFromObject` traverses LOD / helpers and can throw when a child ref is
 * undefined. This builds an AABB from mesh vertices only, in `root` local space.
 */
function boundingBoxRootLocal(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true)
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const box = new THREE.Box3()
  let verts = 0
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return
    const pos = child.geometry.attributes.position
    if (!pos) return
    child.updateMatrixWorld(true)
    _meshToRoot.copy(invRoot).multiply(child.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      _tmpV.fromBufferAttribute(pos, i).applyMatrix4(_meshToRoot)
      box.expandByPoint(_tmpV)
      verts++
    }
  })
  if (verts === 0) {
    box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1))
  }
  return box
}

/**
 * Casts a vertical ray in world space onto car meshes at the rear trunk / boot
 * footprint, then returns the hit in car-root local space. This tracks the actual
 * sheet metal instead of a loose vertex bbox.
 */
function raycastTrunkBootSurface(
  carRoot: THREE.Object3D,
  overall: THREE.Box3,
): THREE.Vector3 | null {
  const size = overall.getSize(new THREE.Vector3())
  const maxZ = overall.max.z
  const cx = (overall.min.x + overall.max.x) * 0.5
  const yStart = overall.max.y + size.y * 0.85

  carRoot.updateMatrixWorld(true)

  const meshes: THREE.Mesh[] = []
  carRoot.traverse((c) => {
    if (c instanceof THREE.Mesh && c.geometry?.attributes?.position) meshes.push(c)
  })
  if (meshes.length === 0) return null

  const zFracs = [0.09, 0.12, 0.15, 0.18, 0.22]
  for (const frac of zFracs) {
    const localOrigin = new THREE.Vector3(cx, yStart, maxZ - size.z * frac)
    const worldOrigin = localOrigin.clone().applyMatrix4(carRoot.matrixWorld)
    const raycaster = new THREE.Raycaster(
      worldOrigin,
      new THREE.Vector3(0, -1, 0),
    )
    const hits = raycaster.intersectObjects(meshes, false)
    if (hits.length === 0) continue
    const p = hits[0].point.clone()
    carRoot.worldToLocal(p)
    if (p.y < overall.min.y + size.y * 0.24) continue
    p.y += size.y * 0.003
    return p
  }
  return null
}

/**
 * Fallback: sample vertices in a narrow rear “lid” band (not the full rear quarter).
 */
function computeTrunkAnchor(carRoot: THREE.Object3D, overall: THREE.Box3): THREE.Vector3 {
  const fromRay = raycastTrunkBootSurface(carRoot, overall)
  if (fromRay) return fromRay

  carRoot.updateMatrixWorld(true)
  const invRoot = new THREE.Matrix4().copy(carRoot.matrixWorld).invert()
  const size = overall.getSize(new THREE.Vector3())
  if (size.x < 1e-6 || size.y < 1e-6 || size.z < 1e-6) {
    return overall.getCenter(new THREE.Vector3())
  }

  const maxZ = overall.max.z
  const rearZMin = maxZ - size.z * 0.14
  const yBodyLo = overall.min.y + size.y * 0.4
  const yBodyHi = overall.min.y + size.y * 0.68

  function collectTrunkBox(
    zOnly: boolean,
  ): { box: THREE.Box3; count: number } {
    const trunkBox = new THREE.Box3()
    let count = 0
    carRoot.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const geom = child.geometry
      if (!geom) return
      const pos = geom.attributes.position
      if (!pos) return
      child.updateMatrixWorld(true)
      _meshToRoot.copy(invRoot).multiply(child.matrixWorld)
      for (let i = 0; i < pos.count; i++) {
        _tmpV.fromBufferAttribute(pos, i).applyMatrix4(_meshToRoot)
        if (_tmpV.z < rearZMin) continue
        if (!zOnly && (_tmpV.y < yBodyLo || _tmpV.y > yBodyHi)) continue
        trunkBox.expandByPoint(_tmpV)
        count++
      }
    })
    return { box: trunkBox, count }
  }

  let { box: trunkBox, count } = collectTrunkBox(false)
  if (count < 40) {
    const looser = collectTrunkBox(true)
    if (looser.count > count) {
      trunkBox = looser.box
      count = looser.count
    }
  }

  if (count < 1 || trunkBox.isEmpty()) {
    const c = overall.getCenter(new THREE.Vector3())
    return new THREE.Vector3(
      c.x,
      overall.min.y + size.y * 0.58,
      overall.max.z - size.z * 0.08,
    )
  }

  const anchor = new THREE.Vector3()
  const sx = trunkBox.max.x - trunkBox.min.x
  const sz = trunkBox.max.z - trunkBox.min.z
  anchor.x = trunkBox.min.x + sx * 0.5
  const rawY = trunkBox.max.y - size.y * 0.008
  const deckMinY = overall.min.y + size.y * 0.52
  const deckMaxY = overall.min.y + size.y * 0.72
  anchor.y = THREE.MathUtils.clamp(rawY, deckMinY, deckMaxY)
  anchor.z = trunkBox.min.z + sz * 0.55
  return anchor
}

function UniversalSpoilerModel({ carRoot }: { carRoot: THREE.Object3D }) {
  const gltf = useGLTF(SPOILER_UNIVERSAL_URL)
  const { carBox, trunkAnchor } = useMemo(() => {
    const box = boundingBoxRootLocal(carRoot)
    return { carBox: box, trunkAnchor: computeTrunkAnchor(carRoot, box) }
  }, [carRoot])

  const part = useMemo(() => {
    const r = cloneMergedGltfScene(gltf)
    prepareGlbMesh(r)
    const sBox = boundingBoxRootLocal(r)
    const sSize = sBox.getSize(new THREE.Vector3())
    const spMax = Math.max(sSize.x, sSize.y, sSize.z, 1e-6)
    const cSize = carBox.getSize(new THREE.Vector3())
    const carSpan = Math.max(cSize.x, cSize.y, cSize.z, 1e-6)
    // Same parent scale applies to car and spoiler; match spoiler span to car width (~38%)
    const targetSpan = carSpan * 0.38
    r.scale.setScalar(targetSpan / spMax)
    // Pivot is not at the feet; raise geometry so the bbox bottom sits on y=0 in part space
    // before parent rotations (stops the wing from ending up under the car).
    const after = boundingBoxRootLocal(r)
    r.position.y -= after.min.y
    return r
  }, [gltf, carBox])

  const pos = useMemo(
    () => [trunkAnchor.x, trunkAnchor.y, trunkAnchor.z] as const,
    [trunkAnchor],
  )

  return (
    <group position={pos}>
      {/*
        Sketchfab export: wing is mostly in XY (vertical in world). Lay it flat on the trunk:
        -90° X maps local +Y (span) toward horizontal; +90° Z aligns span with car width.
      */}
      <group rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <group rotation={[0.1, 0, 0]}>
          <primitive object={part} />
        </group>
      </group>
    </group>
  )
}

function ModParts({
  flags,
  carRoot,
}: {
  flags: ModFlags
  carRoot: THREE.Object3D
}) {
  return (
    <group>
      {flags.spoiler === 'universal-spoiler-2' && (
        <UniversalSpoilerModel carRoot={carRoot} />
      )}
      {flags.frontLip && (
        <mesh position={[0.15, -0.28, 1.05]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[1.85, 0.07, 0.35]} />
          {carbon}
        </mesh>
      )}
      {flags.sideSkirts && (
        <>
          <mesh position={[0.85, -0.22, 0.05]}>
            <boxGeometry args={[0.09, 0.12, 2.2]} />
            {carbon}
          </mesh>
          <mesh position={[-0.55, -0.22, 0.05]}>
            <boxGeometry args={[0.09, 0.12, 2.2]} />
            {carbon}
          </mesh>
        </>
      )}
      {flags.rearDiffuser && (
        <mesh position={[0.15, -0.35, -1.05]}>
          <boxGeometry args={[1.5, 0.14, 0.45]} />
          {carbon}
        </mesh>
      )}
    </group>
  )
}

function useNormalizedScale(object: THREE.Object3D | null) {
  return useMemo(() => {
    if (!object) return 1
    const box = boundingBoxRootLocal(object)
    const size = box.getSize(new THREE.Vector3())
    const max = Math.max(size.x, size.y, size.z)
    return max > 0 ? 2.4 / max : 1
  }, [object])
}

function CarLoadedScene({ flags }: { flags: ModFlags }) {
  const gltf = useGLTF(GLB_URL)
  const root = useMemo(() => {
    const r = cloneMergedGltfScene(gltf)
    prepareGlbMesh(r)
    return r
  }, [gltf])

  useEffect(() => {
    useGLTF.preload(SPOILER_UNIVERSAL_URL)
  }, [])

  const spin = useRef<THREE.Group>(null)
  const scale = useNormalizedScale(root)

  useFrame((_s, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.08
  })

  return (
    <group ref={spin} scale={[scale, scale, scale]}>
      {/*
        `object={root}` makes Center use only the car bbox for alignment.
        Otherwise drei's Center does not re-layout when the spoiler GLB mounts,
        and the add-on stays off-screen / wrong.
      */}
      <Center top={false} object={root} cacheKey={flags.spoiler}>
        <primitive object={root} />
        <ModParts flags={flags} carRoot={root} />
      </Center>
    </group>
  )
}

export function BMWScene({ flags }: { flags: ModFlags }) {
  return (
    <Suspense
      fallback={
        <Html center>
          <span style={{ color: '#71717a' }}>Loading 3D model…</span>
        </Html>
      }
    >
      <ambientLight intensity={0.72} />
      <hemisphereLight
        color="#ffffff"
        groundColor="#b4b4b8"
        intensity={0.55}
      />
      <directionalLight
        position={[6, 10, 8]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 6, -4]} intensity={0.45} />
      <spotLight
        position={[2, 9, 6]}
        angle={0.55}
        penumbra={0.55}
        intensity={0.35}
        color="#ffffff"
      />
      <Environment preset="studio" />
      <CarLoadedScene flags={flags} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2 - 0.08}
        target={[0, 0.2, 0]}
      />
    </Suspense>
  )
}

useGLTF.preload(GLB_URL)
useGLTF.preload(SPOILER_UNIVERSAL_URL)
