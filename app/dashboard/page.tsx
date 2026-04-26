'use client'
import { useEffect, useState } from 'react'
import { getVentasHoy, getResumenMes, getResumenSemana, getStockBajo, getTopProductosMes } from '@/lib/queries'
import { fmt, STOCK_THRESHOLD } from '@/lib/utils'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'

export default function DashboardPage() {
  const [hoy, setHoy]       = useState<any>(null)
  const [semana, setSemana] = useState<any[]>([])
  const [mes, setMes]       = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [top, setTop]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getVentasHoy(),
      getResumenSemana(),
      getResumenMes(),
      getStockBajo(STOCK_THRESHOLD),
      getTopProductosMes(),
    ]).then(([h, s, m, a, t]) => {
      setHoy(h); setSemana(s ?? []); setMes(m ?? []); setAlertas(a ?? []); setTop(t)
    }).finally(() => setLoading(false))
  }, [])

  const totalMes = mes.reduce((s: number, d: any) => s + (d.total_vendido ?? 0), 0)
  const ganMes   = mes.reduce((s: number, d: any) => s + (d.ganancia_neta ?? 0), 0)

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  // Últimos 7 días para el gráfico
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    const label = d.toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' })
    const found = semana.find((s: any) => s.fecha === key)
    return { label, total: found?.total_vendido ?? 0, ganancia: found?.ganancia_neta ?? 0 }
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, textTransform: 'capitalize' }}>{fechaHoy}</p>
        </div>
        <Link href="/ventas/nueva" className="btn-primary">
          <PlusIcon /> Nueva venta
        </Link>
      </div>

      {/* KPIs */}
      <div className='kpi-grid-4' style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard
          label="Ventas hoy" accent="#C9A84C"
          value={loading ? '...' : fmt(hoy?.total_vendido ?? 0)}
          sub={`${hoy?.cant_ventas ?? 0} transacciones`}
        />
        <KpiCard
          label="Ganancia hoy" accent="#5BAD7A"
          value={loading ? '...' : fmt(hoy?.ganancia_neta ?? 0)}
          sub={hoy?.margen_pct ? `Margen ${hoy.margen_pct}%` : 'Sin ventas hoy'}
          valueColor="#5BAD7A"
        />
        <KpiCard
          label="Ventas del mes" accent="#C9A84C"
          value={loading ? '...' : fmt(totalMes)}
          sub={`Ganancia: ${fmt(ganMes)}`}
        />
        <KpiCard
          label="Stock bajo" accent="#E05252"
          value={loading ? '...' : String(alertas.length)}
          sub="productos críticos"
          valueColor={alertas.length > 0 ? '#E05252' : '#5BAD7A'}
        />
      </div>

      {/* Gráfico + Alertas */}
      <div className='dash-grid-2' style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Ventas — últimos 7 días</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [fmt(v), 'Total']}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 6 ? '#C9A84C' : '#6B1A2A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Stock bajo</p>
          {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</p>
            : alertas.length === 0
              ? <p style={{ color: '#5BAD7A', fontSize: 13 }}>✓ Todo el stock OK</p>
              : alertas.slice(0, 7).map((a: any) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.stock_total_un === 0 ? '#E05252' : '#E0A050', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</span>
                  <span style={{ color: a.stock_total_un === 0 ? '#E05252' : '#E0A050', fontWeight: 600 }}>{a.stock_total_un} un.</span>
                </div>
              ))
          }
          {alertas.length > 7 && (
            <Link href="/stock" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
              Ver {alertas.length - 7} más →
            </Link>
          )}
        </div>
      </div>

      {/* Top productos */}
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Top productos del mes</p>
        {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</p>
          : top.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin ventas este mes</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
              {top.slice(0, 8).map((p, i) => {
                const pct = Math.round(p.cantidad / top[0].cantidad * 100)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.nombre}</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{p.cantidad} un.</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 4 }}>
                      <div style={{ background: 'var(--gold)', borderRadius: 3, height: '100%', width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, valueColor }: any) {
  return (
    <div className="kpi-card">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={valueColor ? { color: valueColor } : {}}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  )
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v12M1 7h12" /></svg>
}
