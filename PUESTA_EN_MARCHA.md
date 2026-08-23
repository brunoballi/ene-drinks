# Puesta en marcha — Login y administradores (Flowi Gestor)

Seguí los pasos **en este orden**. El orden importa: el paso 4 corta el acceso
público a los datos, así que si lo hacés antes de deployar, la app en producción
deja de funcionar hasta que subas el código nuevo.

---

## 1. Crear los 2 administradores

Abrí una terminal en `Enedrinks/bebidas` y corré:

```bash
node scripts/create-admins.mjs
```

Te va a pedir por consola:
- La **service role key** (Supabase → Project Settings → API → `service_role`).
  Ojo: **no** es la anon key que ya está en `.env.local`.
- Email y contraseña del admin **desarrollador** (vos).
- Email y contraseña del admin **cliente**.

> Podés volver a correrlo cuando quieras para **cambiar una contraseña**: si el
> email ya existe, la actualiza en vez de crear un usuario duplicado.

Para **dar de baja** un admin: Supabase → Authentication → Users → borrar el usuario.

---

## 2. Configurar las URLs de autenticación

> Hacé primero el [paso 2.bis](#2bis-poner-la-app-en-gestorautoflowicom) si todavía
> no configuraste el dominio propio, así cargás las URLs definitivas de una sola vez.

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://gestor.autoflowi.com`
- **Redirect URLs**: agregá estas tres entradas, **completas**:
  - `https://gestor.autoflowi.com/reset-password`
  - `https://ene-drinks.vercel.app/reset-password` *(el dominio viejo, por las dudas)*
  - `http://localhost:3000/reset-password` *(para poder probar en local)*

⚠️ Tiene que ser la **dirección entera**, con el dominio incluido. Un valor como
`https://reset-password` **no sirve**: ahí `reset-password` se interpreta como si
fuera el nombre de un sitio web (como `google.com`), no como una página de tu app.
Es la misma diferencia que entre escribir `gestor.autoflowi.com/ganancias` y
escribir solo `ganancias`.

**Sin este paso el link de recuperar contraseña no funciona** — Supabase rechaza
cualquier redirección a una URL que no esté en esa lista.

---

## 2.bis. Poner la app en gestor.autoflowi.com

En vez de comprar un dominio nuevo, la app usa un subdominio de `autoflowi.com`,
que ya es tuyo. Costo: **$0**.

### Cómo está armado hoy

`autoflowi.com` está **registrado en Hostinger** (los nameservers son
`hermes.dns-parking.com` y `artemis.dns-parking.com`), pero apunta a Vercel con
registros DNS: el `A` de la raíz va a `216.198.79.1` y el `www` va por `CNAME` a
`cname.vercel-dns.com`.

Traducido: **el dominio se administra en Hostinger, no en Vercel.** Por eso el
subdominio nuevo hay que crearlo en los dos lados — se avisa en Vercel y se crea
el registro en Hostinger.

### Los pasos

1. **Vercel** → proyecto `ene-drinks` → **Settings → Domains** → *Add Domain* →
   escribí `gestor.autoflowi.com`.
2. Vercel lo va a marcar en rojo como **"Invalid Configuration"** y te va a mostrar
   el registro DNS que le falta. Es lo esperado, no está roto — todavía no existe
   el registro.
3. **Hostinger** → panel de `autoflowi.com` → **DNS / Nameservers** → *Add record*:

   | Campo | Valor |
   |---|---|
   | Tipo | `CNAME` |
   | Nombre / Host | `gestor` (solo eso, **no** `gestor.autoflowi.com`) |
   | Apunta a / Target | `cname.vercel-dns.com` |
   | TTL | el que venga por defecto |

4. Volvé a Vercel y esperá. Suele tardar unos minutos; el TTL puede estirarlo hasta
   un par de horas. Cuando Vercel lo verifica, pasa a **"Valid Configuration"** y
   emite el certificado HTTPS solo. No hay que tocar nada más.
5. Recién ahí hacé el **paso 2** con las URLs de `gestor.autoflowi.com`.

> `ene-drinks.vercel.app` **sigue funcionando** después de esto. No se rompe nada:
> quedan las dos direcciones sirviendo la misma app. Si en algún momento querés que
> la vieja redirija a la nueva, se configura en Vercel → Domains.

### Por qué este subdominio y no un dominio comprado

Se evaluó comprar `flowigestor.com` o `enedrinks.com` (~$11.25/año cada uno en
Vercel). Se descartó **por ahora**: el objetivo inmediato era sacar la app de
`ene-drinks.vercel.app` para poder probar, y el subdominio lo resuelve gratis y
sin esperar.

No cierra ninguna puerta. Si más adelante comprás un dominio propio, se agrega en
Vercel igual que este y se actualizan las URLs de Supabase.

Ojo: los `.com.ar` **no se compran en Vercel**, van por NIC.ar.

---

## 3. Configurar el envío de mails (SMTP propio) — *opcional*

> **No es obligatorio para que el sistema funcione.** Si el cliente se olvida la
> contraseña, se la cambiás vos en 30 segundos con el
> [paso 3.ter](#3ter-cambiarle-la-contraseña-al-cliente-sin-mail). Con 2 usuarios,
> esa vía alcanza y sobra.
>
> El SMTP sirve para que el cliente se recupere solo, sin llamarte. Es comodidad,
> no un requisito. Dejalo para cuando tengas ganas.

### En criollo, qué es esto

Cuando el cliente aprieta "olvidé mi contraseña", **alguien tiene que mandar ese
mail**. Tu app no manda mails por sí sola: le pide a Supabase que lo haga.

Supabase trae un servicio de mail incluido, pero es de juguete — está pensado para
que el programador pruebe, no para uso real. Tiene un tope de más o menos **2 mails
por hora en todo el proyecto**, y encima suelen caer en spam. Traducido: el cliente
va a apretar el botón y **el mail no le va a llegar**.

La solución es contratar (gratis) un servicio que se dedique a mandar mails y
enchufárselo a Supabase. Es cargar 4 datos en una pantalla, una sola vez.

### Decisión tomada: se usa Gmail

Se descartó Resend por ahora. Resend sin dominio propio solo entrega mails a la
casilla del desarrollador (`onboarding@resend.dev`), así que **al cliente nunca le
iba a llegar nada**. Comprar un dominio quedó para más adelante.

Gmail manda desde tu casilla a cualquier destinatario, gratis, hasta ~500 mails
por día. La contra es que el cliente ve tu dirección personal como remitente.

> 🔑 **Pendiente de higiene:** la API key vieja de Resend quedó expuesta en un chat.
> Aunque ya no se use, borrala desde el panel de Resend.

### Configurar Gmail como SMTP

1. En tu cuenta de Google activá la **Verificación en 2 pasos** (es requisito, sin
   esto no aparece la opción del paso 2).
2. Andá a **Contraseñas de aplicación** (https://myaccount.google.com/apppasswords)
   y generá una. Te da 16 caracteres, con espacios que **no** hay que copiar.
3. En Supabase → **Authentication → Emails → SMTP Settings**, activá el toggle
   *Enable Custom SMTP* y cargá:

**Bloque "SMTP provider settings"**

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Username | `ofiprof2025@gmail.com` |
| Password | la contraseña de aplicación de 16 caracteres (sin espacios) |

**Bloque "Sender details"** — esto es quién figura como remitente, no son datos
del servidor:

| Campo | Valor |
|---|---|
| Sender email address | `ofiprof2025@gmail.com` |
| Sender name | `Flowi Gestor` |

⚠️ **Error típico:** poner `smtp.gmail.com` en "Sender email address". Ese campo
pide un mail (`algo@algo.com`), no un servidor. Supabase lo marca en rojo con
"Must be a valid email" y no te deja guardar.

⚠️ El **Username** y el **Sender email address** tienen que ser la **misma**
casilla. Gmail rechaza el envío si el remitente no coincide con la cuenta que
autentica, y el síntoma es un error 500 al pedir el reset.

4. Guardá y probá el flujo completo (paso 6).

### Cómo saber si quedó bien

Pedí un reset de contraseña con **un email que exista de verdad** en
Authentication → Users:

- **Llega el mail** → listo.
- **Error 500 "Error sending recovery email"** → las credenciales SMTP están mal.
  Supabase no te dice por qué. Para sacarle el motivo real a Gmail, corré:

  ```powershell
  $env:SMTP_PASS = 'tucontraseñadeaplicacion'
  node scripts/test-smtp.mjs
  ```

  Se conecta a Gmail igual que Supabase y te devuelve la respuesta cruda del
  servidor: si la contraseña está mal (`535`), si estás usando la contraseña
  normal en vez de una de aplicación (`534`), o si el problema es el puerto.
  La contraseña se lee de una variable de entorno, no queda escrita en ningún
  archivo.
- **Responde 200 y no llega nada** → ese email no existe como usuario. Supabase
  contesta igual exista o no, a propósito, para que nadie pueda averiguar qué
  cuentas están registradas. Fijate que esté bien escrito.

### Más adelante: mandar desde noreply@autoflowi.com

No hace falta comprar nada. Como `autoflowi.com` ya es tuyo (ver paso 2.bis),
podés verificarlo en Resend y mandar los mails desde `noreply@autoflowi.com` en
vez de tu Gmail personal. Es el upgrade natural cuando quieras que el remitente se
vea profesional.

El procedimiento sería: Resend → **Add Domain** → `autoflowi.com` → cargar los 3
registros DNS que te muestra (un `MX` y dos `TXT`, DKIM y SPF) **en Hostinger**,
que es donde vive el DNS → **Verify**.
Después en Supabase se cambian los 4 campos de SMTP por los de Resend
(`smtp.resend.com`, puerto `465`, usuario `resend`, password = API key).

---

## 3.ter. Cambiarle la contraseña al cliente sin mail

Este es el camino que **siempre funciona**, sin SMTP, sin Gmail y sin dominio.
Si el cliente te llama porque no puede entrar, corré esto y en 30 segundos está
adentro.

```bash
node scripts/cambiar-password.mjs
```

Te va a pedir:

1. La **service role key** (Supabase → Project Settings → API → `service_role`).
   No es la anon key.
2. El **email** del usuario. Antes te muestra la lista de los que existen, así que
   no hace falta que te acuerdes.
3. La **contraseña nueva**.

Listo. El cliente entra con esa. Si se la dictaste por teléfono, decile que la
cambie desde el sistema.

> Diferencia con `create-admins.mjs`: aquel pide los dos admins de una y sirve
> para el alta inicial. Este toca un solo usuario y es el de uso diario.

---

## 3.bis. Crear la tabla del negocio

En Supabase → **SQL Editor**, pegá y ejecutá [`setup_1_negocio.sql`](./db/setup_1_negocio.sql).

Esto crea la tabla `negocio` (nombre + logo) y el bucket para las imágenes.
**Es seguro correrlo ahora**: solo agrega cosas nuevas, no rompe la app que está
online hoy.

---

## 4. Deployar el código

```bash
git add -A
git commit -m "Login, administradores y recuperación de contraseña"
git push
```

Vercel deploya solo desde el repo. Esperá a que termine antes del paso 5.

---

## 5. Cerrar el acceso público a los datos

Recién ahora, en Supabase → **SQL Editor**, pegá y ejecutá
[`setup_2_seguridad.sql`](./db/setup_2_seguridad.sql) y después
[`setup_3_vistas.sql`](./db/setup_3_vistas.sql).

Ese script **restringe todas las tablas a usuarios logueados**.

Hasta que no lo corras, cualquiera con la anon key (que viaja en el código del
navegador, es pública por diseño) puede leer y escribir toda la base. El login
solo es una puerta visual hasta ese momento.

---

## 6. Probar

Este checklist nunca se corrió entero en producción con sesión iniciada. Conviene
hacerlo de una sentada y anotar qué falla.

**Acceso**

1. Entrá a `https://gestor.autoflowi.com` → te tiene que mandar al login.
2. Probá una URL interna sin sesión, ej. `/ventas` → tiene que rebotar al login.
3. Ingresá con el usuario que creaste → pantalla de bienvenida → sistema.

**Negocio**

4. Configuración → **Datos del negocio** → cambiá el nombre y subí el logo.
5. Recargá y confirmá que el logo y el nombre nuevo aparecen en la barra.

**Stock (lo más importante — los triggers nunca se probaron en real)**

6. Anotá el stock actual de un producto cualquiera.
7. Cargá una **venta** con ese producto → el stock tiene que **bajar** por la
   cantidad vendida.
8. **Borrá** esa venta → el stock tiene que **volver** al número del punto 6.
9. Cargá una **compra** de ese producto → el stock tiene que **subir**.
10. **Borrá** la compra → el stock vuelve a bajar y la deuda al proveedor se
    descuenta.
11. Bajá un producto por debajo de su mínimo → tiene que aparecer el **popup de
    stock bajo**.

**Contraseña**

12. Cerrá sesión → **¿Olvidaste tu contraseña?** → poné un email que exista de
    verdad en Authentication → Users → revisá que llegue el mail (mirá spam).
13. Abrí el enlace **en el mismo navegador** → cambiá la contraseña → entrá con la
    nueva.

---

## Probar en local (antes de subir nada)

El servidor local ya está corriendo en **http://localhost:3000**.

Para poder entrar necesitás, como mínimo, haber hecho el **paso 1**
(crear al menos un administrador). Sin usuario no hay forma de pasar el login.

Para que funcione además la parte de "Datos del negocio", corré también el
**paso 3.bis**.

Los pasos 2 y 3 (URLs y SMTP) solo hacen falta para probar la recuperación de
contraseña por mail.

---

## Notas sobre la recuperación de contraseña

- El enlace del mail **vence en 1 hora**.
- Hay que abrirlo **en el mismo navegador** desde el que se pidió el cambio.
  Esto es por cómo funciona el flujo seguro (PKCE) de Supabase: el navegador
  guarda una clave temporal que hace falta para validar el enlace. Si el cliente
  pide el reset en la compu y abre el mail en el celular, no va a andar.
  La pantalla se lo avisa, pero conviene que lo sepas por si te consulta.
- Por seguridad, la pantalla responde lo mismo exista o no la cuenta, así nadie
  puede usarla para averiguar qué emails están registrados.
