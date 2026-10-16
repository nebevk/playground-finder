import { describe, expect, it } from "vitest";
import {
  hasEmbeddedMetadata,
  MAX_PHOTOS,
  MAX_TOTAL_PHOTO_BYTES,
  PHOTO_TARGET_BYTES,
  sniffImageType,
} from "@/lib/photo-checks";

it("[FR-ADD-03] the per-photo target lets the maximum number of photos fit one submission", () => {
  expect(MAX_PHOTOS * PHOTO_TARGET_BYTES).toBeLessThanOrEqual(MAX_TOTAL_PHOTO_BYTES);
});

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

// JPEG: SOI, then segments; metadata must come before SOS.
const jpegSegment = (marker: number, payload: string) => [0xff, marker, ...be16(payload.length + 2), ...bytes(payload)];
const jpeg = (...segments: number[][]) =>
  new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xda, ...be16(2), 0x12, 0x34, 0xff, 0xd9]);
const JFIF = jpegSegment(0xe0, "JFIF\0\x01\x01\0\0\x01\0\x01\0\0");

// PNG: signature, chunks (length, type, data, fake CRC), IEND.
const pngChunk = (type: string, data: string) => [...be32(data.length), ...bytes(type, data), 0, 0, 0, 0];
const png = (...chunks: number[][]) =>
  new Uint8Array([
    ...bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a]),
    ...pngChunk("IHDR", "\0\0\0\x01\0\0\0\x01\x08\x02\0\0\0"),
    ...chunks.flat(),
    ...pngChunk("IEND", ""),
  ]);

// WebP: RIFF header, then chunks (fourcc, LE size, data padded to even).
const webpChunk = (fourcc: string, data: string) => [
  ...bytes(fourcc),
  ...le32(data.length),
  ...bytes(data),
  ...(data.length % 2 ? [0] : []),
];
const webp = (...chunks: number[][]) => {
  const body = chunks.flat();
  return new Uint8Array([...bytes("RIFF"), ...le32(body.length + 4), ...bytes("WEBP"), ...body]);
};

describe("photo type sniffing", () => {
  it("[FR-ADD-03] recognises PNG, JPEG and WebP by their magic bytes", () => {
    expect(sniffImageType(png())).toBe("image/png");
    expect(sniffImageType(jpeg(JFIF))).toBe("image/jpeg");
    expect(sniffImageType(webp(webpChunk("VP8 ", "abc")))).toBe("image/webp");
  });

  it("[FR-ADD-03] rejects anything else, whatever the file claims to be", () => {
    expect(sniffImageType(bytes("GIF89a\x01\0\x01\0"))).toBeNull();
    expect(sniffImageType(bytes("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("embedded metadata (EXIF/XMP can carry GPS)", () => {
  it("[GDPR-09] passes clean images like the browser's canvas output", () => {
    expect(hasEmbeddedMetadata(jpeg(JFIF), "image/jpeg")).toBe(false);
    expect(hasEmbeddedMetadata(png(pngChunk("tEXt", "Comment\0hello")), "image/png")).toBe(false);
    expect(hasEmbeddedMetadata(webp(webpChunk("VP8X", "0123456789"), webpChunk("VP8 ", "abc")), "image/webp")).toBe(false);
  });

  it("[GDPR-09] detects EXIF and XMP in JPEG", () => {
    expect(hasEmbeddedMetadata(jpeg(JFIF, jpegSegment(0xe1, "Exif\0\0MM\0*GPS")), "image/jpeg")).toBe(true);
    expect(
      hasEmbeddedMetadata(jpeg(jpegSegment(0xe1, "http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>")), "image/jpeg"),
    ).toBe(true);
  });

  it("[GDPR-09] detects EXIF and XMP in PNG", () => {
    expect(hasEmbeddedMetadata(png(pngChunk("eXIf", "MM\0*")), "image/png")).toBe(true);
    expect(hasEmbeddedMetadata(png(pngChunk("iTXt", "XML:com.adobe.xmp\0\0\0\0\0<x/>")), "image/png")).toBe(true);
    expect(hasEmbeddedMetadata(png(pngChunk("zTXt", "Raw profile type exif\0\0x")), "image/png")).toBe(true);
  });

  it("[GDPR-09] detects EXIF and XMP in WebP, including after odd-sized chunks", () => {
    expect(hasEmbeddedMetadata(webp(webpChunk("VP8 ", "abc"), webpChunk("EXIF", "MM\0*")), "image/webp")).toBe(true);
    expect(hasEmbeddedMetadata(webp(webpChunk("XMP ", "<x/>")), "image/webp")).toBe(true);
  });
});
