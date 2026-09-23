#!/usr/bin/env node
/**
 * Generate marketing/public/.well-known/assetlinks.json for Android App Links.
 *
 * Usage:
 *   node mobile/scripts/generate-assetlinks.mjs
 *   PLAY_APP_SIGNING_SHA256="AA:BB:..." node mobile/scripts/generate-assetlinks.mjs
 *
 * Fingerprints:
 * - EAS upload key (from latest production AAB): always included
 * - Play App signing key: set PLAY_APP_SIGNING_SHA256 from Play Console →
 *   Setup → App integrity → App signing key certificate (required for Play installs)
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const outPath = resolve(repoRoot, "marketing/public/.well-known/assetlinks.json");

const PACKAGE = "com.casahomesrwanda.app";
const UPLOAD_SHA256 =
  "04:9F:FC:D7:3F:D4:0B:01:E7:E6:43:E1:96:FF:10:44:FB:0A:50:51:D7:AF:C7:B5:45:21:51:D7:BA:84:4B:4D";

function normalizeSha256(raw) {
  const hex = raw.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 64) {
    throw new Error(`Invalid SHA-256 fingerprint: ${raw}`);
  }
  return hex.match(/.{1,2}/g).join(":");
}

function unique(list) {
  return [...new Set(list)];
}

function extractFromLatestAab() {
  try {
    const json = execSync(
      "npx eas-cli build:list --platform android --limit 1 --json --non-interactive",
      { cwd: resolve(repoRoot, "mobile"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const builds = JSON.parse(json);
    const url = builds[0]?.artifacts?.applicationArchiveUrl;
    if (!url) return UPLOAD_SHA256;

    const tmp = execSync("mktemp -d", { encoding: "utf8" }).trim();
    execSync(`curl -fsSL -o "${tmp}/app.aab" "${url}"`, { stdio: "ignore" });
    const rsa = execSync(`unzip -l "${tmp}/app.aab"`, { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim().split(/\s+/).pop())
      .find((name) => name?.match(/^META-INF\/.*\.(RSA|DSA|EC)$/));
    if (!rsa) return UPLOAD_SHA256;

    execSync(`unzip -p "${tmp}/app.aab" "${rsa}" > "${tmp}/cert.der"`, { stdio: "ignore" });
    const out = execSync(`keytool -printcert -file "${tmp}/cert.der"`, { encoding: "utf8" });
    const match = out.match(/SHA256:\s*([0-9A-F:]+)/i);
    return match ? normalizeSha256(match[1]) : UPLOAD_SHA256;
  } catch {
    return UPLOAD_SHA256;
  }
}

const uploadSha256 = extractFromLatestAab();
const playSha256 = process.env.PLAY_APP_SIGNING_SHA256
  ? normalizeSha256(process.env.PLAY_APP_SIGNING_SHA256)
  : null;

const fingerprints = unique([playSha256, uploadSha256].filter(Boolean));

const payload = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: PACKAGE,
      sha256_cert_fingerprints: fingerprints,
    },
  },
];

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Wrote ${outPath}`);
console.log(`  package: ${PACKAGE}`);
for (const fp of fingerprints) {
  const label = fp === uploadSha256 ? "EAS upload key" : "Play app signing key";
  console.log(`  ${label}: ${fp}`);
}
if (!playSha256) {
  console.log("");
  console.log(
    "Note: Add Play App signing SHA-256 for Play Store installs:\n" +
      "  Play Console → Setup → App integrity → App signing key certificate\n" +
      '  PLAY_APP_SIGNING_SHA256="..." node mobile/scripts/generate-assetlinks.mjs',
  );
}
