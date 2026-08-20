'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

type Estado = 'validando' | 'listo' | 'invalido'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [estado, setEstado]     = useState<Estado>('validando')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir]   = useState('')
  const [saving, setSaving]     = useState(false)

  // El enlace del mail puede llegar de dos formas según la config de Supabase:
  //   ?code=...                          (flujo PKCE, el default de @supabase/ssr)
  //   #access_token=...&type=recovery    (flujo por fragmento)
  // Contemplamos las dos para no depender de cómo quede configurado el proyecto.
  useEffect(() => {
    const sb = createClient()

    const validar = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code)
        setEstado(error ? 'invalido' : 'listo')
        return
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const access_token  = hash.get('access_token')
      const refresh_token = hash.get('refresh_token')
      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token })
        setEstado(error ? 'invalido' : 'listo')
        return
      }

      // Sin token en la URL: puede haber sesión activa (ej. recarga de página).
      const { data } = await sb.auth.getUser()
      setEstado(data.user ? 'listo' : 'invalido')
    }

    validar()
  }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== repetir) { toast.error('Las contraseñas no coinciden'); return }
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password })
    setSaving(false)
    if (error) { toast.error(error.message ?? 'No se pudo cambiar la contraseña'); return }
    toast.success('Contraseña actualizada')
    router.push('/bienvenida')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.03em' }}>
            Nueva contraseña
          </span>
        </div>

        {estado === 'validando' && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Validando el enlace...</p>
        )}

        {estado === 'invalido' && (
          <>
            <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
              El enlace no es válido o ya venció.
              <br /><br />
              Acordate de abrirlo en el mismo navegador desde el que pediste el cambio, y dentro de la hora.
            </div>
            <Link href="/recuperar" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
              Pedir un enlace nuevo
            </Link>
          </>
        )}

        {estado === 'listo' && (
          <form onSubmit={guardar}>
            <label className="label">Contraseña nueva</label>
            <input
              className="input" style={{ marginBottom: 14 }}
              type="password" required autoFocus autoComplete="new-password" minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <label className="label">Repetir contraseña</label>
            <input
              className="input" style={{ marginBottom: 20 }}
              type="password" required autoComplete="new-password" minLength={6}
              value={repetir} onChange={e => setRepetir(e.target.value)}
              placeholder="••••••••"
            />
            <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
              {saving ? 'Guardando...' : 'Guardar contraseña'}
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
