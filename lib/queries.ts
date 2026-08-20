import { createClient } from './supabase'
import { VentaDetalleInsert, ItemCarrito } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = () => createClient() as any

// ── PRODUCTOS ────────────────────────────────────────────────

// Fuente única: v_stock tiene stock_total_un calculado + joins resueltos
export async function getProductos() {
  const sb = getDb()
  const { data, error } = await sb
    .from('v_stock')
    .select('*')
    .eq('activo', true)
    .order('codigo')
  if (error) throw error
  return data
}

// Alias para módulo de stock (misma query)
export async function getProductosConStock() {
  return getProductos()
}

export async function upsertProducto(p: {
  id?: number
  codigo: string
  nombre: string
  categoria_id?: number | null
  proveedor_id?: number | null
  unidades_x_caja?: number
  costo_un?: number | null
  venta_un?: number | null
  venta_caja?: number | null
  stock_un?: number
  stock_caja?: number
}) {
  const sb = getDb()

  // Campos de precio/catálogo — siempre se actualizan
  const catalogoFields = {
    codigo:          p.codigo,
    nombre:          p.nombre,
    categoria_id:    p.categoria_id ?? null,
    proveedor_id:    p.proveedor_id ?? null,
    unidades_x_caja: p.unidades_x_caja ?? 6,
    costo_un:        p.costo_un ?? null,
    venta_un:        p.venta_un ?? null,
    venta_caja:      p.venta_caja ?? null,
  }

  if (p.id) {
    const updateFields = {
      ...catalogoFields,
      ...(p.stock_un   !== undefined ? { stock_un:   p.stock_un }   : {}),
      ...(p.stock_caja !== undefined ? { stock_caja: p.stock_caja } : {}),
    }
    const { error } = await sb.from('productos').update(updateFields).eq('id', p.id)
    if (error) throw error
  } else {
    // INSERT: incluir stock inicial
    const { error } = await sb.from('productos').insert({
      ...catalogoFields,
      stock_un:   p.stock_un  ?? 0,
      stock_caja: p.stock_caja ?? 0,
    })
    if (error) throw error
  }
}

// Ajuste manual de stock (independiente del catálogo)
export async function ajustarStock(id: number, stockUn: number, stockCaja: number) {
  const sb = getDb()
  const { error } = await sb
    .from('productos')
    .update({ stock_un: stockUn, stock_caja: stockCaja })
    .eq('id', id)
  if (error) throw error
}

export async function deleteProducto(id: number) {
  const sb = getDb()
  const { error } = await sb.from('productos').update({ activo: false }).eq('id', id)
  if (error) throw error
}

export async function searchProductos(q: string) {
  const sb = getDb()
  const { data, error } = await sb
    .from('v_stock')
    .select('*')
    .eq('activo', true)
    .or(`codigo.ilike.%${q}%,nombre.ilike.%${q}%`)
    .not('venta_un', 'is', null)
    .order('nombre')
    .limit(10)
  if (error) throw error
  return data
}

// ── VENTAS ───────────────────────────────────────────────────
export async function getVentas(desde?: string, hasta?: string) {
  const sb = getDb()

  // Paso 1: cabeceras de ventas
  let qVentas = sb
    .from('ventas')
    .select('id, nro_venta, fecha, forma_pago, total, costo_total, ganancia')
    .order('nro_venta', { ascending: false })
  if (desde) qVentas = qVentas.gte('fecha', desde)
  if (hasta) qVentas = qVentas.lte('fecha', hasta)

  const { data: ventas, error: errV } = await qVentas
  if (errV) throw errV
  if (!ventas || ventas.length === 0) return []

  // Paso 2: detalles — query separada para evitar problemas de RLS con joins anidados
  const ventaIds = ventas.map((v: any) => v.id)
  const { data: detalles, error: errD } = await sb
    .from('ventas_detalle')
    .select('id, venta_id, tipo, cantidad, precio_unitario, costo_unitario, total, ganancia, productos(id, codigo, nombre)')
    .in('venta_id', ventaIds)
    .order('id')

  if (errD) throw errD

  // Paso 3: unir en memoria
  return ventas.map((v: any) => ({
    ...v,
    ventas_detalle: (detalles ?? []).filter((d: any) => d.venta_id === v.id),
  }))
}

