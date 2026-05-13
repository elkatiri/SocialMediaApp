import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

function defaultUsername(user: User) {
  const metaName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.username === 'string'
        ? user.user_metadata.username
        : ''

  if (metaName.trim()) return metaName.trim()

  const email = typeof user.email === 'string' ? user.email : ''
  const prefix = email.includes('@') ? email.split('@')[0] : email
  return (prefix || 'user').trim()
}

/**
 * Ensures a matching row exists in public.users for the authenticated user.
 * This prevents FK errors like: posts_user_id_fkey.
 */
export async function ensureUserProfile(user: User) {
  if (!user?.id) return

  const username = defaultUsername(user)
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null

  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        username,
        avatar_url: avatarUrl,
      },
      { onConflict: 'id' }
    )

  if (error) {
    throw error
  }
}
