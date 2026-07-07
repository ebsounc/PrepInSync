import 'server-only'
import { z } from 'zod'

// Server-side gate for uploaded/scanned images. The client already downscales and
// re-encodes to JPEG (src/lib/images/downscale.ts); this is defense in depth.
export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
// base64 inflates ~4/3; cap the string so oversized input is rejected BEFORE we
// allocate the full decode, then confirm the exact byte length after decoding.
const MAX_BASE64_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8

const imageInputSchema = z.object({
  imageBase64: z.string().min(1).max(MAX_BASE64_CHARS),
  mediaType: z.string(),
})

export type DecodedImage = { bytes: Uint8Array; base64: string; mediaType: string }

// Validates a base64 image payload → decoded bytes, or an error code the caller maps
// to an i18n message ('invalid' = wrong type/unparseable, 'tooLarge' = over the cap).
export function decodeImageInput(input: unknown): DecodedImage | { code: 'invalid' | 'tooLarge' } {
  const parsed = imageInputSchema.safeParse(input)
  if (!parsed.success || !IMAGE_MEDIA_TYPES.includes(parsed.data.mediaType)) {
    return { code: 'invalid' }
  }
  const buf = Buffer.from(parsed.data.imageBase64, 'base64')
  if (buf.length === 0) return { code: 'invalid' }
  if (buf.length > MAX_IMAGE_BYTES) return { code: 'tooLarge' }
  return {
    bytes: new Uint8Array(buf),
    base64: parsed.data.imageBase64,
    mediaType: parsed.data.mediaType,
  }
}
