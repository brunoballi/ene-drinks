import type { Metadata } from 'next'
import ClientLayout from './client-layout'

export const metadata: Metadata = {
  title: {
    default: 'ENE Drinks — Bebidas Rosario',
    template: '%s · ENE Drinks',
  },
  description: 'Sistema de gestión de ventas, stock y compras — ENE Drinks Bebidas Rosario',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
