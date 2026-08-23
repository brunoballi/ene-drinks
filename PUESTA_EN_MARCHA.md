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

### Decisión tomada: Resend con autoflowi.com

**Se probó Gmail y no funcionó.** Los logs de auth de Supabase mostraron esto:

```
454 4.7.0 Too many login attempts, please try again later
```

No era la contraseña. Gmail **bloquea el login** porque Supabase se conecta desde
IPs de datacenter que Google no reconoce y marca como sospechosas. Es un error
temporal (`4.x.x`), pero vuelve a aparecer: cada reintento profundiza el bloqueo.
Gmail + Supabase es frágil por diseño, no por algo mal configurado.

Resend no tiene ese problema — está hecho para mandar mail desde servidores.

La razón por la que en su momento habíamos descartado Resend (hacía falta comprar
un dominio) **ya no existe**: `autoflowi.com` es tuyo. Verificándolo en Resend, los
mails salen desde `noreply@autoflowi.com`, le llegan a cualquiera, y el cliente ve
un remitente profesional en vez de un Gmail personal. Costo: **$0**.

> 🔑 **Antes de empezar:** la API key vieja de Resend quedó expuesta en un chat.
> Borrala desde el panel de Resend y generá una nueva.

### Paso A — Verificar autoflowi.com en Resend

El DNS de `autoflowi.com` está **limpio**: no tiene MX, ni SPF, ni DMARC
(verificado el 2026-08-23). Así que los registros de Resend entran sin pisar nada.

1. Entrá a Resend → **Domains** → **Add Domain** → escribí `autoflowi.com`.
2. Elegí la región más cercana (`us-east-1` sirve).
3. Resend te muestra **3 registros DNS**. No los inventes ni los copies de acá:
   usá los que te muestra a vos, porque el DKIM es único de tu cuenta. Van a tener
   esta forma:

   | Tipo | Para qué |
   |---|---|
   | `MX` | ruta de rebotes (bounces) |
   | `TXT` | SPF — autoriza a Resend a mandar en tu nombre |
   | `TXT` | DKIM — la firma criptográfica, es la clave larga |

4. Cargalos en **Hostinger** → panel de `autoflowi.com` → **DNS / Nameservers**.

   ⚠️ **La misma trampa que con el subdominio:** en el campo **Name** de Hostinger
   va **solo la parte de adelante**, sin `.autoflowi.com`. Si Resend te dice que el
   registro va en `resend._domainkey.autoflowi.com`, en Hostinger el Name es
   `resend._domainkey` y nada más. Si pegás el nombre completo, te queda apuntando
   a `resend._domainkey.autoflowi.com.autoflowi.com` y no verifica nunca.

   Para el registro de la raíz, Hostinger usa `@` como Name.

5. Volvé a Resend y apretá **Verify**. Suele tardar minutos; puede estirarse a
   un par de horas según el TTL.

### Paso B — Cargar Resend en Supabase

1. En Resend → **API Keys** → **Create API Key**. Permiso de envío alcanza.
   Copiala apenas la genera: **no se vuelve a mostrar**.
2. En Supabase → **Authentication → Emails → SMTP Settings**, activá el toggle
   *Enable Custom SMTP* y cargá:

**Bloque "SMTP provider settings"**

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port number | `465` |
| Username | `resend` |
| Password | la API key que acabás de generar |

⚠️ El Username es literalmente la palabra `resend`, igual para todo el mundo. No
es tu email ni tu nombre de usuario de Resend.

**Bloque "Sender details"** — esto es quién figura como remitente, no son datos
del servidor:

| Campo | Valor |
|---|---|
| Sender email address | `noreply@autoflowi.com` |
| Sender name | `Flowi Gestor` |

⚠️ **Error típico:** poner `smtp.resend.com` en "Sender email address". Ese campo
pide un mail (`algo@algo.com`), no un servidor. Supabase lo marca en rojo con
"Must be a valid email" y no te deja guardar.

⚠️ El dominio del Sender **tiene que ser el que verificaste**. Si Resend todavía no
te puso `autoflowi.com` en verde, cualquier envío desde `noreply@autoflowi.com` va
a fallar con un `403`.

3. Guardá y probá el flujo completo (paso 6).

> No hace falta que exista una casilla `noreply@autoflowi.com`. Es una dirección de
> solo salida: sirve para mandar, nadie la lee. Si el cliente le responde, el mail
> se pierde — por eso se llama así.

### Cómo saber si quedó bien

Pedí un reset de contraseña con **un email que exista de verdad** en
Authentication → Users:

- **Llega el mail** → listo.
- **Error 500 "Error sending recovery email"** → algo del SMTP está mal, pero
  Supabase no te dice qué. Dos formas de averiguarlo:

  **La rápida**, desde tu máquina:

  ```powershell
  $env:SMTP_HOST = 'smtp.resend.com'
  $env:SMTP_USER = 'resend'
  $env:SMTP_PASS = 'tu-api-key-de-resend'
  node scripts/test-smtp.mjs
  ```

  Se conecta igual que Supabase y te devuelve la respuesta cruda del servidor,
  traducida. La clave se lee de una variable de entorno, no queda escrita en
  ningún archivo.

  **La definitiva**, Supabase → **Logs → Auth Logs**: ahí figura el error tal cual
  lo devolvió el proveedor. Fue así como descubrimos el `454` de Gmail. Si el visor
  de logs se cae (pasa seguido), usá la vía rápida.

  Errores típicos con Resend:

  | Respuesta | Qué significa |
  |---|---|
  | `535 Authentication credentials invalid` | la API key está mal o incompleta |
  | `403` al enviar | el dominio todavía no está verificado en Resend |
  | `454` | bloqueo temporal por reintentos — esperá |
- **Responde 200 y no llega nada** → ese email no existe como usuario. Supabase
  contesta igual exista o no, a propósito, para que nadie pueda averiguar qué
  cuentas están registradas. Fijate que esté bien escrito.

### Más adelante: DMARC

Con SPF y DKIM (los que carga Resend) ya alcanza para que el mail entre bien. Si
en algún momento querés apretar más la seguridad del dominio, se agrega un
`TXT` en `_dmarc.autoflowi.com` con `v=DMARC1; p=none; rua=mailto:tu@mail.com`.
Empezá siempre con `p=none`, que solo reporta y no rechaza nada.

No es urgente ni bloquea nada.

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
