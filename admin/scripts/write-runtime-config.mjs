import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultApiUrl = "https://backend-production-48e3.up.railway.app";
const apiUrl = process.env.VITE_API_URL || defaultApiUrl;

writeFileSync(
  join(root, "dist/runtime-config.js"),
  `window.__RUNTIME_CONFIG__ = ${JSON.stringify({ VITE_API_URL: apiUrl })};\n`
);

if (apiUrl) {
  console.log(`runtime-config.js written (VITE_API_URL=${apiUrl})`);
}
