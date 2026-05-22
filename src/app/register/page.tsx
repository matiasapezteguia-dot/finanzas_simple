
'use client'

import { createClientSupabaseClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      // Optionally, redirect to a page informing the user to check their email
      router.push('/login?message=Check email to verify account')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-full max_w-md">
        <h3 className="text-2xl font-bold text-center text-slate-900">Registrarse</h3>
        <form onSubmit={handleRegister}>
          <div className="mt-4">
            <div>
              <label className="block text-slate-700" htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-600 bg-slate-100 text-slate-900"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-slate-700" htmlFor="password">Contraseña</label>
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-600 bg-slate-100 text-slate-900"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex items-baseline justify-between">
              <button
                type="submit"
                className="px-6 py-2 mt-4 text-white bg-slate-900 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-opacity-50"
              >
                Registrarse
              </button>
              <a href="/login" className="text-sm text-slate-600 hover:underline">¿Ya tienes cuenta? Inicia Sesión</a>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
