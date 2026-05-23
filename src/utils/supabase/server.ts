import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  // Traemos la promesa de las cookies
  const cookieStorePromise = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Hacemos que cada método resuelva la promesa internamente
        async get(name: string) {
          const cookieStore = await cookieStorePromise
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: any) {
          const cookieStore = await cookieStorePromise
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // El Server Component a veces protesta al setear cookies en render,
            // la especificación de Supabase pide ignorar este catch controlado.
          }
        },
        async remove(name: string, options: any) {
          const cookieStore = await cookieStorePromise
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Catch controlado para Server Components
          }
        },
      },
    }
  )
}