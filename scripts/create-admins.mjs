// ============================================================
// CREACIÓN DE LOS 2 ADMINISTRADORES — Flowi Gestor
// ============================================================
// Este script crea (o actualiza la contraseña de) los dos únicos
// usuarios administradores del sistema: vos (desarrollador) y el
// cliente. Usa la "service role key" de Supabase, que da acceso
// total — por eso lo corrés vos mismo, nunca se la pases a nadie
// ni la subas a git.
//
// CÓMO USARLO:
//   1. Andá a Supabase → Project Settings → API → "service_role" key.
//      Copiala (NO es la anon key que ya está en .env.local).
//   2. Abrí una terminal en la carpeta Enedrinks/bebidas y corré:
//
//        node scripts/create-admins.mjs
//
//   3. Te va a pedir, por consola: la service role key, y después
//      el email y contraseña de cada uno de los 2 administradores.
//
// Podés volver a correrlo más adelante para cambiar una contraseña:
// si el email ya existe, actualiza la contraseña en vez de duplicar.
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

async function pedirCredenciales(rol) {
  const email = await rl.question(`Email del admin "${rol}": `)
  const password = await rl.question(`Contraseña del admin "${rol}" (mín. 6 caracteres): `)
  return { email: email.trim(), password: password.trim() }
}

async function crearOActualizar({ email, password }, rol) {
  const { data: lista, error: errLista } = await admin.auth.admin.listUsers()
  if (errLista) throw errLista

  const existente = lista.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existente) {
    const { error } = await admin.auth.admin.updateUserById(existente.id, { password })
    if (error) throw error
    console.log(`✓ Admin "${rol}" (${email}) ya existía — contraseña actualizada.`)
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    console.log(`✓ Admin "${rol}" (${email}) creado.`)
  }
}

async function main() {
  console.log('Vamos a crear/actualizar los 2 administradores del sistema.\n')

  const dev = await pedirCredenciales('desarrollador')
  const cliente = await pedirCredenciales('cliente')
  rl.close()

  await crearOActualizar(dev, 'desarrollador')
  await crearOActualizar(cliente, 'cliente')

  const { data: listaFinal } = await admin.auth.admin.listUsers()
  console.log(`\nListo. Total de usuarios en el proyecto: ${listaFinal.users.length}`)
  if (listaFinal.users.length > 2) {
    console.log('⚠️  Hay más de 2 usuarios — revisá si hace falta borrar alguno viejo desde el dashboard (Authentication → Users).')
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message ?? e)
  process.exit(1)
})
