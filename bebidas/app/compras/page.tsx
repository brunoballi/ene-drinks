'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { getCompras, getProveedores, registrarCompra, searchProductos } from '@/lib/queries'
import { fmt, today } from '@/lib/utils'
import { toast } from 'sonner'

const EMPTY = {
  fecha: today(), proveedorId: '' as any, productoId: null as number | null,
  productoNombre: '', tipo: 'UN' as 'UN' | 'CAJA',
  cantidad: 1, costoTotal: '' as any, pagado: false,
}

export default function ComprasPage() {
  const [compras, setCompras]       = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState({ ...EMPTY })
  const [saving, setSaving]         = useState(false)
  const [prodResults, setProdResults] = useState<any[]>([])
  const [showAC, setShowAC]         = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const cargar = async () => {
    const [c, p] = await Promise.all([getCompras(), getProveedores()])
    setCompras(c ?? []); setProveedores(p ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const buscarProducto = useCallback((q: string) => {
    setForm(f => ({ ...f, productoNombre: q, productoId: null }))
    clearTimeout(debounceRef.current)
    if (q.length < 1) { setProdResults([]); setShowAC(false); return }
    debounceRef.current = setTimeout(async () => {
      const data = await searchProductos(q)
      setProdResults(data ?? []); setShowAC(true)
    }, 200)
  }, [])

  const selProd = (p: any) => {
    setForm(f => ({ ...f, productoId: p.id, productoNombre: p.nombre }))
    setShowAC(false)
  }

  const guardar = async () => {
    if (!form.productoId) { toast.error('Seleccioná un producto'); return }
    if (!form.costoTotal || Number(form.costoTotal) <= 0) { toast.error('Ingresá el costo total'); return }
    setSaving(true)
    try {
      await registrarCompra({
        fecha: form.fecha,
        proveedorId: form.proveedorId ? Number(form.proveedorId) : null,
        productoId: form.productoId,
        tipo: form.tipo,
        cantidad: Number(form.cantidad),
        costoTotal: Number(form.costoTotal),
        pagado: form.pagado,
      })
      toast.success('Compra registrada — stock actualizado')
      setModal(false)
      setForm({ ...EMPTY, fecha: today() })
      cargar()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // Deuda por proveedor (de compras no pagadas)
  const deudas: Record<string, number> = {}
  compras.forEach((c: any) => {
    if (!c.pagado && c.proveedores?.nombre) {
      deudas[c.proveedores.nombre] = (deudas[c.proveedores.nombre] ?? 0) + (c.costo_total ?? 0)
    }
  })

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Compras</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{compras.length} registros</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ ...EMPTY, fecha:today() }); setModal(true) }}>+ Registrar compra</button>
      </div>

      {/* Deuda por proveedor */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {['ALVV','PROCOPIO','Krow'].map(prov => (
          <div key={prov} className="kpi-card">
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--gold)' }} />
            <div className="kpi-label">Deuda {prov}</div>
            <div className="kpi-value" style={{ fontSize:22, color: deudas[prov] ? '#E05252' : '#5BAD7A' }}>
              {fmt(deudas[prov] ?? 0)}
            </div>
            <div className="kpi-sub">{deudas[prov] ? 'pendiente de pago' : 'al día'}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:20 }}>
        {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando...</p> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Fecha','Proveedor','Producto','Tipo','Cantidad','Costo total','Pagado'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compras.length === 0
                  ? <tr><td colSpan={7} style={{ padding:'30px 14px', textAlign:'center', color:'var(--text-muted)' }}>Sin compras registradas</td></tr>
                  : compras.map((c:any) => (
                    <tr key={c.id} className="table-row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{c.fecha}</td>
                      <td style={{ padding:'11px 14px' }}>
                        {c.proveedores?.nombre
                          ? <span className="badge badge-gold">{c.proveedores.nombre}</span>
                          : <span style={{ color:'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding:'11px 14px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.productos?.nombre ?? '—'}</td>
                      <td style={{ padding:'11px 14px' }}><span className="badge badge-muted">{c.tipo}</span></td>
                      <td style={{ padding:'11px 14px', textAlign:'center' }}>{c.cantidad}</td>
                      <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(c.costo_total)}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span className={`badge ${c.pagado ? 'badge-green' : 'badge-amber'}`}>
                          {c.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:14, width:'90%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:600 }}>Registrar Compra</span>
              <button className="btn-ghost" onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={{ padding:'20px 24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

                <div>
                  <label className="label">Fecha</label>
                  <input className="input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))} />
                </div>
                <div>
                  <label className="label">Proveedor</label>
                  <select className="input" value={form.proveedorId} onChange={e => setForm(f => ({ ...f, proveedorId:e.target.value }))}>
                    <option value="">— Sin especificar —</option>
                    {proveedores.map((p:any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn:'span 2', position:'relative' }}>
                  <label className="label">Producto</label>
                  <input
                    className="input" value={form.productoNombre}
                    onChange={e => buscarProducto(e.target.value)}
                    onBlur={() => setTimeout(() => setShowAC(false), 150)}
                    placeholder="Buscar producto..."
                    autoComplete="off"
                  />
                  {showAC && prodResults.length > 0 && (
                    <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50, background:'var(--surface-3)', border:'1px solid var(--border-hover)', borderRadius:8, maxHeight:200, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                      {prodResults.map((p:any) => (
                        <div key={p.id} onMouseDown={() => selProd(p)}
                          style={{ padding:'10px 14px', cursor:'pointer', display:'flex', gap:10, alignItems:'center', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => (e.currentTarget.style.background='rgba(201,168,76,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                          <span style={{ fontFamily:'monospace', fontSize:10, color:'var(--text-muted)', background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:3 }}>{p.codigo}</span>
                          <span style={{ flex:1 }}>{p.nombre}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo:e.target.value as 'UN'|'CAJA' }))}>
                    <option value="UN">Unidad</option>
                    <option value="CAJA">Caja</option>
                  </select>
                </div>
                <div>
                  <label className="label">Cantidad</label>
                  <input className="input" type="number" min={1} value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad:Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Costo total</label>
                  <input className="input" type="number" value={form.costoTotal} onChange={e => setForm(f => ({ ...f, costoTotal:e.target.value }))} placeholder="0" />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:22 }}>
                  <input type="checkbox" id="pagado" checked={form.pagado} onChange={e => setForm(f => ({ ...f, pagado:e.target.checked }))}
                    style={{ width:16, height:16, accentColor:'var(--gold)' }} />
                  <label htmlFor="pagado" className="label" style={{ margin:0 }}>Pagado</label>
                </div>

              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Registrar compra'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
