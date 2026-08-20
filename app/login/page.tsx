'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) { toast.error('Usuario o contraseña incorrectos'); return }
    router.push('/bienvenida')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', padding: 16 }}>
      <form onSubmit={entrar} className="card" style={{ width: '100%', maxWidth: 360, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.03em' }}>
            Flowi Gestor
          </span>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Ingresá con tu usuario y contraseña</p>
        </div>

        <label className="label">Email</label>
        <input
          className="input" style={{ marginBottom: 14 }}
          type="email" required autoFocus autoComplete="username"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />

        <label className="label">Contraseña</label>
        <input
          className="input" style={{ marginBottom: 22 }}
          type="password" required autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <Link href="/recuperar" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </div>
  )
}
