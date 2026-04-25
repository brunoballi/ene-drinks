'use client'
import { useEffect, useState } from 'react'
import { getProductos, getCategorias, getProveedores, upsertProducto, deleteProducto, ajustarStock } from '@/lib/queries'
import { fmt, CATEGORIAS } from '@/lib/utils'
import { toast } from 'sonner'

const PER_PAGE = 20

const EMPTY_FORM = {
  id:             undefined as number | undefined,
  codigo:         '',
  nombre:         '',
  categoria_id:   '' as any,
  proveedor_id:   '' as any,
  unidades_x_caja: 6,
  costo_un:       '' as any,
  venta_un:       '' as any,
  venta_caja:     '' as any,
  stock_un:       0,
  stock_caja:     0,
}

export default function ProductosPage() {
  const [productos, setProductos]     = useState<any[]>([])
  const [categorias, setCategorias]   = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [filtrados, setFiltrados]     = useState<any[]>([])
  const [busqueda, setBusqueda]       = useState('')
  const [catFilter, setCatFilter]     = useState('')
  const [page, setPage]               = useState(0)
  const [loading, setLoading]         = useState(true)

  // Modal catálogo
  const [modalCat, setModalCat] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [saving, setSaving]     = useState(false)

  // Modal stock
  const [modalStock, setModalStock]   = useState(false)
  const [stockForm, setStockForm]     = useState({ id:0, nombre:'', stock_un:0, stock_caja:0, uxc:6 })
  const [savingStock, setSavingStock] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const [prods, cats, provs] = await Promise.all([getProductos(), getCategorias(), getProveedores()])
    setProductos(prods ?? [])
    setCategorias(cats ?? [])
    setProveedores(provs ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const q = busqueda.toLowerCase()
    setFiltrados(
      productos.filter(p =>
        (!q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)) &&
        (!catFilter || p.categoria === catFilter)
      )
    )
    setPage(0)
  }, [busqueda, catFilter, productos])

  const paginados  = filtrados.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(filtrados.length / PER_PAGE)

  const abrirNuevo = () => { setForm({ ...EMPTY_FORM }); setModalCat(true) }

  const abrirEditar = (p: any) => {
    setForm({
      id:             p.id,
      codigo:         p.codigo,
      nombre:         p.nombre,
      categoria_id:   categorias.find((c:any) => c.nombre === p.categoria)?.id ?? '',
      proveedor_id:   proveedores.find((pr:any) => pr.nombre === p.proveedor)?.id ?? '',
      unidades_x_caja: p.unidades_x_caja ?? 6,
      costo_un:       p.costo_un   ?? '',
      venta_un:       p.venta_un   ?? '',
      venta_caja:     p.venta_caja ?? '',
      stock_un:       p.stock_un   ?? 0,
      stock_caja:     p.stock_caja ?? 0,
    })
    setModalCat(true)
  }

  const abrirStock = (p: any) => {
    setStockForm({ id:p.id, nombre:p.nombre, stock_un:p.stock_un??0, stock_caja:p.stock_caja??0, uxc:p.unidades_x_caja??6 })
    setModalStock(true)
  }

  const guardarCatalogo = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) { toast.error('Código y nombre son obligatorios'); return }
    setSaving(true)
    try {
      await upsertProducto({
        id:             form.id,
        codigo:         form.codigo.trim().toUpperCase(),
        nombre:         form.nombre.trim(),
        categoria_id:   form.categoria_id  ? Number(form.categoria_id)  : null,
        proveedor_id:   form.proveedor_id  ? Number(form.proveedor_id)  : null,
        unidades_x_caja: Number(form.unidades_x_caja) || 6,
        costo_un:       form.costo_un   !== '' ? Number(form.costo_un)   : null,
        venta_un:       form.venta_un   !== '' ? Number(form.venta_un)   : null,
        venta_caja:     form.venta_caja !== '' ? Number(form.venta_caja) : null,
        ...(!form.id ? { stock_un: Number(form.stock_un)||0, stock_caja: Number(form.stock_caja)||0 } : {}),
      })
      toast.success(form.id ? 'Producto actualizado' : 'Producto creado')
      setModalCat(false); cargar()
    } catch (e:any) { toast.error(e.message ?? 'Error al guardar') }
    finally { setSaving(false) }
  }

  const guardarStock = async () => {
    if (stockForm.stock_un < 0 || stockForm.stock_caja < 0) { toast.error('El stock no puede ser negativo'); return }
    setSavingStock(true)
    try {
      await ajustarStock(stockForm.id, stockForm.stock_un, stockForm.stock_caja)
      const total = stockForm.stock_un + stockForm.stock_caja * stockForm.uxc
      toast.success(`Stock actualizado — ${total} unidades totales`)
      setModalStock(false); cargar()
    } catch (e:any) { toast.error(e.message ?? 'Error al actualizar stock') }
    finally { setSavingStock(false) }
  }

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar "${nombre}"?\nNo se eliminan datos históricos.`)) return
    try { await deleteProducto(id); toast.success('Producto desactivado'); cargar() }
    catch (e:any) { toast.error(e.message) }
  }

  const cajaCalc       = form.costo_un !== '' && form.unidades_x_caja ? fmt(Number(form.costo_un) * Number(form.unidades_x_caja)) : '—'
  const stockTotalPrev = stockForm.stock_un + stockForm.stock_caja * stockForm.uxc

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Productos</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{filtrados.length} de {productos.length} productos</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <input className="input" style={{ flex:1, minWidth:200 }} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre o código..." />
          <select className="input" style={{ width:220 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(busqueda || catFilter) && <button className="btn-ghost" onClick={() => { setBusqueda(''); setCatFilter('') }}>✕ Limpiar</button>}
        </div>

        {loading ? <p style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>Cargando...</p> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Código','Producto','Categoría','Proveedor','Costo UN','Venta UN','Venta CAJA','UxC','Stock UN','Stock CAJA','Total UN','Acciones'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginados.length === 0
                  ? <tr><td colSpan={12} style={{ padding:'30px 14px', textAlign:'center', color:'var(--text-muted)' }}>Sin resultados</td></tr>
                  : paginados.map(p => {
                    const st = p.stock_total_un ?? 0
                    const badgeCls = st === 0 ? 'badge-red' : st < 3 ? 'badge-amber' : 'badge-green'
                    return (
                      <tr key={p.id} className="table-row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'11px 14px' }}><span style={{ fontFamily:'monospace', fontSize:11, color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:4 }}>{p.codigo}</span></td>
                        <td style={{ padding:'11px 14px', fontWeight:500, maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</td>
                        <td style={{ padding:'11px 14px' }}>{p.categoria && <span className="badge badge-gold" style={{ fontSize:10 }}>{p.categoria}</span>}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{p.proveedor ?? '—'}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums' }}>{p.costo_un ? fmt(p.costo_un) : <span style={{ color:'var(--text-muted)', fontSize:11 }}>s/costo</span>}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(p.venta_un)}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums' }}>{p.venta_caja ? fmt(p.venta_caja) : '—'}</td>
                        <td style={{ padding:'11px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>{p.unidades_x_caja}</td>

                        {/* Stock UN y CAJA — clickeables para abrir modal */}
                        <td style={{ padding:'11px 14px', textAlign:'center' }}>
                          <StockBtn value={p.stock_un ?? 0} onClick={() => abrirStock(p)} />
                        </td>
                        <td style={{ padding:'11px 14px', textAlign:'center' }}>
                          <StockBtn value={p.stock_caja ?? 0} onClick={() => abrirStock(p)} />
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <span className={`badge ${badgeCls}`}>{st} un.</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', gap:5 }}>
                            <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:12, whiteSpace:'nowrap' }} onClick={() => abrirStock(p)}>📦 Stock</button>
                            <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:12 }} onClick={() => abrirEditar(p)}>✏️</button>
                            <button className="btn-danger"    style={{ padding:'5px 8px',  fontSize:12 }} onClick={() => eliminar(p.id, p.nombre)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', gap:6, marginTop:16, justifyContent:'center', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--text-muted)', marginRight:8 }}>{filtrados.length} resultados</span>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} style={{ width:30, height:30, borderRadius:6, border:'1px solid var(--border)', background: i===page ? 'var(--gold)' : 'rgba(255,255,255,0.05)', color: i===page ? 'var(--bordo-deep)' : 'var(--text-secondary)', cursor:'pointer', fontSize:13, fontWeight: i===page ? 600 : 400 }}>{i+1}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Catálogo ─────────────────────── */}
      {modalCat && (
        <Overlay onClose={() => setModalCat(false)}>
          <ModalHeader title={form.id ? 'Editar Producto' : 'Nuevo Producto'} onClose={() => setModalCat(false)} />
          <div style={{ padding:'20px 24px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label className="label">Código</label>
                <input className="input" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo:e.target.value }))} placeholder="VT1001" disabled={!!form.id} style={form.id ? { opacity:.5 } : {}} />
                {form.id && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>No editable</p>}
              </div>
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre:e.target.value }))} placeholder="Nombre del producto" />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id:e.target.value }))}>
                  <option value="">— Sin categoría —</option>
                  {categorias.map((c:any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Proveedor</label>
                <select className="input" value={form.proveedor_id} onChange={e => setForm(f => ({ ...f, proveedor_id:e.target.value }))}>
                  <option value="">— Sin proveedor —</option>
                  {proveedores.map((p:any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Costo unitario</label>
                <input className="input" type="number" value={form.costo_un} onChange={e => setForm(f => ({ ...f, costo_un:e.target.value }))} placeholder="Sin costo" />
              </div>
              <div>
                <label className="label">Precio venta UN</label>
                <input className="input" type="number" value={form.venta_un} onChange={e => setForm(f => ({ ...f, venta_un:e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">Unidades por caja</label>
                <input className="input" type="number" value={form.unidades_x_caja} onChange={e => setForm(f => ({ ...f, unidades_x_caja:Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Precio venta CAJA</label>
                <input className="input" type="number" value={form.venta_caja} onChange={e => setForm(f => ({ ...f, venta_caja:e.target.value }))} placeholder="0" />
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Costo×UxC calculado: {cajaCalc}</p>
              </div>
              {!form.id && (
                <>
                  <div>
                    <label className="label">Stock inicial UN</label>
                    <input className="input" type="number" min={0} value={form.stock_un} onChange={e => setForm(f => ({ ...f, stock_un:Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label">Stock inicial CAJAS</label>
                    <input className="input" type="number" min={0} value={form.stock_caja} onChange={e => setForm(f => ({ ...f, stock_caja:Number(e.target.value) }))} />
                  </div>
                </>
              )}
              {form.id && (
                <div style={{ gridColumn:'span 2', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text-muted)' }}>
                  💡 Para modificar el stock usá el botón <strong style={{ color:'var(--gold)' }}>📦 Stock</strong> en la grilla.
                </div>
              )}
            </div>
          </div>
          <ModalFooter onCancel={() => setModalCat(false)} onSave={guardarCatalogo} saving={saving} />
        </Overlay>
      )}

      {/* ── Modal Stock ─────────────────────────── */}
      {modalStock && (
        <Overlay onClose={() => setModalStock(false)}>
          <ModalHeader title="Ajustar Stock" onClose={() => setModalStock(false)} />
          <div style={{ padding:'20px 24px' }}>
            <p style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>{stockForm.nombre}</p>
            <div style={{ background:'var(--surface-3)', borderRadius:8, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>Stock total actual</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:'var(--gold)' }}>{stockTotalPrev} un.</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label className="label">Unidades sueltas (UN)</label>
                <input className="input" type="number" min={0} value={stockForm.stock_un} onChange={e => setStockForm(f => ({ ...f, stock_un:Math.max(0,Number(e.target.value)) }))} />
              </div>
              <div>
                <label className="label">Cajas completas</label>
                <input className="input" type="number" min={0} value={stockForm.stock_caja} onChange={e => setStockForm(f => ({ ...f, stock_caja:Math.max(0,Number(e.target.value)) }))} />
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{stockForm.uxc} un/caja = {stockForm.stock_caja * stockForm.uxc} unidades</p>
              </div>
            </div>
            <div style={{ marginTop:16, background:'rgba(91,173,122,0.08)', border:'1px solid rgba(91,173,122,0.2)', borderRadius:8, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>Nuevo total</span>
              <span style={{ fontSize:20, fontWeight:700, color:'#5BAD7A' }}>{stockForm.stock_un + stockForm.stock_caja * stockForm.uxc} un.</span>
            </div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:12 }}>⚠️ Ajuste directo. Para movimientos trazables usá Compras o Ventas.</p>
          </div>
          <ModalFooter onCancel={() => setModalStock(false)} onSave={guardarStock} saving={savingStock} label="Confirmar ajuste" />
        </Overlay>
      )}
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────
function StockBtn({ value, onClick }: { value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Click para editar stock" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-primary)', fontSize:13, fontWeight:500, padding:'3px 8px', borderRadius:4, transition:'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background='none')}>
      {value}
    </button>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:14, width:'90%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:600 }}>{title}</span>
      <button className="btn-ghost" onClick={onClose}>✕</button>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, label = 'Guardar' }: { onCancel: () => void; onSave: () => void; saving: boolean; label?: string }) {
  return (
    <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:10 }}>
      <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
      <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Guardando...' : label}</button>
    </div>
  )
}
