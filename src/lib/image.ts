// Client-only — uses DOM canvas + createImageBitmap.
// Imported from client components (AddFlow); never call this on the server.
import { PHOTO_TARGET_BYTES } from "./photo-checks";

// Tried in order until the photo fits the per-photo target: quality first, then size.
// Phone photos at 1600 px / 0.82 came out at 645–741 KB in production (ops 0003), so only
// ~5 of 8 fitted the per-submission budget (BL-50).
const ATTEMPTS: readonly (readonly [maxDim: number, quality: number])[] = [
  [1600, 0.8],
  [1600, 0.7],
  [1280, 0.7],
  [1280, 0.6],
  [1024, 0.6],
  [800, 0.55],
];

/**
 * Re-encodes a photo via canvas (which strips EXIF including GPS) as WebP (JPEG fallback),
 * shrinking quality and then size until it's at most `targetBytes`, so 8 photos always fit
 * one submission. Returns the smallest attempt if even that is larger.
 *
 * Always re-encodes, even small images: the original may carry GPS metadata (GDPR-09).
 * Throws if the browser can't decode or encode it; callers must not fall back to the original.
 */
export async function resizeImage(file: File, targetBytes = PHOTO_TARGET_BYTES): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("resizeImage is client-only");
  }
  if (!file.type.startsWith("image/")) throw new Error("not_an_image");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let blob: Blob | null = null;
    for (const [maxDim, quality] of ATTEMPTS) {
      blob = await encode(bitmap, maxDim, quality);
      if (blob.size <= targetBytes) break;
    }
    const out = blob!;
    const ext = out.type === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([out], `${baseName}.${ext}`, { type: out.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

async function encode(bitmap: ImageBitmap, maxDim: number, quality: number): Promise<Blob> {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas_context");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Browsers without a WebP encoder return null (or PNG) for image/webp: fall back to JPEG.
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("encode_failed");
  return blob;
}
