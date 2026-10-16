// Photo upload rules and byte-level checks (ADR-0002). Pure: used by the add flow in the
// browser and by the Server Action, which re-checks every byte before storing anything.

export const MAX_PHOTOS = 8;
// Mirrors the storage bucket limit (supabase/config.toml).
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
// All photos travel in one Server Action request: stay under its 4 MB body limit
// (next.config.ts), which itself stays under Vercel's 4.5 MB function limit.
export const MAX_TOTAL_PHOTO_BYTES = 3.5 * 1024 * 1024;
// The browser shrinks each photo to at most this, so MAX_PHOTOS always fit the total (BL-50).
export const PHOTO_TARGET_BYTES = 420 * 1024;

export type PhotoType = "image/png" | "image/jpeg" | "image/webp";

const ascii = (b: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...b.subarray(start, start + len));

/** The real image type from magic bytes. The client-supplied MIME type isn't trusted. */
export function sniffImageType(b: Uint8Array): PhotoType | null {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  return null;
}

const XMP_JPEG = "http://ns.adobe.com/xap/1.0/\0";
const PNG_TEXT_KEYS = ["XML:com.adobe.xmp", "Raw profile type exif", "Raw profile type APP1"];

/**
 * True when the image carries EXIF or XMP metadata, either of which can hold GPS
 * coordinates. Browser canvas re-encoding produces files without either.
 */
export function hasEmbeddedMetadata(b: Uint8Array, type: PhotoType): boolean {
  if (type === "image/jpeg") {
    let i = 2;
    while (i + 4 <= b.length) {
      if (b[i] !== 0xff) return false; // corrupt: stop scanning
      const marker = b[i + 1];
      if (marker === 0xff) {
        i += 1; // fill byte
        continue;
      }
      if (marker === 0xda || marker === 0xd9) return false; // image data / end: no more metadata
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2; // standalone marker
        continue;
      }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (marker === 0xe1) {
        const head = ascii(b, i + 4, XMP_JPEG.length);
        if (head.startsWith("Exif\0\0") || head === XMP_JPEG) return true;
      }
      i += 2 + len;
    }
    return false;
  }

  if (type === "image/png") {
    let i = 8;
    while (i + 8 <= b.length) {
      const len = ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
      const chunk = ascii(b, i + 4, 4);
      if (chunk === "eXIf") return true;
      if (chunk === "iTXt" || chunk === "tEXt" || chunk === "zTXt") {
        const data = b.subarray(i + 8, i + 8 + len);
        const keyword = ascii(data, 0, Math.max(0, data.indexOf(0)));
        if (PNG_TEXT_KEYS.includes(keyword)) return true;
      }
      if (chunk === "IEND") return false;
      i += 12 + len;
    }
    return false;
  }

  // WebP: RIFF chunks after the 12-byte header, each padded to an even size.
  let i = 12;
  while (i + 8 <= b.length) {
    const fourcc = ascii(b, i, 4);
    if (fourcc === "EXIF" || fourcc === "XMP ") return true;
    const size = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | ((b[i + 7] << 24) >>> 0);
    i += 8 + size + (size % 2);
  }
  return false;
}
