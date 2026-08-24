'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [aviso, setAviso]       = useState<string | null>(null)

  // Cuando el enlace del mail de recuperación falla, Supabase redirige acá con
  // el motivo en la URL. Sin esto el usuario cae en un login pelado, sin
  // entender por qué no llegó a la pantalla de cambiar la contraseña.
  //
  // El error puede venir en la query (?error=...) o en el fragmento (#error=...)
  // según el caso, así que miramos los dos.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const hash  = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const code  = query.get('error_code') || hash.get('error_code')
    const desc  = query.get('error_description') || hash.get('error_description')
    if (!code && !desc) return

    if (code === 'otp_expired' || /expired/i.test(desc ?? '')) {
      setAviso('El enlace del mail venció o ya se usó. Los enlaces duran 1 hora y sirven una sola vez — pedí uno nuevo desde "¿Olvidaste tu contraseña?".')
    } else {
      setAviso('No se pudo validar el enlace del mail. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".')
    }
    // Ojo: no limpiar la URL acá. Si se borran los parámetros dentro de este
    // mismo efecto, cualquier remontaje del componente vuelve a leer una URL
    // ya limpia y el aviso desaparece sin que el usuario lo haya visto.
  }, [])

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

        {aviso && (
          <div role="status" style={{ background: 'rgba(214,158,46,0.10)', border: '1px solid rgba(214,158,46,0.35)', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {aviso}
          </div>
        )}

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
