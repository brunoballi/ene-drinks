'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: <IconGrid /> },
  { href: '/ventas/nueva', label: 'Venta',   icon: <IconCart /> },
  { href: '/ventas/historial', label: 'Historial', icon: <IconCal /> },
  { href: '/productos',  label: 'Productos',  icon: <IconBox /> },
  { href: '/stock',      label: 'Stock',      icon: <IconStock /> },
  { href: '/compras',    label: 'Compras',    icon: <IconBag /> },
  { href: '/ganancias',  label: 'Ganancias',  icon: <IconChart /> },
  { href: '/reportes',   label: 'Reportes',   icon: <IconReport /> },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          },
        }}
      />
      <TopNav />
      <div style={{ display: 'flex', marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar />
        <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', maxWidth: 1400 }}>
          {children}
        </main>
      </div>
      <MobileBar />
    </>
  )
}

function TopNav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--bordo-deep)', borderBottom: '1px solid var(--border)',
      height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 0,
    }}>
      <span style={{
        fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700,
        color: 'var(--gold)', letterSpacing: '0.03em', marginRight: 32,
      }}>
        ENE Drinks
        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 12, marginLeft: 6, fontFamily: "'DM Sans', sans-serif" }}>
          Bebidas Rosario
        </span>
      </span>
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {NAV.slice(0, 5).map(n => <NavLink key={n.href} {...n} />)}
      </div>
    </nav>
  )
}

function NavLink({ href, label }: { href: string; label: string; icon?: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname.startsWith(href.split('/').slice(0, 2).join('/'))
  return (
    <Link href={href} style={{
      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
      color: active ? 'var(--gold)' : 'var(--text-secondary)',
      background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
      textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {label}
    </Link>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname.startsWith(href.split('/').slice(0, 2).join('/'))
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: 'var(--surface-2)',
      borderRight: '1px solid var(--border)', padding: '20px 12px',
      position: 'fixed', top: 56, bottom: 0, left: 0, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <SideSection label="Principal" />
      {NAV.slice(0, 3).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} />)}
      <SideSection label="Inventario" />
      {NAV.slice(3, 6).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} />)}
      <SideSection label="Finanzas" />
      {NAV.slice(6).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} />)}
    </aside>
  )
}

function SideSection({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 8px 4px' }}>
      {label}
    </div>
  )
}

function SideItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
      borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400,
      color: active ? 'var(--gold)' : 'var(--text-secondary)',
      background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
      textDecoration: 'none', transition: 'all 0.15s',
    }}>
      <span style={{ opacity: active ? 1 : 0.65 }}>{icon}</span>
      {label}
    </Link>
  )
}

function MobileBar() {
  const pathname = usePathname()
  const tabs = NAV.slice(0, 4)
  return (
    <div style={{
      display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--bordo-deep)', borderTop: '1px solid var(--border)',
    }} className="mobile-bar">
      {tabs.map(t => {
        const active = pathname.startsWith(t.href.split('/').slice(0, 2).join('/'))
        return (
          <Link key={t.href} href={t.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 12px', color: active ? 'var(--gold)' : 'var(--text-muted)',
            textDecoration: 'none', fontSize: 10, flex: 1,
          }}>
            {t.icon}
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

// ── Iconos inline ──────────────────────────────────
function IconGrid() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/></svg> }
function IconCart() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1.5 1.5h2l.8 4M5 7h8l1.5-4H4"/><circle cx="6" cy="11.5" r="1.5"/><circle cx="12" cy="11.5" r="1.5"/></svg> }
function IconCal()  { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="2" width="13" height="11" rx="1"/><path d="M5 2V1M10 2V1M1 6h13"/></svg> }
function IconBox()  { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7.5 1L14 4.5v6L7.5 14 1 10.5v-6z"/><path d="M1 4.5l6.5 3.5M14 4.5L7.5 8M7.5 8v6"/></svg> }
function IconStock(){ return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 10V5l5-3 5 3v5l-5 3z"/></svg> }
function IconBag()  { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="11" height="9" rx="1"/><path d="M5 3V2a2.5 2.5 0 0 1 5 0v1"/></svg> }
function IconChart(){ return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 11l3-3 3 3 3-5 4 5"/></svg> }
function IconReport(){ return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="1" width="11" height="13" rx="1"/><path d="M5 5h5M5 8h5M5 11h3"/></svg> }
