'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getNegocio } from '@/lib/queries'

export default function BienvenidaPage() {
  const [negocio, setNegocio] = useState<{ nombre: string; logo_url: string | null } | null>(null)

  useEffect(() => { getNegocio().then(setNegocio).catch(() => setNegocio({ nombre: 'Flowi Gestor', logo_url: null })) }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', textAlign: 'center', padding: 24 }}>
      {negocio?.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={negocio.logo_url} alt={negocio.nombre} style={{ maxWidth: 140, maxHeight: 140, marginBottom: 24, borderRadius: 16, objectFit: 'contain' }} />
      )}
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--gold)', marginBottom: 8 }}>
        {negocio?.nombre ?? 'Flowi Gestor'}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>Bienvenido de nuevo</p>
      <Link href="/dashboard" className="btn-primary">Ingresar al sistema</Link>
    </div>
  )
}
