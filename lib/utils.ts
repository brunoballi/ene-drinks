export const fmt = (n: number | null | undefined): string => {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export const fmtN = (n: number | null | undefined): string => {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('es-AR')
}

export const today = (): string =>
  new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-')

export const stockTotal = (stockUn: number, stockCaja: number, uxc: number): number =>
  stockUn + stockCaja * uxc

export const clsx = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ')

export const CATEGORIAS = [
  'Vino Tinto Malbec','Vino Tinto Caber','Vino Tinto Pinot',
  'Vino Blanco Dulce','Vino Blanco','Vino Chardonay',
  'Aperitivo','Cerveza','Energizante','Gaseosa','Combo',
]

export const PROVEEDORES = ['ALVV','PROCOPIO','KROW']

export const FORMAS_PAGO = ['efectivo','transferencia','débito','crédito'] as const

export const STOCK_THRESHOLD = Number(process.env.NEXT_PUBLIC_STOCK_ALERTA_THRESHOLD ?? 3)