export async function getVentasHoy() {
  const sb = getDb()
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const { data, error } = await sb
    .from('v_resumen_diario')
    .select('*')
    .eq('fecha', hoy)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getResumenSemana() {
  const sb = getDb()
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const desde = hace7.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const { data, error } = await sb
    .from('v_resumen_diario')
    .select('*')
    .gte('fecha', desde)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

export async function getResumenMes(year?: number, month?: number) {
  const sb = getDb()
  const ahora = new Date()
  const y = year ?? ahora.getFullYear()
  const m = month ?? ahora.getMonth()
  const primerDia   = new Date(y, m,     1).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const primerDiaSig = new Date(y, m + 1, 1).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const { data, error } = await sb
    .from('v_resumen_diario')
    .select('*')
    .gte('fecha', primerDia)
    .lt('fecha', primerDiaSig)
    .order('fecha')
  if (error) throw error
  return data
}

export async function confirmarVenta(
  items: ItemCarrito[],
  fecha: string,
  formaPago: string | null
): Promise<number> {
  const sb = getDb()

  // 1. Crear cabecera
  const { data: venta, error: errVenta } = await sb
    .from('ventas')
    .insert({ fecha, forma_pago: formaPago || null })
    .select('id, nro_venta')
    .single()
  if (errVenta || !venta) throw errVenta ?? new Error('Error al crear venta')

  // 2. Insertar detalles (el trigger descuenta stock y actualiza totales)
  const detalles: VentaDetalleInsert[] = items.map(i => ({
    venta_id: venta.id,
    producto_id: i.productoId,
    tipo: i.tipo,
    cantidad: i.cantidad,
    precio_unitario: i.precioUnitario,
    costo_unitario: i.costoUnitario ?? undefined,
  }))

  const { error: errDet } = await sb.from('ventas_detalle').insert(detalles)
  if (errDet) {
    // Rollback manual de la cabecera si fallan los detalles
    await sb.from('ventas').delete().eq('id', venta.id)
    throw errDet
  }

  return venta.nro_venta
}

export async function eliminarVenta(id: number) {
  const sb = getDb()
  // Los detalles se eliminan en cascada (ON DELETE CASCADE en el schema).
  // Al borrarse cada detalle, el trigger trg_restaurar_stock devuelve las
  // unidades al stock (ver fix_stock_al_borrar_venta.sql).
  const { error } = await sb.from('ventas').delete().eq('id', id)
  if (error) throw error
}

// ── COMPRAS ──────────────────────────────────────────────────
export async function getCompras() {
  const sb = getDb()
  const { data, error } = await sb
    .from('compras')
    .select('*, proveedores(nombre), productos(codigo, nombre)')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}

export async function registrarCompra(compra: {
  fecha: string
  proveedorId: number | null
  productoId: number
  tipo: 'UN' | 'CAJA'
  cantidad: number
  costoTotal: number
  pagado: boolean
}) {
  const sb = getDb()
  const { error } = await sb.from('compras').insert({
    fecha: compra.fecha,
    proveedor_id: compra.proveedorId,
    producto_id: compra.productoId,
    tipo: compra.tipo,
    cantidad: compra.cantidad,
    costo_total: compra.costoTotal,
    pagado: compra.pagado,
  })
  if (error) throw error
}

// ── GANANCIAS ────────────────────────────────────────────────
export async function getGanancias(desde?: string, hasta?: string) {
  const sb = getDb()
  let q = sb.from('v_ganancias').select('*').order('nro_venta', { ascending: false })
  if (desde) q = q.gte('fecha', desde)
  if (hasta) q = q.lte('fecha', hasta)
  const { data, error } = await q
  if (error) throw error
  return data
}

// ── DASHBOARD ────────────────────────────────────────────────
export async function getStockBajo(threshold = 3) {
  const sb = getDb()
  const { data, error } = await sb
    .from('v_stock')
    .select('*')
    .eq('activo', true)
    .lt('stock_total_un', threshold)
    .not('venta_un', 'is', null)
    .order('stock_total_un')
  if (error) throw error
  return data
}

export async function getTopProductosMes(year?: number, month?: number) {
  const sb = getDb()
  const ahora = new Date()
  const y = year ?? ahora.getFullYear()
  const m = month ?? ahora.getMonth()
  const primerDia   = new Date(y, m,     1).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const primerDiaSig = new Date(y, m + 1, 1).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

  const { data, error } = await sb
    .from('ventas_detalle')
    .select('cantidad, precio_unitario, productos(nombre, codigo, categorias(nombre)), ventas!inner(fecha)')
    .gte('ventas.fecha', primerDia)
    .lt('ventas.fecha', primerDiaSig)
  if (error) throw error

  // Agrupar por producto
  const map: Record<string, { nombre: string; cantidad: number; total: number }> = {}
  data?.forEach((d: any) => {
    const nombre = d.productos?.nombre ?? d.productos?.codigo ?? 'Desconocido'
    if (!map[nombre]) map[nombre] = { nombre, cantidad: 0, total: 0 }
    map[nombre].cantidad += d.cantidad
    map[nombre].total += d.cantidad * d.precio_unitario
  })
  return Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
}

// ── PROVEEDORES ──────────────────────────────────────────────
export async function getProveedores() {
  const sb = getDb()
  const { data, error } = await sb.from('proveedores').select('*').eq('activo', true).order('nombre')
  if (error) throw error
  return data
}

export async function upsertProveedor(p: { id?: number; nombre: string }) {
  const sb = getDb()
  if (p.id) {
    const { error } = await sb.from('proveedores').update({ nombre: p.nombre }).eq('id', p.id)
    if (error) throw error
  } else {
    const codProv = 'PROV-' + Date.now().toString(36).toUpperCase()
    const { error } = await sb.from('proveedores').insert({ cod_prov: codProv, nombre: p.nombre })
    if (error) throw error
  }
}

export async function deleteProveedor(id: number) {
  const sb = getDb()
  const { error } = await sb.from('proveedores').update({ activo: false }).eq('id', id)
  if (error) throw error
}

// ── NEGOCIO (branding configurable) ─────────────────────────
export async function getNegocio() {
  const sb = getDb()
  const { data, error } = await sb.from('negocio').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function upsertNegocio(n: { nombre: string; logo_url?: string | null }) {
  const sb = getDb()
  const { error } = await sb.from('negocio').update({
    nombre: n.nombre,
    ...(n.logo_url !== undefined ? { logo_url: n.logo_url } : {}),
    actualizado_en: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw error
}

export async function subirLogo(file: File) {
  const sb = getDb()
  const ext = file.name.split('.').pop()
  const path = `logo-${Date.now()}.${ext}`
  const { error } = await sb.storage.from('logos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = sb.storage.from('logos').getPublicUrl(path)
  return data.publicUrl as string
}

export async function getCategorias() {
  const sb = getDb()
  const { data, error } = await sb.from('categorias').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function upsertCategoria(c: { id?: number; nombre: string }) {
  const sb = getDb()
  if (c.id) {
    const { error } = await sb.from('categorias').update({ nombre: c.nombre }).eq('id', c.id)
    if (error) throw error
  } else {
    const { error } = await sb.from('categorias').insert({ nombre: c.nombre })
    if (error) throw error
  }
}

export async function deleteCategoria(id: number) {
  const sb = getDb()
  const { error } = await sb.from('categorias').delete().eq('id', id)
  if (error) throw error
}
