// Client-only image prep for scan + upload. Downscales and RE-ENCODES to JPEG,
// which (a) keeps payloads tiny and (b) normalizes iOS HEIC — the browser decodes
// HEIC to a bitmap and we emit JPEG, so the server never receives HEIC.
//
// Throws Error with a `.message` code the caller maps to an i18n string:
//   'IMAGE_TOO_LARGE'  — original exceeds the pre-decode guard
//   'IMAGE_DECODE'     — the browser couldn't decode the file (e.g. unsupported HEIC)

const MAX_INPUT_BYTES = 20 * 1024 * 1024 // 20 MB pre-decode guard

export type ScaledImage = { base64: string; mediaType: 'image/jpeg' }

export async function downscaleToJpegBase64(
  file: File,
  maxEdge = 1568,
  quality = 0.8
): Promise<ScaledImage> {
  if (file.size > MAX_INPUT_BYTES) throw new Error('IMAGE_TOO_LARGE')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('IMAGE_DECODE')
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('IMAGE_DECODE')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )
  if (!blob) throw new Error('IMAGE_DECODE')

  const base64 = await blobToBase64(blob)
  return { base64, mediaType: 'image/jpeg' }
}

// Strips the `data:...;base64,` prefix so the server receives raw base64.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('IMAGE_DECODE'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}
