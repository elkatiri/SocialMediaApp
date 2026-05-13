import { supabase } from './supabase'

const DEFAULT_BUCKET = 'posts'

function getBucketName() {
  return (process.env.EXPO_PUBLIC_POSTS_BUCKET || DEFAULT_BUCKET).trim()
}

function inferExt(uri: string) {
  const clean = uri.split('?')[0]
  const last = clean.split('/').pop() || ''
  const ext = last.includes('.') ? last.split('.').pop() : ''
  return (ext || 'jpg').toLowerCase()
}

function inferContentType(ext: string) {
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'heic') return 'image/heic'
  if (ext === 'heif') return 'image/heif'
  return 'image/jpeg'
}

/**
 * Uploads a local image (file://...) to Supabase Storage and returns the object path.
 * Requires a Storage bucket (default: posts) and proper RLS/policies.
 */
export async function uploadPostImage(params: {
  userId: string
  localUri: string
}) {
  const { userId, localUri } = params

  const bucket = getBucketName()
  const ext = inferExt(localUri)
  const path = `${userId}/${Date.now()}.${ext}`

  const response = await fetch(localUri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: inferContentType(ext),
      upsert: false,
    })

  if (uploadError) {
    const message =
      typeof uploadError.message === 'string' ? uploadError.message : ''
    const status = (uploadError as any)?.statusCode

    if (/bucket not found/i.test(message) || status === 404) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Create it in Supabase (Storage → New bucket), or set EXPO_PUBLIC_POSTS_BUCKET to an existing bucket name and restart Expo (expo start -c).`
      )
    }

    throw uploadError
  }

  // Return the storage object path; the app can convert this to a public or signed URL when displaying.
  return path
}
