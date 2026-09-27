const MAX_BYTES = 18 * 1024 * 1024;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunk = 4096;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** ImagePicker only fills `base64` for photos. Videos (and some gallery items) need a file read. */
export async function pickerAssetToBase64(asset: {
  uri: string;
  base64?: string | null;
  fileSize?: number | null;
}): Promise<string> {
  if (asset.base64) {
    const marker = "base64,";
    const i = asset.base64.indexOf(marker);
    return i >= 0 ? asset.base64.slice(i + marker.length) : asset.base64;
  }
  if (typeof asset.fileSize === "number" && asset.fileSize > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const res = await fetch(asset.uri);
  if (!res.ok) throw new Error("READ_FAILED");
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) throw new Error("READ_FAILED");
  if (buf.byteLength > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  return arrayBufferToBase64(buf);
}
