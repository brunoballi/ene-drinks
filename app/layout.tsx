import type { Metadata } from 'next'
import ClientLayout from './client-layout'

export const metadata: Metadata = {
  title: {
    default: 'Flowi Gestor',
    template: '%s · Flowi Gestor',
  },
  description: 'Sistema de gestión de ventas, stock y compras — Flowi Gestor',
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
