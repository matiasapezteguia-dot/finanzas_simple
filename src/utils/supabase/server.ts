import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Agregamos async a la función raíz
export async function createServerSupabaseClient() {
  // Resolvemos la promesa acá arriba con un await seco
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Manejo controlado para Server Components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Manejo controlado para Server Components
          }
        },
      },
    }
  )
}