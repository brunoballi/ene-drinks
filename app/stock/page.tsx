'use client'
import { useEffect, useState } from 'react'
import { getProductosConStock } from '@/lib/queries'
import { fmt, stockTotal, STOCK_THRESHOLD } from '@/lib/utils'
import { StockView } from '@/types/database'

const PER_PAGE = 20

export default function StockPage() {
  const [items, setItems]       = useState<StockView[]>([])
  const [filtrados, setFiltrados] = useState<StockView[]>([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro]     = useState('todos')
  const [catFilter, setCatFilter] = useState('')
  const [provFilter, setProvFilter] = useState('')
  const [threshold, setThreshold] = useState(STOCK_THRESHOLD)
  const [page, setPage]         = useState(0)

  useEffect(() => {
    getProductosConStock().then(data => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = busqueda.toLowerCase()
    setFiltrados(items.filter(p => {
      const st = p.stock_total_un ?? 0
      const matchQ   = !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      const matchF   = filtro === 'todos' ? true
        : filtro === 'bajo'  ? st > 0 && st < threshold
        : filtro === 'cero'  ? st === 0
        : st >= threshold
      const matchCat  = !catFilter || p.categoria === catFilter
      const matchProv = !provFilter || p.proveedor === provFilter
      return matchQ && matchF && matchCat && matchProv
    }))
    setPage(0)
  }, [busqueda, filtro, catFilter, provFilter, threshold, items])

  const categoriasDisp  = Array.from(new Set(items.map(p => p.categoria).filter(Boolean))).sort() as string[]
  const proveedoresDisp = Array.from(new Set(items.map(p => p.proveedor).filter(Boolean))).sort() as string[]

  const totalPages = Math.ceil(filtrados.length / PER_PAGE)
  const paginados   = filtrados.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const bajo  = items.filter(p => (p.stock_total_un ?? 0) > 0 && (p.stock_total_un ?? 0) < threshold).length
  const cero  = items.filter(p => (p.stock_total_un ?? 0) === 0).length
  const ok    = items.filter(p => (p.stock_total_un ?? 0) >= threshold).length

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Control de Stock</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            {ok} OK · <span style={{ color:'#E0A050' }}>{bajo} bajo</span> · <span style={{ color:'#E05252' }}>{cero} sin stock</span>
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Umbral alerta:</span>
          <input
            type="number" min={0} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="input" style={{ width:64 }}
          />
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>unidades</span>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="kpi-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        <KpiStock label="Stock OK" valor={ok} color="#5BAD7A" onClick={() => setFiltro('ok')} active={filtro==='ok'} />
        <KpiStock label="Stock bajo" valor={bajo} color="#E0A050" onClick={() => setFiltro('bajo')} active={filtro==='bajo'} />
        <KpiStock label="Sin stock" valor={cero} color="#E05252" onClick={() => setFiltro('cero')} active={filtro==='cero'} />
      </div>

      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <input
            className="input" style={{ flex:1, minWidth:200 }}
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
          />
          <select className="input" style={{ width:180 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="bajo">Stock bajo</option>
            <option value="cero">Sin stock</option>
            <option value="ok">Stock OK</option>
          </select>
          <select className="input" style={{ width:200 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categoriasDisp.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" style={{ width:200 }} value={provFilter} onChange={e => setProvFilter(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedoresDisp.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(filtro !== 'todos' || catFilter || provFilter) && (
            <button className="btn-ghost" onClick={() => { setFiltro('todos'); setCatFilter(''); setProvFilter('') }}>✕ Limpiar filtro</button>
          )}
        </div>

        {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando...</p> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead className="grid-thead">
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Código','Producto','Categoría','Proveedor','Stock UN','Stock CAJA','Total UN','UxC','Estado'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0
                  ? <tr><td colSpan={9} style={{ padding:'30px 14px', textAlign:'center', color:'var(--text-muted)' }}>Sin resultados</td></tr>
                  : paginados.map(p => {
                    const st = p.stock_total_un ?? 0
                    const dotColor = st === 0 ? '#E05252' : st < threshold ? '#E0A050' : '#5BAD7A'
                    const badgeCls = st === 0 ? 'badge-red' : st < threshold ? 'badge-amber' : 'badge-green'
                    const label    = st === 0 ? 'Sin stock' : st < threshold ? 'Stock bajo' : 'OK'
                    return (
                      <tr key={p.id} className="table-row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:4 }}>{p.codigo}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:500, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</td>
                        <td style={{ padding:'11px 14px' }}>
                          {p.categoria && <span className="badge badge-gold" style={{ fontSize:10 }}>{p.categoria}</span>}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{p.proveedor ?? '—'}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', textAlign:'center' }}>{p.stock_un}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', textAlign:'center' }}>{p.stock_caja}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', fontWeight:600, textAlign:'center' }}>{st}</td>
                        <td style={{ padding:'11px 14px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>{p.unidades_x_caja}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
                            <span className={`badge ${badgeCls}`}>{label}</span>
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
    </div>
  )
}

function KpiStock({ label, valor, color, onClick, active }: any) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}18` : 'var(--surface-2)',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 12, padding:'16px 20px', cursor:'pointer', textAlign:'left',
      transition:'all 0.15s',
    }}>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color, marginTop:6, lineHeight:1 }}>{valor}</div>
    </button>
  )
}
