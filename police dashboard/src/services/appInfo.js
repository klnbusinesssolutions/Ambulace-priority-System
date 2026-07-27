// Real build metadata for Settings > About the System - not placeholder text.
// VERSION mirrors package.json's "version" field (Vite doesn't expose package.json to client
// code by default, so this is kept in sync manually rather than adding a build-time plugin).
// BUILD_NUMBER/BUILD_DATE are meant to be injected by CI (e.g. `VITE_BUILD_NUMBER=$GITHUB_RUN_NUMBER
// npm run build`); until CI sets them, they fall back to something honest rather than fake.
export const APP_NAME = "Police Emergency Monitoring Dashboard";
export const APP_VERSION = "1.0.0";
export const BUILD_NUMBER = import.meta.env.VITE_BUILD_NUMBER || "dev";
export const BUILD_ENV = import.meta.env.MODE;
