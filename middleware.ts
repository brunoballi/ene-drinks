import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/recuperar', '/reset-password', '/api/ping']

// Rutas donde el middleware NO tiene que tocar las cookies de autenticación.
//
// El flujo de recuperación de contraseña usa PKCE: cuando el usuario pide el
// enlace, el navegador guarda un "code verifier" en una cookie, y ese verifier
// es lo único que permite canjear el enlace del mail por una sesión.
//
// Si acá creamos un cliente de Supabase y le pedimos el usuario, al no
// encontrar sesión limpia las cookies de auth — y se lleva puesto el verifier.
// El resultado es desconcertante: Supabase da el token por válido (el /verify
// responde 303 sin error) pero el navegador ya no puede canjearlo, así que la
// pantalla muestra "el enlace no es válido o ya venció".
//
// Por eso, en el aterrizaje del enlace no tocamos nada y dejamos que la página
// haga el canje con las cookies intactas.
function esAterrizajeDeAuth(request: NextRequest) {
  return (
    request.nextUrl.pathname === '/reset-password' ||
    request.nextUrl.searchParams.has('code')
  )
}

export async function middleware(request: NextRequest) {
  if (esAterrizajeDeAuth(request)) return NextResponse.next()

  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))

  // Al redirigir hay que arrastrar las cookies que Supabase haya renovado
  // recién. NextResponse.redirect() crea una respuesta nueva: si no las
  // copiamos, se descartan y la sesión se corta sola cada tanto.
  const redirigirA = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const redireccion = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => redireccion.cookies.set(cookie))
    return redireccion
  }

  if (!user && !isPublic) return redirigirA('/login')
  if (user && path === '/login') return redirigirA('/bienvenida')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
