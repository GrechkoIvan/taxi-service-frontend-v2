/// <reference types="vite/client" />

declare global {
  interface Window {
    ymaps?: unknown
  }

  interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    readonly VITE_YMAPS_API_KEY?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
