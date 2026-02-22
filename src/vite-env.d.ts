/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUOTES_API?: string;
  readonly VITE_QUOTES_API_KEY?: string;
  // add more VITE_ env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
