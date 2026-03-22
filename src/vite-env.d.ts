/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLTF_DEBUG_NORMALS?: string
  readonly VITE_GLTF_DEBUG_MESH_LOG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
