import {
  Center,
  OrbitControls,
  Environment,
  Html,
  useGLTF,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type ModFlags = {
  spoiler: boolean
  frontLip: boolean
  sideSkirts: boolean
  rearDiffuser: boolean
}

/** Blender export — place file at `public/models/bmw-m3/bmw3.glb` */
export const GLB_URL = '/models/bmw-m3/bmw3.glb'

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

function ModParts({ flags }: { flags: ModFlags }) {
  return (
    <group position={[0, 0.05, 0]}>
      {flags.spoiler && (
        <mesh position={[0.15, 0.42, -0.95]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[1.05, 0.06, 0.22]} />
          {carbon}
        </mesh>
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
    const box = new THREE.Box3().setFromObject(object)
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

  const spin = useRef<THREE.Group>(null)
  const scale = useNormalizedScale(root)

  useFrame((_s, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.08
  })

  return (
    <group ref={spin} scale={[scale, scale, scale]}>
      <Center top={false}>
        <primitive object={root} />
        <ModParts flags={flags} />
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
