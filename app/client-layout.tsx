'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { useState, useEffect } from 'react'
import { getStockBajo, getNegocio } from '@/lib/queries'
import { STOCK_THRESHOLD } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

const CHROMELESS = ['/login', '/recuperar', '/reset-password', '/bienvenida']

// Marca en sessionStorage: el recordatorio se muestra una vez por ingreso,
// no en cada navegación entre pantallas.
const POPUP_KEY = 'flowi_recordatorio_stock'

const NAV = [
  { href: '/dashboard',       label: 'Panel General',  icon: <IconGrid /> },
  { href: '/ventas/nueva',    label: 'Venta',      icon: <IconCart /> },
  { href: '/ventas/historial',label: 'Historial',  icon: <IconCal />  },
  { href: '/productos',       label: 'Productos',  icon: <IconBox />  },
  { href: '/stock',           label: 'Stock',      icon: <IconStock />},
  { href: '/compras',         label: 'Compras',    icon: <IconBag />  },
  { href: '/ganancias',       label: 'Ganancias',  icon: <IconChart />},
  { href: '/reportes',        label: 'Reportes',   icon: <IconReport />},
  { href: '/configuracion',   label: 'Configuración', icon: <IconGear />},
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertas, setAlertas] = useState<any[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [negocio, setNegocio] = useState<{ nombre: string; logo_url: string | null } | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  const chromeless = CHROMELESS.includes(pathname)

  useEffect(() => {
    if (chromeless) return
    const cargarAlertas = () => getStockBajo(STOCK_THRESHOLD)
      .then(a => {
        const lista = a ?? []
        setAlertas(lista)
        // Recordatorio al ingresar: una vez por sesión, solo si hay algo que avisar
        if (lista.length > 0 && !sessionStorage.getItem(POPUP_KEY)) {
          sessionStorage.setItem(POPUP_KEY, '1')
          setPopupOpen(true)
        }
      })
      .catch(() => {})
    cargarAlertas()
    const interval = setInterval(cargarAlertas, 5 * 60 * 1000)

    getNegocio().then(setNegocio).catch(() => setNegocio({ nombre: 'Flowi Gestor', logo_url: null }))

    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))

    return () => clearInterval(interval)
  }, [chromeless])

  const cerrarSesion = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    sessionStorage.removeItem(POPUP_KEY) // que vuelva a aparecer en el próximo ingreso
    router.push('/login')
    router.refresh()
  }

  if (chromeless) {
    return (
      <>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-primary)' },
          }}
        />
        {children}
      </>
    )
  }

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
        <Link href="/dashboard" style={{ textDecoration: 'none', marginRight: 24, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {negocio?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 5, objectFit: 'cover' }} />
          )}
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.03em' }}>
            {negocio?.nombre ?? 'Flowi Gestor'}
          </span>
        </Link>

        {/* Nav links — solo desktop */}
        <div className="desktop-nav-links" style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV.slice(0, 6).map(n => <NavLink key={n.href} {...n} />)}
        </div>

        {/* Campanita + usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setBellOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: alertas.length > 0 ? 'var(--gold)' : 'var(--text-secondary)', padding: '6px 8px', position: 'relative' }}
            title="Alertas de stock bajo"
          >
            <IconBell />
            {alertas.length > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, background: '#E05252', color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: 999, minWidth: 15, height: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                lineHeight: 1,
              }}>{alertas.length > 99 ? '99+' : alertas.length}</span>
            )}
          </button>

          {bellOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setBellOpen(false)} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 191,
                width: 300, maxHeight: 360, overflowY: 'auto',
                background: 'var(--surface-2)', border: '1px solid var(--border-hover)', borderRadius: 12,
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Stock bajo {alertas.length > 0 && `(${alertas.length})`}
                </div>
                {alertas.length === 0 ? (
                  <p style={{ padding: '16px', fontSize: 13, color: '#5BAD7A' }}>✓ Todo el stock OK</p>
                ) : (
                  <div style={{ padding: '6px 0' }}>
                    {alertas.map((a: any) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.stock_total_un === 0 ? '#E05252' : '#E0A050', flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</span>
                        <span style={{ color: a.stock_total_un === 0 ? '#E05252' : '#E0A050', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{a.stock_total_un} un.</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/stock" onClick={() => setBellOpen(false)} style={{ display: 'block', padding: '10px 16px', fontSize: 12, color: 'var(--gold)', textDecoration: 'none', borderTop: '1px solid var(--border)' }}>
                  Ver módulo de Stock →
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Usuario / cerrar sesión */}
        {userEmail && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              title={userEmail}
            >
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {userEmail[0]?.toUpperCase()}
              </span>
            </button>
            {userMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setUserMenuOpen(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 191, width: 220,
                  background: 'var(--surface-2)', border: '1px solid var(--border-hover)', borderRadius: 12,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userEmail}
                  </div>
                  <button
                    onClick={cerrarSesion}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, color: '#E05252', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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

      {/* POPUP RECORDATORIO — al ingresar al sistema */}
      {popupOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setPopupOpen(false)}
        >
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-hover)', borderRadius: 14, width: '100%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(224,82,82,0.15)', color: '#E05252', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>!</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 600 }}>Recordatorio</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {alertas.length} {alertas.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición
                </p>
              </div>
            </div>

            <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1 }}>
              {alertas.map((a: any) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', fontSize: 13, borderRadius: 6 }} className="table-row-hover">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.stock_total_un === 0 ? '#E05252' : '#E0A050', flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</span>
                  <span style={{ color: a.stock_total_un === 0 ? '#E05252' : '#E0A050', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                    {a.stock_total_un === 0 ? 'Sin stock' : `${a.stock_total_un} un.`}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setPopupOpen(false)}>Entendido</button>
              <Link href="/stock" className="btn-primary" onClick={() => setPopupOpen(false)}>Ver stock</Link>
            </div>
          </div>
        </div>
      )}
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
      {NAV.slice(6, 8).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} onNavigate={onNavigate} />)}
      <SideSection label="Sistema" />
      {NAV.slice(8).map(n => <SideItem key={n.href} active={isActive(n.href)} {...n} onNavigate={onNavigate} />)}
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
function IconGear()  { return <svg width="20" height="20" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7.5" cy="7.5" r="2.3"/><path d="M7.5 1.5v1.4M7.5 12.1v1.4M13.5 7.5h-1.4M2.9 7.5H1.5M11.6 3.4l-1 1M4.4 10.6l-1 1M11.6 11.6l-1-1M4.4 4.4l-1-1"/></svg> }
function IconBell()  { return <svg width="18" height="18" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 6a4.5 4.5 0 0 1 9 0c0 2.5.7 3.5 1.3 4.2H1.7C2.3 9.5 3 8.5 3 6z"/><path d="M6 12.5a1.5 1.5 0 0 0 3 0"/></svg> }
