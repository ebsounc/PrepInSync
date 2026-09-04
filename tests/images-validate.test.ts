import { describe, it, expect } from 'vitest'
import { decodeImageInput, IMAGE_MEDIA_TYPES } from '@/lib/images/validate'

// Server-side gate for uploaded/scanned images. The client already downscales and
// re-encodes to JPEG, so this is defense in depth -- it has to hold on its own against
// a caller that skips the client entirely.

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const b64 = (bytes: Buffer) => bytes.toString('base64')
const smallJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])

const isError = (
  r: ReturnType<typeof decodeImageInput>
): r is { code: 'invalid' | 'tooLarge' } => 'code' in r

describe('decodeImageInput', () => {
  it('accepts each allowed media type and returns the decoded bytes', () => {
    for (const mediaType of IMAGE_MEDIA_TYPES) {
      const result = decodeImageInput({ imageBase64: b64(smallJpeg), mediaType })
      expect(isError(result), `${mediaType} should be accepted`).toBe(false)
      if (isError(result)) continue
      expect(result.mediaType).toBe(mediaType)
      expect(result.base64).toBe(b64(smallJpeg))
      expect(Buffer.from(result.bytes)).toEqual(smallJpeg)
    }
  })

  it('allows exactly jpeg, png and webp', () => {
    expect(IMAGE_MEDIA_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('rejects media types outside the allow-list', () => {
    // SVG matters most: it can carry script, and it is the classic "it's just an
    // image" upload bypass.
    for (const mediaType of [
      'image/svg+xml',
      'image/gif',
      'image/heic',
      'image/bmp',
      'text/html',
      'application/pdf',
      '',
      'IMAGE/JPEG',
      'image/jpeg; charset=utf-8',
    ]) {
      expect(
        decodeImageInput({ imageBase64: b64(smallJpeg), mediaType }),
        `${mediaType} should be rejected`
      ).toEqual({ code: 'invalid' })
    }
  })

  it('rejects a malformed payload', () => {
    for (const bad of [
      null,
      undefined,
      'a string',
      42,
      {},
      { imageBase64: b64(smallJpeg) },
      { mediaType: 'image/jpeg' },
      { imageBase64: '', mediaType: 'image/jpeg' },
      { imageBase64: 123, mediaType: 'image/jpeg' },
      { imageBase64: b64(smallJpeg), mediaType: 123 },
    ]) {
      expect(decodeImageInput(bad), `${JSON.stringify(bad)} should be rejected`).toEqual({
        code: 'invalid',
      })
    }
  })

  it('rejects base64 that decodes to zero bytes', () => {
    // Non-empty string, empty payload -- passes the schema, must fail the decode.
    expect(decodeImageInput({ imageBase64: '====', mediaType: 'image/jpeg' })).toEqual({
      code: 'invalid',
    })
  })

  it('accepts an image right at the size cap', () => {
    const atCap = Buffer.alloc(MAX_IMAGE_BYTES, 1)
    const result = decodeImageInput({ imageBase64: b64(atCap), mediaType: 'image/jpeg' })
    expect(isError(result)).toBe(false)
    if (isError(result)) return
    expect(result.bytes.length).toBe(MAX_IMAGE_BYTES)
  })

  it('reports tooLarge for one byte over the cap', () => {
    // Confirms the exact byte length is re-checked after decoding, not just estimated
    // from the string length.
    const overCap = Buffer.alloc(MAX_IMAGE_BYTES + 1, 1)
    expect(decodeImageInput({ imageBase64: b64(overCap), mediaType: 'image/jpeg' })).toEqual({
      code: 'tooLarge',
    })
  })

  it('rejects a wildly oversized string before decoding it', () => {
    // The char cap exists so a huge payload is refused without allocating the full
    // decode. It reports 'invalid' because the schema rejects it first.
    const huge = 'A'.repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100)
    expect(decodeImageInput({ imageBase64: huge, mediaType: 'image/jpeg' })).toEqual({
      code: 'invalid',
    })
  })
})
