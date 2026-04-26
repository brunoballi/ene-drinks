'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { searchProductos, confirmarVenta } from '@/lib/queries'
import { fmt, today, FORMAS_PAGO } from '@/lib/utils'
import { ItemCarrito, StockView } from '@/types/database'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function NuevaVentaPage() {
  const router = useRouter()
  const [fecha, setFecha]       = useState(today())
  const [formaPago, setFormaPago] = useState('')
  const [carrito, setCarrito]   = useState<ItemCarrito[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<StockView[]>([])
  const [prodSel, setProdSel]   = useState<StockView | null>(null)
  const [tipo, setTipo]         = useState<'UN' | 'CAJA'>('UN')
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio]     = useState<number | ''>('')
  const [showAC, setShowAC]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const handleBusqueda = useCallback((q: string) => {
    setBusqueda(q)
    setProdSel(null)
    clearTimeout(debounceRef.current)
    if (q.length < 1) { setResultados([]); setShowAC(false); return }
    debounceRef.current = setTimeout(async () => {
      const data = await searchProductos(q)
      setResultados(data ?? [])
      setShowAC(true)
    }, 200)
  }, [])

  const seleccionar = (p: StockView) => {
    setProdSel(p)
    setBusqueda(p.nombre)
    setShowAC(false)
    setPrecio(tipo === 'CAJA' ? (p.venta_caja ?? p.venta_un ?? 0) : (p.venta_un ?? 0))
    setCantidad(1)
  }

  useEffect(() => {
    if (!prodSel) return
    setPrecio(tipo === 'CAJA' ? (prodSel.venta_caja ?? prodSel.venta_un ?? 0) : (prodSel.venta_un ?? 0))
  }, [tipo, prodSel])

  const stockDisponible = prodSel
    ? tipo === 'CAJA' ? prodSel.stock_caja : prodSel.stock_total_un
    : 0

  const agregar = () => {
    if (!prodSel) { toast.error('Seleccioná un producto'); return }
    if (!precio || Number(precio) <= 0) { toast.error('Ingresá un precio válido'); return }
    if (cantidad < 1) { toast.error('Cantidad inválida'); return }
    if (cantidad > stockDisponible) {
      toast.error(`Stock insuficiente. Disponible: ${stockDisponible} ${tipo === 'CAJA' ? 'cajas' : 'unidades'}`)
      return
    }
    const existente = carrito.findIndex(i => i.productoId === prodSel.id && i.tipo === tipo && i.precioUnitario === Number(precio))
    if (existente >= 0) {
      const nuevo = [...carrito]
      nuevo[existente].cantidad += cantidad
      setCarrito(nuevo)
    } else {
      const costoUnitario = tipo === 'CAJA'
        ? (prodSel.costo_un != null ? prodSel.costo_un * prodSel.unidades_x_caja : null)
        : prodSel.costo_un
      setCarrito(prev => [...prev, {
        productoId: prodSel.id,
        codigo: prodSel.codigo,
        nombre: prodSel.nombre,
        tipo, cantidad,
        precioUnitario: Number(precio),
        costoUnitario,
        stockDisponible,
      }])
    }
    // Limpiar form
    setBusqueda(''); setProdSel(null); setCantidad(1); setPrecio(''); setTipo('UN')
    inputRef.current?.focus()
    toast.success(`${prodSel.nombre} agregado`)
  }

  const quitarItem = (idx: number) => setCarrito(prev => prev.filter((_, i) => i !== idx))
  const cambiarCant = (idx: number, delta: number) => {
    setCarrito(prev => prev.map((item, i) => i === idx ? { ...item, cantidad: Math.max(1, item.cantidad + delta) } : item))
  }

  const totalCarrito = carrito.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const costoCarrito = carrito.reduce((s, i) => s + i.cantidad * (i.costoUnitario ?? 0), 0)
  const gananciaCarrito = totalCarrito - costoCarrito
  const tieneSinCosto = carrito.some(i => i.costoUnitario === null)

  const confirmar = async () => {
    if (!carrito.length) { toast.error('El carrito está vacío'); return }
    setLoading(true)
    try {
      const nro = await confirmarVenta(carrito, fecha, formaPago || null)
      toast.success(`Venta #${nro} confirmada — ${fmt(totalCarrito)}`)
      setCarrito([])
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al confirmar la venta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Nueva Venta</h1>
        </div>
        <a href="/ventas/historial" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>Ver historial →</a>
      </div>

      <div className='venta-layout' style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        {/* Izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Buscador */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Buscar producto</p>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                ref={inputRef}
                className="input"
                value={busqueda}
                onChange={e => handleBusqueda(e.target.value)}
                onBlur={() => setTimeout(() => setShowAC(false), 150)}
                placeholder="Nombre o código del producto..."
                autoComplete="off"
              />
              {showAC && resultados.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                  background: 'var(--surface-3)', border: '1px solid var(--border-hover)',
                  borderRadius: 8, maxHeight: 280, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {resultados.map(p => (
                    <div key={p.id} onMouseDown={() => seleccionar(p)} style={{
                      padding: '10px 14px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontSize: 13, transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>{p.codigo}</span>
                      <span style={{ flex: 1, color: 'var(--text-primary)' }}>{p.nombre}</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 500, fontSize: 12 }}>{fmt(p.venta_un)}</span>
                      <span style={{ fontSize: 11, color: p.stock_total_un < 3 ? '#E05252' : 'var(--text-muted)' }}>
                        {p.stock_total_un} un.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Producto seleccionado */}
            {prodSel && (
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <Campo label="Código" valor={prodSel.codigo} mono />
                <Campo label="Categoría" valor={prodSel.categoria ?? '—'} />
                <Campo label="Stock actual" valor={`${prodSel.stock_total_un} un.`} color={prodSel.stock_total_un < 3 ? '#E05252' : '#5BAD7A'} />
                <Campo label="P. venta UN" valor={fmt(prodSel.venta_un)} color="var(--gold)" />
                {prodSel.venta_caja && <Campo label="P. venta CAJA" valor={fmt(prodSel.venta_caja)} />}
                <Campo label="Un. por caja" valor={String(prodSel.unidades_x_caja)} />
              </div>
            )}

            {/* Controles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={tipo} onChange={e => setTipo(e.target.value as 'UN' | 'CAJA')}>
                  <option value="UN">Unidad</option>
                  <option value="CAJA">Caja</option>
                </select>
              </div>
              <div>
                <label className="label">Cantidad</label>
                <input className="input" type="number" min={1} value={cantidad} onChange={e => setCantidad(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Precio unitario</label>
                <input className="input" type="number" value={precio} onChange={e => setPrecio(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
              </div>
            </div>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={agregar}>
              <PlusIcon /> Agregar al carrito
            </button>
          </div>

          {/* Datos de la venta */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Datos de la venta</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
              <div>
                <label className="label">Forma de pago (opcional)</label>
                <select className="input" value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                  <option value="">— Sin especificar —</option>
                  {FORMAS_PAGO.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, position: 'sticky', top: 76 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: 'var(--gold)' }}>Carrito</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{carrito.reduce((s, i) => s + i.cantidad, 0)} ítems</span>
          </div>

          <div style={{ minHeight: 120 }}>
            {carrito.length === 0
              ? <p style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>El carrito está vacío</p>
              : carrito.map((item, idx) => (
                <div key={idx} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.tipo} · {fmt(item.precioUnitario)} c/u</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => cambiarCant(idx, -1)} style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCant(idx, 1)} style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(item.cantidad * item.precioUnitario)}</span>
                  <button onClick={() => quitarItem(idx)} style={{ background: 'none', border: 'none', color: '#E05252', cursor: 'pointer', padding: '4px 6px', fontSize: 14 }}>✕</button>
                </div>
              ))
            }
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <FilaTotales label="Subtotal" valor={fmt(totalCarrito)} />
              <FilaTotales label="Costo estimado" valor={tieneSinCosto ? 'Con ítems s/costo' : fmt(costoCarrito)} />
              <FilaTotales label="Ganancia" valor={fmt(gananciaCarrito)} color="#5BAD7A" />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
                <span style={{ color: 'var(--text-muted)' }}>TOTAL</span>
                <span>{fmt(totalCarrito)}</span>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={confirmar} disabled={loading || carrito.length === 0}>
              {loading ? 'Confirmando...' : 'Confirmar venta'}
            </button>
            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={() => setCarrito([])}>
              Limpiar carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, valor, mono, color }: { label: string; valor: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: color ?? 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined }}>{valor}</div>
    </div>
  )
}

function FilaTotales({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={color ? { color } : {}}>{valor}</span>
    </div>
  )
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v12M1 7h12" /></svg>
}
