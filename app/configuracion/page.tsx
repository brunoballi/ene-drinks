'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCategorias, upsertCategoria, deleteCategoria,
  getProveedores, upsertProveedor, deleteProveedor,
  getNegocio, upsertNegocio, subirLogo,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ConfiguracionPage() {
  const [categorias, setCategorias]   = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [negocio, setNegocio]         = useState<{ nombre: string; logo_url: string | null } | null>(null)
  const [userEmail, setUserEmail]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)

  const cargar = async () => {
    const [cats, provs, neg] = await Promise.all([getCategorias(), getProveedores(), getNegocio().catch(() => null)])
    setCategorias(cats ?? [])
    setProveedores(provs ?? [])
    setNegocio(neg)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Categorías y proveedores del sistema</p>
      </div>

      <div className="dash-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <AbmSimple
          titulo="Categorías de productos"
          items={categorias}
          loading={loading}
          placeholder="Nombre de la categoría"
          onGuardar={async (id, nombre) => {
            await upsertCategoria({ id, nombre })
            toast.success(id ? 'Categoría actualizada' : 'Categoría creada')
            cargar()
          }}
          onEliminar={async (id, nombre) => {
            if (!confirm(`¿Eliminar la categoría "${nombre}"?\nLos productos que la usan quedarán sin categoría.`)) return
            try { await deleteCategoria(id); toast.success('Categoría eliminada'); cargar() }
            catch (e: any) { toast.error(e.message ?? 'No se pudo eliminar (puede estar en uso)') }
          }}
        />
        <AbmSimple
          titulo="Proveedores"
          items={proveedores}
          loading={loading}
          placeholder="Nombre del proveedor"
          onGuardar={async (id, nombre) => {
            await upsertProveedor({ id, nombre })
            toast.success(id ? 'Proveedor actualizado' : 'Proveedor creado')
            cargar()
          }}
          onEliminar={async (id, nombre) => {
            if (!confirm(`¿Desactivar el proveedor "${nombre}"?`)) return
            try { await deleteProveedor(id); toast.success('Proveedor desactivado'); cargar() }
            catch (e: any) { toast.error(e.message ?? 'Error al desactivar') }
          }}
        />
      </div>

      <div className="dash-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <NegocioCard negocio={negocio} onGuardado={cargar} />
        <AdministradoresCard userEmail={userEmail} />
      </div>
    </div>
  )
}

// ── Datos del negocio (nombre + logo) ───────────────────────
function NegocioCard({ negocio, onGuardado }: { negocio: { nombre: string; logo_url: string | null } | null; onGuardado: () => void }) {
  const [nombre, setNombre]   = useState(negocio?.nombre ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(negocio?.logo_url ?? null)
  const [saving, setSaving]   = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    setNombre(negocio?.nombre ?? '')
    setLogoUrl(negocio?.logo_url ?? null)
  }, [negocio])

  const subir = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('El archivo debe ser una imagen'); return }
    setSubiendo(true)
    try {
      const url = await subirLogo(file)
      setLogoUrl(url)
      toast.success('Logo subido')
    } catch (e: any) { toast.error(e.message ?? 'Error al subir el logo') }
    finally { setSubiendo(false) }
  }

  const guardar = async () => {
    if (!nombre.trim()) { toast.error('El nombre del negocio es obligatorio'); return }
    setSaving(true)
    try {
      await upsertNegocio({ nombre: nombre.trim(), logo_url: logoUrl })
      toast.success('Datos del negocio actualizados')
      onGuardado()
    } catch (e: any) { toast.error(e.message ?? 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
        Datos del negocio
      </p>

      <label className="label">Logo</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sin logo</span>}
        </div>
        <label className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
          {subiendo ? 'Subiendo...' : 'Cambiar imagen'}
          <input
            type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo}
            onChange={e => e.target.files?.[0] && subir(e.target.files[0])}
          />
        </label>
      </div>

      <label className="label">Nombre del negocio</label>
      <input className="input" style={{ marginBottom: 16 }} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre que se muestra en la app" />

      <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
    </div>
  )
}

// ── Administradores ──────────────────────────────────────────
function AdministradoresCard({ userEmail }: { userEmail: string | null }) {
  const router = useRouter()

  const cerrarSesion = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
        Administradores
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 13 }}>{userEmail ?? '—'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sesión actual</p>
        </div>
        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
    </div>
  )
}

// ── ABM genérico (solo nombre) ──────────────────────────────
const PER_PAGE = 8

function AbmSimple({
  titulo, items, loading, placeholder, onGuardar, onEliminar,
}: {
  titulo: string
  items: any[]
  loading: boolean
  placeholder: string
  onGuardar: (id: number | undefined, nombre: string) => Promise<void>
  onEliminar: (id: number, nombre: string) => Promise<void>
}) {
  const [modal, setModal]   = useState(false)
  const [id, setId]         = useState<number | undefined>(undefined)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage]     = useState(0)

  const totalPages = Math.ceil(items.length / PER_PAGE)
  const paginados  = items.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  // Si se borra el último ítem de la página actual, retroceder una
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const abrirNuevo = () => { setId(undefined); setNombre(''); setModal(true) }
  const abrirEditar = (item: any) => { setId(item.id); setNombre(item.nombre); setModal(true) }

  const guardar = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try { await onGuardar(id, nombre.trim()); setModal(false) }
    catch (e: any) { toast.error(e.message ?? 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {titulo} ({items.length})
        </p>
        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={abrirNuevo}>+ Nuevo</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin registros todavía.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginados.map((item: any) => (
              <div key={item.id} className="table-row-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 6 }}>
                <span style={{ fontSize: 13 }}>{item.nombre}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => abrirEditar(item)}>✏️</button>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: '#E05252' }} onClick={() => onEliminar(item.id, item.nombre)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 14, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
              >←</button>

              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} style={{
                  width: 27, height: 27, borderRadius: 6, border: '1px solid var(--border)',
                  background: i === page ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  color: i === page ? 'var(--bordo-deep)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontWeight: i === page ? 600 : 400,
                }}>{i + 1}</button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1 }}
              >→</button>
            </div>
          )}
        </>
      )}

      {modal && (
        <Overlay onClose={() => setModal(false)}>
          <ModalHeader title={id ? `Editar ${titulo.toLowerCase()}` : `Nueva/o ${titulo.toLowerCase()}`} onClose={() => setModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            <label className="label">Nombre</label>
            <input
              className="input"
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder={placeholder}
              onKeyDown={e => e.key === 'Enter' && guardar()}
            />
          </div>
          <ModalFooter onCancel={() => setModal(false)} onSave={guardar} saving={saving} />
        </Overlay>
      )}
    </div>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, width: '90%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 600, textTransform: 'capitalize' }}>{title}</span>
      <button className="btn-ghost" onClick={onClose}>✕</button>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
      <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
    </div>
  )
}
