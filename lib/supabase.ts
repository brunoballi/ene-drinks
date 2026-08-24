import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

// Un solo cliente para todo el navegador.
//
// Antes esta función devolvía un cliente nuevo en cada llamada, y como se la
// llama desde casi todas las pantallas, terminaban conviviendo varios clientes
// con estados de sesión distintos.
//
// Eso rompía la recuperación de contraseña de una forma muy difícil de ver: al
// abrir el enlace del mail, el primer cliente que arranca detecta el token en
// la URL, lo canjea, guarda la sesión en la cookie y limpia la URL. Pero el
// cliente de la pantalla de cambio de contraseña era **otra instancia**, creada
// antes de todo eso, que se había quedado con "no hay sesión" en memoria y no
// volvía a mirar. Resultado: sesión válida en la cookie, token perfecto, y la
// pantalla mostrando "el enlace no es válido o ya venció".
//
// Con una sola instancia, el canje y la pantalla comparten estado y el evento
// de recuperación llega a donde tiene que llegar.
let cliente: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!cliente) {
    cliente = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return cliente
}
