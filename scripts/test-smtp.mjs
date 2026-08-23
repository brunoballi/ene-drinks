// Diagnóstico de credenciales SMTP de Gmail.
//
// Se conecta a Gmail igual que lo hace Supabase e intenta autenticarse, para
// ver el mensaje de error real que Supabase esconde detrás de
// "Error sending recovery email".
//
// Uso (PowerShell, parado en Enedrinks/bebidas):
//
//   $env:SMTP_PASS = 'tucontraseñadeaplicacion'
//   node scripts/test-smtp.mjs
//
// La contraseña se lee de una variable de entorno: no se escribe en ningún
// archivo ni se imprime en pantalla. Cuando termines, cerrá la terminal.
//
// Opcional, si la casilla no es ofiprof2025@gmail.com:
//   $env:SMTP_USER = 'otra@gmail.com'

import net from 'node:net'
import tls from 'node:tls'

const HOST = 'smtp.gmail.com'
const USER = process.env.SMTP_USER || 'ofiprof2025@gmail.com'
const RAW  = process.env.SMTP_PASS || ''
const TIMEOUT = 15000

if (!RAW) {
  console.error('\n  Falta la contraseña. Corré primero:\n')
  console.error("    $env:SMTP_PASS = 'tucontraseñadeaplicacion'\n")
  process.exit(1)
}

// Google muestra la contraseña de aplicación como "abcd efgh ijkl mnop".
// Los espacios no van. Si estaban, es probable que sea justo ese el problema.
const PASS = RAW.replace(/\s+/g, '')
const teniaEspacios = PASS !== RAW

function conectar(sock) {
  let buf = Buffer.alloc(0)
  let esperando = null

  const alLlegarDatos = (chunk) => {
    buf = Buffer.concat([buf, chunk])
    intentarResolver()
  }
  sock.on('data', alLlegarDatos)

  // Una respuesta SMTP termina cuando aparece una línea "NNN " (código y
  // espacio). Mientras sea "NNN-" todavía vienen más líneas.
  function intentarResolver() {
    if (!esperando) return
    const texto = buf.toString('utf8')
    if (/(^|\n)\d{3} [^\n]*\n$/.test(texto)) {
      buf = Buffer.alloc(0)
      const { resolve } = esperando
      esperando = null
      resolve(texto.trim())
    }
  }

  return {
    leer: () => new Promise((resolve, reject) => {
      esperando = { resolve, reject }
      intentarResolver()
      setTimeout(() => {
        if (esperando) { esperando = null; reject(new Error('timeout esperando respuesta')) }
      }, TIMEOUT)
    }),
    enviar: (linea) => sock.write(linea + '\r\n'),
    soltar: () => sock.removeListener('data', alLlegarDatos),
  }
}

const cuandoPase = (emisor, evento) => new Promise((resolve, reject) => {
  emisor.once(evento, resolve)
  emisor.once('error', reject)
  setTimeout(() => reject(new Error('timeout conectando')), TIMEOUT)
})

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')

async function autenticar(c) {
  c.enviar('AUTH LOGIN')
  await c.leer()
  c.enviar(b64(USER))
  await c.leer()
  c.enviar(b64(PASS))
  const respuesta = await c.leer()
  try { c.enviar('QUIT') } catch {}
  return respuesta
}

async function probar465() {
  const sock = tls.connect({ host: HOST, port: 465, servername: HOST })
  await cuandoPase(sock, 'secureConnect')
  const c = conectar(sock)
  await c.leer()
  c.enviar('EHLO diagnostico.local')
  await c.leer()
  const r = await autenticar(c)
  sock.destroy()
  return r
}

async function probar587() {
  const plano = net.connect({ host: HOST, port: 587 })
  await cuandoPase(plano, 'connect')
  const cPlano = conectar(plano)
  await cPlano.leer()
  cPlano.enviar('EHLO diagnostico.local')
  await cPlano.leer()
  cPlano.enviar('STARTTLS')
  await cPlano.leer()
  cPlano.soltar() // el socket pasa a manos de TLS

  const seguro = tls.connect({ socket: plano, servername: HOST })
  await cuandoPase(seguro, 'secureConnect')
  const c = conectar(seguro)
  c.enviar('EHLO diagnostico.local')
  await c.leer()
  const r = await autenticar(c)
  seguro.destroy()
  return r
}

function interpretar(respuesta) {
  if (/^235/.test(respuesta)) return { ok: true, texto: 'Autenticación aceptada.' }
  if (/534.*5\.7\.9|Application-specific password required/i.test(respuesta))
    return { ok: false, texto: 'Estás usando la contraseña normal de Gmail. Hace falta una contraseña de APLICACIÓN (16 caracteres), que se genera en myaccount.google.com/apppasswords con la verificación en 2 pasos activada.' }
  if (/535.*5\.7\.8|Username and Password not accepted/i.test(respuesta))
    return { ok: false, texto: 'Gmail rechazó usuario o contraseña. Revisá que la contraseña de aplicación esté completa, sin espacios, y que corresponda a esta misma casilla.' }
  if (/5\.7\.14|Please log in via your web browser/i.test(respuesta))
    return { ok: false, texto: 'Google bloqueó el intento por seguridad. Entrá a la casilla desde el navegador, revisá las alertas de seguridad y volvé a generar la contraseña de aplicación.' }
  return { ok: false, texto: 'Gmail rechazó la autenticación. El texto de arriba es la razón exacta.' }
}

console.log('')
console.log('  Casilla:', USER)
console.log('  Largo de la contraseña:', PASS.length, 'caracteres', PASS.length === 16 ? '(correcto)' : '(ojo: una contraseña de aplicación tiene 16)')
if (teniaEspacios) console.log('  ⚠ La contraseña tenía espacios. Los saqué para esta prueba, pero en Supabase hay que cargarla SIN espacios.')
console.log('')

for (const [puerto, fn] of [['465 (TLS directo)', probar465], ['587 (STARTTLS)', probar587]]) {
  process.stdout.write(`  Puerto ${puerto}: `)
  try {
    const respuesta = await fn()
    const { ok, texto } = interpretar(respuesta)
    console.log(ok ? 'OK' : 'FALLA')
    console.log('    Gmail respondió:', respuesta.split('\n').pop().trim())
    console.log('    →', texto)
  } catch (e) {
    console.log('ERROR')
    console.log('    →', e.message)
  }
  console.log('')
}

console.log('  Si un puerto da OK y el otro no, usá en Supabase el que dio OK.')
console.log('')
