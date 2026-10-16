// Client-only — uses DOM canvas + createImageBitmap.
// Imported from client components (AddFlow); never call this on the server.

export type ResizeOptions = {
  /** Max length of the longest side, in pixels. Default 1600. */
  maxDim?: number;
  /** JPEG/WEBP quality, 0..1. Default 0.82. */
  quality?: number;
  /** Preferred output MIME. Falls back to image/jpeg if encoder rejects. Default image/webp. */
  mimeType?: "image/webp" | "image/jpeg";
};

/**
 * Downscales an image to `maxDim` on the longest side, re-encodes via canvas
 * (which strips EXIF including GPS), and returns a new File.
 *
 * Always re-encodes, even small images: the original may carry GPS metadata (GDPR-09).
 * Throws if the browser can't decode or encode it; callers must not fall back to the original.
 */
export async function resizeImage(file: File, opts: ResizeOptions = {}): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("resizeImage is client-only");
  }
  if (!file.type.startsWith("image/")) throw new Error("not_an_image");

  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.82;
  const mimeType = opts.mimeType ?? "image/webp";

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const longest = Math.max(bitmap.width, bitmap.height);

  const scale = longest > maxDim ? maxDim / longest : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("no_canvas_context");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );

  if (!blob && mimeType !== "image/jpeg") {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  if (!blob) throw new Error("encode_failed");

  // Keep the re-encoded output even when it's larger than the source: only it is metadata-free.
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.${ext}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}
