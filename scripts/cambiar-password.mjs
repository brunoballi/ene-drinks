// ============================================================
// CAMBIAR LA CONTRASEÑA DE UN ADMINISTRADOR — Flowi Gestor
// ============================================================
// Para cuando el cliente (o vos) se olvida la contraseña y no
// queremos depender del mail de recuperación.
//
// Es la versión de un solo usuario de create-admins.mjs: ese pide
// los dos admins de una, este toca solamente al que le digas.
//
// CÓMO USARLO:
//   1. Andá a Supabase → Project Settings → API → "service_role" key.
//      Copiala (NO es la anon key que está en .env.local).
//   2. Abrí una terminal en Enedrinks/bebidas y corré:
//
//        node scripts/cambiar-password.mjs
//
//   3. Te pide la service role key, el email del usuario y la
//      contraseña nueva. Listo: el cliente entra con esa.
//
// La service role key da acceso total a la base. No la subas a git
// ni se la pases a nadie.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mhnqidgxbwfdibrnaabs.supabase.co'

const rl = readline.createInterface({ input: stdin, output: stdout })

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (await rl.question('Pegá la service role key (Supabase → Settings → API): ')).trim()

if (!SERVICE_ROLE_KEY) {
  console.error('❌ No ingresaste la service role key.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: lista, error: errLista } = await admin.auth.admin.listUsers()
  if (errLista) throw errLista

  if (lista.users.length === 0) {
    console.error('\n❌ No hay ningún usuario creado. Usá create-admins.mjs primero.')
    process.exit(1)
  }

  console.log('\nUsuarios que existen hoy:')
  lista.users.forEach((u, i) => console.log(`  ${i + 1}. ${u.email}`))
  console.log('')

  const email = (await rl.question('Email del usuario a modificar: ')).trim()
  const usuario = lista.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!usuario) {
    console.error(`\n❌ No existe ningún usuario con el email "${email}".`)
    console.error('   Fijate en la lista de arriba, tiene que coincidir exacto.')
    rl.close()
    process.exit(1)
  }

  const password = (await rl.question('Contraseña nueva (mín. 6 caracteres): ')).trim()
  rl.close()

  if (password.length < 6) {
    console.error('\n❌ La contraseña tiene que tener al menos 6 caracteres.')
    process.exit(1)
  }

  const { error } = await admin.auth.admin.updateUserById(usuario.id, { password })
  if (error) throw error

  console.log(`\n✓ Contraseña de ${usuario.email} actualizada.`)
  console.log('  Ya puede entrar con la nueva. Decile que la cambie si te la dictó por teléfono.\n')
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message ?? e)
  process.exit(1)
})
