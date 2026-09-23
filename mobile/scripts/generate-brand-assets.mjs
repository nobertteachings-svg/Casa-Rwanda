#!/usr/bin/env node
/**
 * Regenerate Expo app icons & splash from Casa brand assets.
 * Run: node scripts/generate-brand-assets.mjs
 */
import { writeFileSync, mkdirSync, readFileSync, copyFileSync, unlinkSync, readdirSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const assets = join(__dir, "..", "assets");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BRAND = "#0f2f24";

const lockupB64 = readFileSync(join(assets, "casa_logo_lockup_horizontal.png")).toString("base64");
const markB64 = readFileSync(join(assets, "casa_logo_mark.png")).toString("base64");

function shell(w, h, body, outPath) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin:0;padding:0;box-sizing:border-box; }
body { width:${w}px;height:${h}px;background:${BRAND};overflow:hidden; }
</style></head><body>${body}</body></html>`;
  const htmlPath = join(assets, `.gen-${outPath.split("/").pop()}.html`);
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    `--window-size=${w},${h}`,
    `--screenshot=${outPath}`,
    `file://${htmlPath}`,
  ]);
}

mkdirSync(assets, { recursive: true });

const lockupImg = `<img src="data:image/png;base64,${lockupB64}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Casa" />`;
const markImg = `<img src="data:image/png;base64,${markB64}" style="width:72%;height:72%;object-fit:contain;" alt="Casa" />`;

// App icon — horizontal lockup centered in square (Play / home screen)
shell(
  1024,
  1024,
  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:120px 80px;">${lockupImg}</div>`,
  join(assets, "icon.png")
);

// Splash — larger lockup
shell(
  1284,
  1284,
  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:180px 100px;">${lockupImg}</div>`,
  join(assets, "splash-icon.png")
);

// Android adaptive foreground — house mark (reads better at small sizes)
shell(
  1024,
  1024,
  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${markImg}</div>`,
  join(assets, "android-icon-foreground.png")
);

// Android adaptive background — solid brand green
shell(1024, 1024, "", join(assets, "android-icon-background.png"));

// Monochrome — white mark for Android 13+ themed icons
shell(
  1024,
  1024,
  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent;">
    <img src="data:image/png;base64,${markB64}" style="width:68%;height:68%;object-fit:contain;filter:brightness(0) invert(1);" alt="Casa" />
  </div>`,
  join(assets, "android-icon-monochrome.png")
);

// Favicon
shell(
  192,
  192,
  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:24px;">${markImg}</div>`,
  join(assets, "favicon.png")
);

// Play Console listing icon (512×512) — same as Expo app icon
const playOut = join(__dir, "..", "..", "Docs", "app-store-screenshots", "output", "android-phone");
mkdirSync(playOut, { recursive: true });
copyFileSync(join(assets, "icon.png"), join(playOut, "play-store-icon-512.png"));

for (const name of readdirSync(assets)) {
  if (name.startsWith(".gen-") && name.endsWith(".html")) {
    unlinkSync(join(assets, name));
  }
}

console.log("✓ Brand assets written to mobile/assets/");
console.log("✓ Play Store icon → Docs/app-store-screenshots/output/android-phone/play-store-icon-512.png");
