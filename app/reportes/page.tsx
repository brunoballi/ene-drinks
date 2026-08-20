'use client'
import { useEffect, useState } from 'react'
import { getResumenMes, getTopProductosMes, getGanancias, getProductosConStock } from '@/lib/queries'
import { fmt, today } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORES = ['#C9A84C','#8B2438','#5BAD7A','#5B8FE0','#E0A050','#9B59B6','#E05252','#1ABC9C']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ReportesPage() {
  const ahora = new Date()
  const [anio, setAnio]         = useState(ahora.getFullYear())
  const [mesIdx, setMesIdx]     = useState(ahora.getMonth())
  const [mes, setMes]           = useState<any[]>([])
  const [top, setTop]           = useState<any[]>([])
  const [ganancias, setGanancias] = useState<any[]>([])
  const [stock, setStock]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  const esMesActual = anio === ahora.getFullYear() && mesIdx === ahora.getMonth()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getResumenMes(anio, mesIdx),
      getTopProductosMes(anio, mesIdx),
      getGanancias(),
      getProductosConStock(),
    ]).then(([m, t, g, s]) => {
      setMes(m ?? []); setTop(t); setGanancias(g ?? []); setStock(s ?? [])
      setLoading(false)
    })
  }, [anio, mesIdx])

  const cambiarMes = (delta: number) => {
    let m = mesIdx + delta
    let y = anio
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setMesIdx(m); setAnio(y)
  }

  // Totales del mes
  const totalMes   = mes.reduce((s, d) => s + (d.total_vendido ?? 0), 0)
  const ganMes     = mes.reduce((s, d) => s + (d.ganancia_neta ?? 0), 0)
  const cantVentas = mes.reduce((s, d) => s + (d.cant_ventas ?? 0), 0)
  const ticketProm = cantVentas > 0 ? Math.round(totalMes / cantVentas) : 0
  const margenMes  = totalMes > 0 ? Math.round(ganMes / totalMes * 100) : 0

  // Todos los días del mes seleccionado
  const diasEnMes = new Date(anio, mesIdx + 1, 0).getDate()
  const hoyKey    = today()
  const chartDias = Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(anio, mesIdx, i + 1)
    const key   = d.toLocaleDateString('en-CA', { timeZone:'America/Argentina/Buenos_Aires' })
    const label = String(i + 1).padStart(2, '0')
    const found = mes.find((m: any) => m.fecha === key)
    return { label, total: found?.total_vendido ?? 0, ganancia: found?.ganancia_neta ?? 0, esHoy: key === hoyKey }
  })

  // Por categoría
  const byCat: Record<string, number> = {}
  ganancias.forEach((v: any) => {
    // Aproximación: agrupar por primera letra del nro de venta no es posible aquí
    // Usamos los productos en stock con su categoría para el gráfico
  })
  // Alternativa: agrupar el top por nombre
  const topCat = top.slice(0, 6).map((t, i) => ({
    name: t.nombre.length > 20 ? t.nombre.slice(0, 20) + '…' : t.nombre,
    value: t.total,
  }))

  // Valor total del inventario
  const valorInventario = stock.reduce((s: number, p: any) => {
    const st = (p.stock_un ?? 0) + (p.stock_caja ?? 0) * (p.unidades_x_caja ?? 6)
    return s + st * (p.costo_un ?? 0)
  }, 0)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Reportes</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="btn-ghost" onClick={() => cambiarMes(-1)} title="Mes anterior">←</button>
          <span style={{ fontSize:14, fontWeight:500, textTransform:'capitalize', minWidth:150, textAlign:'center' }}>
            {MESES[mesIdx]} {anio}
          </span>
          <button className="btn-ghost" onClick={() => cambiarMes(1)} disabled={esMesActual} style={esMesActual ? { opacity:0.35, cursor:'not-allowed' } : {}} title="Mes siguiente">→</button>
          {!esMesActual && (
            <button className="btn-ghost" style={{ fontSize:12 }} onClick={() => { setAnio(ahora.getFullYear()); setMesIdx(ahora.getMonth()) }}>Volver a hoy</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <KpiR label="Total vendido mes"  valor={loading ? '...' : fmt(totalMes)}    accent="#C9A84C" />
        <KpiR label="Ganancia neta mes"  valor={loading ? '...' : fmt(ganMes)}      accent="#5BAD7A" color="#5BAD7A" />
        <KpiR label="Ticket promedio"    valor={loading ? '...' : fmt(ticketProm)}  accent="#5B8FE0" color="#5B8FE0"
          info="Ingreso total del mes ÷ cantidad de ventas del mes. Es el monto promedio que dejó cada venta." />
        <KpiR label="Margen del mes"     valor={loading ? '...' : `${margenMes}%`}  accent="#C9A84C" />
      </div>

      <div className="dash-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Gráfico ventas diarias */}
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:16 }}>Ventas diarias — {MESES[mesIdx]}</p>
          {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando...</p> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartDias}>
                <XAxis dataKey="label" tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} interval={diasEnMes > 20 ? 2 : 1} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background:'var(--surface-3)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                  formatter={(v:any) => [fmt(v)]}
                  labelStyle={{ color:'var(--text-muted)' }}
                />
                <Bar dataKey="total" fill="#6B1A2A" radius={[3,3,0,0]}>
                  {chartDias.map((d, i) => <Cell key={i} fill={d.esHoy ? '#C9A84C' : '#6B1A2A'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribución por producto */}
        <div className="card" style={{ padding:20 }}>
          <p
            style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:16, cursor:'help' }}
            title="Cada porción muestra qué porcentaje del ingreso generado por el Top 6 de productos más vendidos del mes aportó ese producto en particular."
          >
            Distribución de ingresos <span style={{ opacity:0.6 }}>ⓘ</span>
          </p>
          {loading || topCat.length === 0
            ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Sin datos este mes</p>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {topCat.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'var(--surface-3)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={(v:any) => [fmt(v)]} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      <div className="dash-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Top 10 productos */}
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:16 }}>Top 10 productos más vendidos</p>
          {loading ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Cargando...</p>
            : top.length === 0 ? <p style={{ color:'var(--text-muted)', fontSize:13 }}>Sin ventas este mes</p>
            : top.map((p, i) => {
              const pct = Math.round(p.cantidad / top[0].cantidad * 100)
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>
                      <span style={{ color:'var(--text-muted)', marginRight:6 }}>{i+1}.</span>
                      {p.nombre}
                    </span>
                    <span style={{ color:'var(--gold)', fontWeight:600, flexShrink:0 }}>{p.cantidad} un.</span>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:3, height:5 }}>
                    <div style={{ background:'var(--gold)', borderRadius:3, height:'100%', width:`${pct}%` }} />
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Stats extra */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card" style={{ padding:20 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Valor del inventario</p>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'var(--gold)' }}>{loading ? '...' : fmt(valorInventario)}</div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
              {stock.filter((p:any) => p.costo_un).length} productos con costo cargado
            </p>
          </div>
          <div className="card" style={{ padding:20 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Resumen del mes</p>
            {[
              { label:'Ventas totales', valor: cantVentas },
              { label:'Días con ventas', valor: mes.filter(d => d.total_vendido > 0).length },
              { label:'Promedio diario', valor: fmt(mes.length > 0 ? Math.round(totalMes / Math.max(mes.filter(d=>d.total_vendido>0).length, 1)) : 0) },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
                <span style={{ color:'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight:600 }}>{r.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiR({ label, valor, accent, color, info }: any) {
  return (
    <div className="kpi-card">
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:accent }} />
      <div className="kpi-label">
        {label}
        {info && <span title={info} style={{ opacity:0.6, marginLeft:5, cursor:'help' }}>ⓘ</span>}
      </div>
      <div className="kpi-value" style={{ fontSize:22, ...(color ? { color } : {}) }}>{valor}</div>
    </div>
  )
}
