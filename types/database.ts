export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: { id: number; nombre: string }
        Insert: { nombre: string }
        Update: { nombre?: string }
      }
      proveedores: {
        Row: { id: number; cod_prov: string; nombre: string; telefono: string | null; email: string | null; deuda: number; activo: boolean; creado_en: string }
        Insert: { cod_prov: string; nombre: string; telefono?: string; email?: string; deuda?: number }
        Update: { nombre?: string; telefono?: string; email?: string; deuda?: number; activo?: boolean }
      }
      productos: {
        Row: {
          id: number; codigo: string; nombre: string
          categoria_id: number | null; proveedor_id: number | null
          unidades_x_caja: number; costo_un: number | null
          venta_un: number | null; venta_caja: number | null
          stock_un: number; stock_caja: number
          activo: boolean; creado_en: string; actualizado_en: string
        }
        Insert: {
          codigo: string; nombre: string; categoria_id?: number; proveedor_id?: number
          unidades_x_caja?: number; costo_un?: number; venta_un?: number; venta_caja?: number
          stock_un?: number; stock_caja?: number
        }
        Update: {
          nombre?: string; categoria_id?: number; proveedor_id?: number
          unidades_x_caja?: number; costo_un?: number; venta_un?: number; venta_caja?: number
          stock_un?: number; stock_caja?: number; activo?: boolean
        }
      }
      ventas: {
        Row: { id: number; nro_venta: number; fecha: string; forma_pago: string | null; total: number; costo_total: number; ganancia: number; creado_en: string }
        Insert: { nro_venta?: number; fecha?: string; forma_pago?: string }
        Update: { forma_pago?: string }
      }
      ventas_detalle: {
        Row: { id: number; venta_id: number; producto_id: number; tipo: 'UN' | 'CAJA'; cantidad: number; precio_unitario: number; costo_unitario: number | null; total: number; costo: number | null; ganancia: number | null }
        Insert: { venta_id: number; producto_id: number; tipo: 'UN' | 'CAJA'; cantidad: number; precio_unitario: number; costo_unitario?: number }
        Update: never
      }
      compras: {
        Row: { id: number; fecha: string; proveedor_id: number | null; producto_id: number | null; tipo: 'UN' | 'CAJA'; cantidad: number; costo_total: number; pagado: boolean; creado_en: string }
        Insert: { fecha?: string; proveedor_id?: number; producto_id: number; tipo: 'UN' | 'CAJA'; cantidad: number; costo_total: number; pagado?: boolean }
        Update: { pagado?: boolean }
      }
    }
    Views: {
      v_stock: { Row: { id: number; codigo: string; nombre: string; categoria: string | null; proveedor: string | null; stock_un: number; stock_caja: number; unidades_x_caja: number; stock_total_un: number; venta_un: number | null; venta_caja: number | null; costo_un: number | null; activo: boolean } }
      v_ganancias: { Row: { id: number; nro_venta: number; fecha: string; forma_pago: string | null; ingreso: number; costo: number; ganancia: number; margen_pct: number | null; cant_items: number; cant_unidades: number } }
      v_resumen_diario: { Row: { fecha: string; cant_ventas: number; total_vendido: number; costo_total: number; ganancia_neta: number; margen_pct: number } }
    }
    Functions: {}
  }
}

// Tipos derivados útiles
export type Producto = Database['public']['Tables']['productos']['Row']
export type ProductoInsert = Database['public']['Tables']['productos']['Insert']
export type Venta = Database['public']['Tables']['ventas']['Row']
export type VentaDetalle = Database['public']['Tables']['ventas_detalle']['Row']
export type VentaDetalleInsert = Database['public']['Tables']['ventas_detalle']['Insert']
export type Compra = Database['public']['Tables']['compras']['Row']
export type StockView = Database['public']['Views']['v_stock']['Row']
export type GananciaView = Database['public']['Views']['v_ganancias']['Row']
export type ResumenDiario = Database['public']['Views']['v_resumen_diario']['Row']

export interface ItemCarrito {
  productoId: number
  codigo: string
  nombre: string
  tipo: 'UN' | 'CAJA'
  cantidad: number
  precioUnitario: number
  costoUnitario: number | null
  stockDisponible: number
}
