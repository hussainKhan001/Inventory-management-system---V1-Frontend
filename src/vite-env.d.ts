/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend API
  readonly VITE_API_BASE_URL: string         // Full API base URL e.g. http://localhost:5000/api
  readonly VITE_BACKEND_URL: string          // Backend server base URL e.g. http://localhost:5000

  // Cloudinary (image uploads)
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string

  // AES-256-CBC encryption (must match backend ENCRYPTION_KEY)
  readonly VITE_ENCRYPTION_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
