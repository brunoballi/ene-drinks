'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Toaster } from 'sonner'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',       label: 'Dashboard',  icon: <IconGrid /> },
  { href: '/ventas/nueva',    label: 'Venta',      icon: <IconCart /> },
  { href: '/ventas/historial',label: 'Historial',  icon: <IconCal />  },
  { href: '/productos',       label: 'Productos',  icon: <IconBox />  },
  { href: '/stock',           label: 'Stock',      icon: <IconStock />},
  { href: '/compras',         label: 'Compras',    icon: <IconBag />  },
  { href: '/ganancias',       label: 'Ganancias',  icon: <IconChart />},
  { href: '/reportes',        label: 'Reportes',   icon: <IconReport />},
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .desktop-nav-links { display: none !important; }
          .main-content { margin-left: 0 !important; padding: 16px 16px 80px !important; }
          .mobile-bottom-bar { display: flex !important; }
          .kpi-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .dash-grid-2 { grid-template-columns: 1fr !important; }
          .venta-layout { grid-template-columns: 1fr !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .form-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .mobile-bottom-bar { display: none !important; }
          .mobile-menu-btn { display: none !important; }
          .sidebar-overlay { display: none !important; }
        }
      `}</style>

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

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bordo-deep)', borderBottom: '1px solid var(--border)',
        height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0,
      }}>
        {/* Hamburger — solo mobile */}
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: '6px 8px', marginRight: 8, flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 5h14M3 10h14M3 15h14"/>
          </svg>
        </button>

        {/* Logo */}
        <Link href="/dashboard" style={{ textDecoration: 'none', marginRight: 24, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.03em' }}>
            ENE Drinks
          </span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 11, marginLeft: 6, fontFamily: "'DM Sans', sans-serif' " }}>
            Rosario
          </span>
        </Link>

        {/* Nav links — solo desktop */}
        <div className="desktop-nav-links" style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV.slice(0, 6).map(n => <NavLink key={n.href} {...n} />)}
        </div>
      </nav>

      {/* SIDEBAR OVERLAY — mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.6)' }}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className="desktop-sidebar"
        style={{
          width: 220, flexShrink: 0, background: 'var(--surface-2)',
          borderRight: '1px solid var(--border)', padding: '20px 12px',
          position: 'fixed', top: 56, bottom: 0, left: sidebarOpen ? 0 : undefined,
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, zIndex: 160,
        }}
      >
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* SIDEBAR MOBILE — drawer */}
      {sidebarOpen && (
        <aside style={{
          width: 240, background: 'var(--surface-2)',
          borderRight: '1px solid var(--border)', padding: '20px 12px',
          position: 'fixed', top: 56, bottom: 0, left: 0,
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
          zIndex: 160,
        }}>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </aside>
      )}

      {/* MAIN */}
      <div style={{ display: 'flex', marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
        {/* Spacer desktop */}
        <div className="desktop-sidebar" style={{ width: 220, flexShrink: 0 }} />
        <main
          className="main-content"
          style={{ flex: 1, padding: '28px 32px', maxWidth: 1400, minWidth: 0 }}
        >
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM BAR */}
      <div
        className="mobile-bottom-bar"
        style={{
          display: 'none',
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--bordo-deep)', borderTop: '1px solid var(--border)',
          padding: '6px 0',
        }}
      >
        {NAV.slice(0, 5).map(t => <MobileTab key={t.href} {...t} />)}
      </div>
    </>
  )
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname.startsWith(href.split('/').slice(0, 2).join('/'))
  return (
    <>
      <SideSection label="Principal" />
      {NAV.slice(0, 3).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} onNavigate={onNavigate} />)}
      <SideSection label="Inventario" />
      {NAV.slice(3, 6).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} onNavigate={onNavigate} />)}
      <SideSection label="Finanzas" />
      {NAV.slice(6).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} onNavigate={onNavigate} />)}
    </>
  )
}

function NavLink({ href, label }: { href: string; label: string; icon?: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname.startsWith(href.split('/').slice(0, 2).join('/'))
  return (
    <Link href={href} style={{
      padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
      color: active ? 'var(--gold)' : 'var(--text-secondary)',
      background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
      textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{label}</Link>
  )
}

function SideSection({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 8px 4px' }}>
      {label}
    </div>
  )
}

function SideItem({ href, label, icon, active, onNavigate }: { href: string; label: string; icon: React.ReactNode; active: boolean; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
      borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400,
      color: active ? 'var(--gold)' : 'var(--text-secondary)',
      background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
      textDecoration: 'none', transition: 'all 0.15s',
    }}>
      <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  )
}

function MobileTab({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname.startsWith(href.split('/').slice(0, 2).join('/'))
  return (
    <Link href={href} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '4px 0', color: active ? 'var(--gold)' : 'var(--text-muted)',
      textDecoration: 'none', fontSize: 9, flex: 1, fontFamily: "'DM Sans', sans-serif",
    }}>
      {icon}
      <span>{label}</span>
    </Link>
  )
}

// ── Iconos ────────────────────────────────────────────────
function IconGrid()  { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/></svg> }
function IconCart()  { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1.5 1.5h2l.8 4M5 7h8l1.5-4H4"/><circle cx="6" cy="11.5" r="1.5"/><circle cx="12" cy="11.5" r="1.5"/></svg> }
function IconCal()   { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="2" width="13" height="11" rx="1"/><path d="M5 2V1M10 2V1M1 6h13"/></svg> }
function IconBox()   { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7.5 1L14 4.5v6L7.5 14 1 10.5v-6z"/><path d="M1 4.5l6.5 3.5M14 4.5L7.5 8M7.5 8v6"/></svg> }
function IconStock() { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 10V5l5-3 5 3v5l-5 3z"/></svg> }
function IconBag()   { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="11" height="9" rx="1"/><path d="M5 3V2a2.5 2.5 0 0 1 5 0v1"/></svg> }
function IconChart() { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 11l3-3 3 3 3-5 4 5"/></svg> }
function IconReport(){ return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="1" width="11" height="13" rx="1"/><path d="M5 5h5M5 8h5M5 11h3"/></svg> }
