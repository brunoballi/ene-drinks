'use client'
import { useEffect, useState } from 'react'
import { getGanancias } from '@/lib/queries'
import { fmt, today } from '@/lib/utils'
import { GananciaView } from '@/types/database'

export default function GananciasPage() {
  const [data, setData]       = useState<GananciaView[]>([])
  const [filtradas, setFiltradas] = useState<GananciaView[]>([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState(today())

  useEffect(() => {
    getGanancias().then(d => { setData(d ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    setFiltradas(data.filter(v =>
      (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta)
    ))
  }, [desde, hasta, data])

  // KPIs
  const hoy    = today()
  const hace7  = new Date(); hace7.setDate(hace7.getDate() - 7)
  const semStr = hace7.toLocaleDateString('en-CA', { timeZone:'America/Argentina/Buenos_Aires' })
  const mesStr = today().slice(0, 7)

  const sumGan = (arr: GananciaView[]) => arr.reduce((s, v) => s + (v.ganancia ?? 0), 0)
  const sumIng = (arr: GananciaView[]) => arr.reduce((s, v) => s + (v.ingreso ?? 0), 0)

  const ganHoy    = sumGan(data.filter(v => v.fecha === hoy))
  const ganSemana = sumGan(data.filter(v => v.fecha >= semStr))
  const ganMes    = sumGan(data.filter(v => v.fecha.startsWith(mesStr)))
  const ingMes    = sumIng(data.filter(v => v.fecha.startsWith(mesStr)))
  const margenMes = ingMes > 0 ? Math.round(ganMes / ingMes * 100) : 0

  const totalFiltrado = sumGan(filtradas)
  const ingFiltrado   = sumIng(filtradas)

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Ganancias</h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Margen por venta</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <KpiG label="Ganancia hoy"    valor={fmt(ganHoy)}    />
        <KpiG label="Ganancia semana" valor={fmt(ganSemana)} />
        <KpiG label="Ganancia mes"    valor={fmt(ganMes)}    />
        <KpiG label="Margen del mes"  valor={`${margenMes}%`} />
      </div>

      <div className="card" style={{ padding:20 }}>
        {/* Filtros */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width:160 }} />
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>hasta</span>
          <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width:160 }} />
          <button className="btn-ghost" onClick={() => { setDesde(''); setHasta(today()) }}>Limpiar</button>
          <div style={{ marginLeft:'auto', fontSize:13, color:'var(--text-muted)' }}>
            {filtradas.length} ventas · Ingreso {fmt(ingFiltrado)} · Ganancia <span style={{ color:'#5BAD7A', fontWeight:600 }}>{fmt(totalFiltrado)}</span>
          </div>
        </div>

        {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando...</p> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead className="grid-thead">
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Fecha','Nro. venta','Ítems','Ingreso','Costo','Ganancia','Margen'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0
                  ? <tr><td colSpan={7} style={{ padding:'30px 14px', textAlign:'center', color:'var(--text-muted)' }}>Sin resultados</td></tr>
                  : filtradas.map(v => {
                    const margen = v.margen_pct ?? 0
                    return (
                      <tr key={v.id} className="table-row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{v.fecha}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:4 }}>#{v.nro_venta}</span>
                        </td>
                        <td style={{ padding:'11px 14px', textAlign:'center', color:'var(--text-muted)' }}>{v.cant_unidades}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums' }}>{fmt(v.ingreso)}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', color:'var(--text-muted)' }}>{fmt(v.costo)}</td>
                        <td style={{ padding:'11px 14px', fontVariantNumeric:'tabular-nums', color:'#5BAD7A', fontWeight:600 }}>{fmt(v.ganancia)}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                              <div style={{ height:'100%', background: margen >= 30 ? '#5BAD7A' : margen >= 15 ? '#E0A050' : '#E05252', borderRadius:2, width:`${Math.min(margen,100)}%` }} />
                            </div>
                            <span style={{ fontSize:12, color: margen >= 30 ? '#5BAD7A' : margen >= 15 ? '#E0A050' : '#E05252', minWidth:34 }}>{margen}%</span>
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
      </div>
    </div>
  )
}

function KpiG({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="kpi-card">
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#5BAD7A' }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize:22, color:'#5BAD7A' }}>{valor}</div>
    </div>
  )
}
