'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function RecuperarPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { toast.error(error.message ?? 'No se pudo enviar el mail'); return }
    // No revelamos si el email existe o no — se responde igual en ambos casos.
    setEnviado(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.03em' }}>
            Recuperar contraseña
          </span>
        </div>

        {enviado ? (
          <>
            <div style={{ background: 'rgba(91,173,122,0.08)', border: '1px solid rgba(91,173,122,0.25)', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
              Si <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> corresponde a una cuenta,
              te va a llegar un mail con el enlace para crear una contraseña nueva.
              <br /><br />
              Revisá también la carpeta de spam. El enlace vence en 1 hora.
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              ⚠️ Abrí el enlace en <strong>este mismo navegador</strong>, si no el link no va a funcionar.
            </p>
          </>
        ) : (
          <form onSubmit={enviar}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              Ingresá tu email y te mandamos un enlace para crear una contraseña nueva.
            </p>
            <label className="label">Email</label>
            <input
              className="input" style={{ marginBottom: 20 }}
              type="email" required autoFocus autoComplete="username"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
              {loading ? 'Enviando...' : 'Enviarme el enlace'}
            </button>
          </form>
        )}

        <Link href="/login" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
          ← Volver al ingreso
        </Link>
      </div>
    </div>
  )
}
