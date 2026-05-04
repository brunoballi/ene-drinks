'use client'
import { useEffect, useState, useCallback } from 'react'
import { getVentas, eliminarVenta } from '@/lib/queries'
import { fmt } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

const PER_PAGE = 20

export default function HistorialPage() {
  const [ventas, setVentas]       = useState<any[]>([])
  const [filtradas, setFiltradas] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [busqueda, setBusqueda]   = useState('')
  const [desde, setDesde]         = useState('')
  const [hasta, setHasta]         = useState('')
  const [page, setPage]           = useState(0)

  // Carga inicial — sin filtros de fecha para traer TODO el historial
  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getVentas()
      setVentas(data ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar ventas')
      setVentas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const eliminar = async (v: any) => {
    const nombres = (v.ventas_detalle ?? [])
      .map((d: any) => d.productos?.nombre).filter(Boolean).join(', ') || 'sin detalle'
    if (!confirm(`¿Eliminar la venta #${v.nro_venta}?\n${nombres}\nTotal: ${fmt(v.total ?? 0)}\n\n⚠️ Esta acción no se puede deshacer y no restaura el stock.`)) return
    try {
      await eliminarVenta(v.id)
      setVentas(prev => prev.filter(x => x.id !== v.id))
      toast.success(`Venta #${v.nro_venta} eliminada`)
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar')
    }
  }

  // Filtrado local — reactivo a busqueda + fechas sin necesitar nueva query
  useEffect(() => {
    const q = busqueda.toLowerCase().trim()

    const result = ventas.filter(v => {
      // Filtro texto: número de venta o nombre de producto
      const matchQ = !q
        || String(v.nro_venta).includes(q)
        || (v.ventas_detalle ?? []).some((d: any) =>
            d.productos?.nombre?.toLowerCase().includes(q) ||
            d.productos?.codigo?.toLowerCase().includes(q)
          )

      // Filtro fecha — comparación de strings ISO (YYYY-MM-DD) funciona lexicográficamente
      const fecha = v.fecha ?? ''
      const matchD = !desde || fecha >= desde
      const matchH = !hasta || fecha <= hasta

      return matchQ && matchD && matchH
    })

    setFiltradas(result)
    setPage(0)
  }, [busqueda, desde, hasta, ventas])

  const totalPages     = Math.ceil(filtradas.length / PER_PAGE)
  const paginadas      = filtradas.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalImporte   = filtradas.reduce((s, v) => s + (v.total    ?? 0), 0)
  const totalGanancia  = filtradas.reduce((s, v) => s + (v.ganancia ?? 0), 0)
  const hayFiltro      = busqueda || desde || hasta

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Historial de Ventas</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            {loading ? 'Cargando...' : (
              <>
                <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{filtradas.length}</span>
                {' ventas'}
                {hayFiltro ? ' (filtrado)' : ` de ${ventas.length} totales`}
                {filtradas.length > 0 && (
                  <> · {fmt(totalImporte)} · Ganancia <span style={{ color:'#5BAD7A' }}>{fmt(totalGanancia)}</span></>
                )}
              </>
            )}
          </p>
        </div>
        <Link href="/ventas/nueva" className="btn-primary">+ Nueva venta</Link>
      </div>

      {/* Error de carga */}
      {error && (
        <div style={{ background:'rgba(224,82,82,0.1)', border:'1px solid rgba(224,82,82,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <p style={{ fontSize:13, color:'#E05252', fontWeight:500 }}>Error al conectar con la base de datos</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{error}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
              💡 Probable causa: las políticas RLS bloquean la anon key. Ejecutá <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 5px', borderRadius:3, fontSize:11 }}>fix_rls.sql</code> en el SQL Editor de Supabase.
            </p>
          </div>
          <button className="btn-secondary" style={{ fontSize:12, whiteSpace:'nowrap' }} onClick={cargar}>Reintentar</button>
        </div>
      )}

      <div className="card" style={{ padding:20 }}>
        {/* Toolbar de filtros */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>

          {/* Búsqueda texto */}
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5"/>
            </svg>
            <input
              className="input"
              style={{ paddingLeft:32 }}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por producto, código o nro. venta..."
            />
          </div>

          {/* Fecha desde */}
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <label style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Desde</label>
            <input
              className="input"
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              style={{ width:155 }}
            />
          </div>

          {/* Fecha hasta */}
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <label style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Hasta</label>
            <input
              className="input"
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              style={{ width:155 }}
            />
          </div>

          {/* Limpiar — solo visible si hay algo activo */}
          {hayFiltro && (
            <button
              className="btn-ghost"
              style={{ marginTop:18 }}
              onClick={() => { setBusqueda(''); setDesde(''); setHasta('') }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Chips de resumen de filtro activo */}
        {hayFiltro && (
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            {busqueda && (
              <span style={{ fontSize:12, background:'rgba(201,168,76,0.12)', color:'var(--gold)', padding:'3px 10px', borderRadius:20 }}>
                "{busqueda}"
              </span>
            )}
            {desde && (
              <span style={{ fontSize:12, background:'rgba(201,168,76,0.12)', color:'var(--gold)', padding:'3px 10px', borderRadius:20 }}>
                Desde {desde}
              </span>
            )}
            {hasta && (
              <span style={{ fontSize:12, background:'rgba(201,168,76,0.12)', color:'var(--gold)', padding:'3px 10px', borderRadius:20 }}>
                Hasta {hasta}
              </span>
            )}
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div style={{ padding:'40px 0', textAlign:'center' }}>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando ventas...</p>
          </div>
        ) : ventas.length === 0 && !error ? (
          <div style={{ padding:'40px 0', textAlign:'center' }}>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>No hay ventas registradas todavía.</p>
            <Link href="/ventas/nueva" style={{ fontSize:13, color:'var(--gold)', textDecoration:'none', marginTop:8, display:'inline-block' }}>
              Registrar la primera venta →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {[
                    { label:'#',          w:'auto' },
                    { label:'Fecha',      w:110 },
                    { label:'Productos',  w:'auto' },
                    { label:'Ítems',      w:60 },
                    { label:'Total',      w:110 },
                    { label:'Ganancia',   w:110 },
                    { label:'Forma pago', w:120 },
                    { label:'', w:50 },
                  ].map(h => (
                    <th key={h.label} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap', width: h.w }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginadas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding:'30px 14px', textAlign:'center', color:'var(--text-muted)' }}>
                      Sin resultados para los filtros aplicados
                    </td>
                  </tr>
                ) : paginadas.map(v => {
                  const detalles  = v.ventas_detalle ?? []
                  const nombres   = detalles.map((d: any) => d.productos?.nombre).filter(Boolean).join(', ') || '—'
                  const cantItems = detalles.reduce((s: number, d: any) => s + (d.cantidad ?? 0), 0)

                  return (
                    <tr key={v.id} className="table-row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:4 }}>
                          #{v.nro_venta}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px', color:'var(--text-muted)', fontSize:12, whiteSpace:'nowrap' }}>
                        {v.fecha}
                      </td>
                      <td style={{ padding:'11px 14px', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {nombres}
                      </td>
                      <td style={{ padding:'11px 14px', textAlign:'center', color:'var(--text-muted)' }}>
                        {cantItems || '—'}
                      </td>
                      <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>
                        {fmt(v.total)}
                      </td>
                      <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', color: (v.ganancia ?? 0) > 0 ? '#5BAD7A' : 'var(--text-muted)' }}>
                        {v.ganancia != null ? fmt(v.ganancia) : <span style={{ fontSize:11, color:'var(--text-muted)' }}>s/costo</span>}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        {v.forma_pago
                          ? <span className="badge badge-muted">{v.forma_pago}</span>
                          : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'11px 8px' }}>
                        <button
                          onClick={() => eliminar(v)}
                          title="Eliminar venta"
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:'4px 6px', borderRadius:4, transition:'all 0.15s', lineHeight:1 }}
                          onMouseEnter={e => { e.currentTarget.style.color='#E05252'; e.currentTarget.style.background='rgba(224,82,82,0.1)' }}
                          onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='none' }}
                        >🗑</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:16, justifyContent:'center' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p-1))}
              disabled={page === 0}
              style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', background:'rgba(255,255,255,0.05)', color:'var(--text-secondary)', cursor: page===0 ? 'not-allowed' : 'pointer', opacity: page===0 ? 0.4 : 1 }}
            >←</button>

            {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
              // Mostrar páginas alrededor de la actual
              const mid = Math.min(Math.max(page, 3), totalPages - 4)
              if (totalPages <= 8 || Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1) {
                return (
                  <button key={i} onClick={() => setPage(i)} style={{
                    width:30, height:30, borderRadius:6,
                    border:'1px solid var(--border)',
                    background: i===page ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                    color: i===page ? 'var(--bordo-deep)' : 'var(--text-secondary)',
                    cursor:'pointer', fontSize:13, fontWeight: i===page ? 600 : 400,
                  }}>{i+1}</button>
                )
              }
              if (Math.abs(i - page) === 3) return <span key={i} style={{ color:'var(--text-muted)' }}>…</span>
              return null
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
              disabled={page === totalPages-1}
              style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', background:'rgba(255,255,255,0.05)', color:'var(--text-secondary)', cursor: page===totalPages-1 ? 'not-allowed' : 'pointer', opacity: page===totalPages-1 ? 0.4 : 1 }}
            >→</button>

            <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:8 }}>
              Página {page+1} de {totalPages} · {filtradas.length} resultados
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
