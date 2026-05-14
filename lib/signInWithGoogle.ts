import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'

import { supabase } from './supabase'

// Completes pending auth sessions (safe to call multiple times)
WebBrowser.maybeCompleteAuthSession()

function getRedirectTo() {
  const configured = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL
  if (configured && configured.trim().length > 0) {
    return configured.trim()
  }

  // Expo Go: prefer AuthSession proxy only when the project full name is known.
  // Newer Expo projects often don't have `originalFullName` in the manifest, which
  // makes `AuthSession.getRedirectUrl()` throw.
  if (Constants.appOwnership === 'expo' && Constants.expoConfig?.originalFullName) {
    return AuthSession.getRedirectUrl('auth/callback')
  }

  // Standalone/dev-client: use native deep link (scheme from app config)
  return AuthSession.makeRedirectUri({ path: 'auth/callback' })
}

export async function signInWithGoogle() {
  const redirectTo = getRedirectTo()
  console.log('[OAuth] redirectTo:', redirectTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data?.url) throw new Error('No OAuth URL returned from Supabase.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.')
  }

  // Supabase returns `?code=...` for PKCE
  const returnedUrl = result.url

  const oauthError = returnedUrl.match(/[?#&]error=([^&]+)/)?.[1]
  const oauthErrorDescription = returnedUrl.match(
    /[?#&]error_description=([^&]+)/
  )?.[1]

  if (oauthError) {
    const description = oauthErrorDescription
      ? decodeURIComponent(oauthErrorDescription)
      : decodeURIComponent(oauthError)
    throw new Error(description)
  }

  const code = returnedUrl.match(/[?#&]code=([^&]+)/)?.[1]

  if (!code) {
    throw new Error('No OAuth code returned. Ensure your Supabase redirect URLs include this app redirect URI.')
  }

  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(decodeURIComponent(code))

  if (exchangeError) throw exchangeError

  return exchangeData.session
}
