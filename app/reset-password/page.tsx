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

  // Validación del enlace del mail.
  //
  // Lo importante acá: supabase-js **ya hace el trabajo solo**. Apenas se crea
  // el cliente detecta el token en la URL, lo canjea por una sesión y de paso
  // borra los parámetros de la barra de direcciones.
  //
  // Eso rompía la versión anterior de esta pantalla, que leía la URL a mano:
  // para cuando el efecto corría, la URL ya estaba limpia, no encontraba
  // ningún token y mostraba "el enlace no es válido" — con el enlace intacto y
  // la sesión recién creada. Un enlace perfectamente bueno se veía como vencido.
  //
  // Ahora escuchamos el aviso de la librería (evento PASSWORD_RECOVERY) y,
  // como red de seguridad, consultamos la sesión unas cuantas veces antes de
  // dar el enlace por inválido. Nada de leer ni canjear el token a mano.
  useEffect(() => {
    const sb = createClient()
    let cancelado = false

    const listo = () => { if (!cancelado) setEstado('listo') }

    const { data: suscripcion } = sb.auth.onAuthStateChange((evento, session) => {
      if (evento === 'PASSWORD_RECOVERY' || (session && evento === 'SIGNED_IN')) listo()
    })

    // Nada de canjear el token a mano.
    //
    // El token del mail sirve UNA sola vez. Si lo canjeamos nosotros mientras
    // la librería está haciendo lo mismo, uno de los dos pierde la carrera y
    // recibe un error — y esta pantalla terminaba mostrando "enlace inválido"
    // por el intento perdido, con la sesión ya creada por el que ganó.
    //
    // Lo único que hacemos es esperar a que la sesión aparezca.
    const validar = async () => {
      for (const espera of [0, 300, 600, 1000, 1500, 2000]) {
        if (cancelado) return
        if (espera) await new Promise(r => setTimeout(r, espera))
        const { data } = await sb.auth.getSession()
        if (data.session) { listo(); return }
      }
      if (!cancelado) setEstado('invalido')
    }

    validar()
    return () => { cancelado = true; suscripcion.subscription.unsubscribe() }
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

    // Cerramos la sesión que abrió el enlace del mail y devolvemos al login.
    //
    // El enlace de recuperación deja una sesión iniciada, así que se podría
    // entrar directo al sistema. Preferimos no hacerlo: que la persona use la
    // contraseña nueva una vez confirma que quedó bien guardada y que se la
    // acuerda, en vez de descubrir el problema recién en el próximo ingreso.
    await sb.auth.signOut()
    router.push('/login?cambiada=1')
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
