/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_PHONE?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_IOS_APP_URL?: string;
  readonly VITE_ANDROID_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
