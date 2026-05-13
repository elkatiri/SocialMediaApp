import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const rawSupabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY

if (!rawSupabaseUrl || !rawSupabaseKey) {
  const message =
    'Missing Supabase env vars. Ensure social-app/.env contains EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY, then restart Expo with `expo start -c`.'
  console.error(message, {
    EXPO_PUBLIC_SUPABASE_URL: rawSupabaseUrl,
    EXPO_PUBLIC_SUPABASE_KEY: rawSupabaseKey ? '[set]' : undefined,
  })
  throw new Error(message)
}

const supabaseUrl = rawSupabaseUrl.trim().replace(/\/+$/, '')
const supabaseKey = rawSupabaseKey.trim()

if (!/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error(
    `Invalid EXPO_PUBLIC_SUPABASE_URL (must start with http/https): ${supabaseUrl}`
  )
}

const baseFetch: typeof fetch = globalThis.fetch.bind(globalThis)
const loggedFetch: typeof fetch = async (input, init) => {
  try {
    return await baseFetch(input, init)
  } catch (error) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    console.error('[Network request failed]', {
      url,
      method: init?.method,
      error,
    })
    throw error
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: loggedFetch,
  },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
