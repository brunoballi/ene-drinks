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

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://ene-drinks.vercel.app`
- **Redirect URLs**: agregá estas dos entradas, **completas**:
  - `https://ene-drinks.vercel.app/reset-password`
  - `http://localhost:3000/reset-password` *(para poder probar en local)*

⚠️ Tiene que ser la **dirección entera**, con el dominio incluido. Un valor como
`https://reset-password` **no sirve**: ahí `reset-password` se interpreta como si
fuera el nombre de un sitio web (como `google.com`), no como una página de tu app.
Es la misma diferencia que entre escribir `ene-drinks.vercel.app/ganancias` y
escribir solo `ganancias`.

**Sin este paso el link de recuperar contraseña no funciona** — Supabase rechaza
cualquier redirección a una URL que no esté en esa lista.

---

## 3. Configurar el envío de mails (SMTP propio)

⚠️ **Esto es lo más importante para que la recuperación de contraseña sirva de verdad.**

### En criollo, qué es esto

Cuando el cliente aprieta "olvidé mi contraseña", **alguien tiene que mandar ese
mail**. Tu app no manda mails por sí sola: le pide a Supabase que lo haga.

Supabase trae un servicio de mail incluido, pero es de juguete — está pensado para
que el programador pruebe, no para uso real. Tiene un tope de más o menos **2 mails
por hora en todo el proyecto**, y encima suelen caer en spam. Traducido: el cliente
va a apretar el botón y **el mail no le va a llegar**.

La solución es contratar (gratis) un servicio que se dedique a mandar mails y
enchufárselo a Supabase. Es cargar 4 datos en una pantalla, una sola vez.

### Cómo se completa la pantalla de Supabase

En Supabase → **Authentication → Emails → SMTP Settings** hay **dos bloques
distintos**, y es fácil confundirlos:

**Bloque "SMTP provider settings"** — son los datos que te da Resend:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port number | `465` |
| Username | `resend` |
| Password | la API key que te dio Resend |

**Bloque "Sender details"** — esto **NO** son datos de Resend, es quién figura
como remitente del mail:

| Campo | Valor |
|---|---|
| Sender email address | una **dirección de mail real** (ver abajo) |
| Sender name | `Flowi Gestor` — es lo que ve el cliente en su bandeja |

⚠️ **Error típico:** poner `smtp.resend.com` en "Sender email address".
Ese campo pide un mail (`algo@algo.com`), no un servidor. Por eso Supabase lo
marca en rojo con "Must be a valid email" y no te deja guardar.

### Qué dirección poner como remitente

Depende de si tenés un dominio propio verificado en Resend:

- **Con dominio propio verificado** (ej. `enedrinks.com.ar`):
  poné `noreply@enedrinks.com.ar`. Es la opción más profesional y le llega a
  cualquiera.

- **Sin dominio propio:** Resend te deja usar `onboarding@resend.dev`, **pero
  solo entrega mails a la casilla con la que te registraste en Resend**
  (`ofiprof2025@gmail.com`). Sirve para que vos pruebes, pero **al cliente no le
  va a llegar nada**.

### Verificar un dominio en Resend

Es el paso que habilita que le llegue el mail al cliente.

1. Necesitás un dominio propio. Si no tenés, se compra en NIC.ar, Namecheap,
   Google Domains o similar (unos 15 USD/año).
2. En Resend → **Dominios** → **Add Domain** → escribí tu dominio.
3. Resend te muestra 3 registros DNS (uno `MX` y dos `TXT`: DKIM y SPF).
4. Entrá al panel donde compraste el dominio y cargá esos 3 registros tal cual.
5. Volvé a Resend y apretá **Verify**. Puede tardar de minutos a unas horas.
6. Cuando quede en verde, ya podés usar `noreply@tudominio.com` como
   "Sender email address" en Supabase.

> Si el dominio lo comprás en el mismo Vercel, también podés apuntarlo a la app
> y de paso el sistema deja de vivir en `ene-drinks.vercel.app`.

### Alternativa sin comprar dominio: usar Gmail

Si no tenés dominio y no querés comprar uno, se puede usar el SMTP de Gmail.
Manda desde tu casilla a cualquier destinatario, gratis, hasta ~500 mails por día.

1. En tu cuenta de Google activá la **Verificación en 2 pasos** (es requisito).
2. Andá a **Contraseñas de aplicación** y generá una. Te da 16 caracteres.
3. Cargá en Supabase:

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Username | `ofiprof2025@gmail.com` |
| Password | la contraseña de aplicación de 16 caracteres |
| Sender email address | `ofiprof2025@gmail.com` |
| Sender name | `Flowi Gestor` |

Contra: los mails salen desde tu Gmail personal, así que el cliente ve esa
dirección como remitente.

> Mientras no configures esto, el botón igual anda — pero el mail puede tardar,
> caer en spam o directamente no salir por el límite de envío.
>
> Si querés dejarlo para más adelante, no pasa nada: vos podés cambiarle la
> contraseña al cliente cuando lo necesite, corriendo de nuevo el script del paso 1.

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

1. Entrá a `https://ene-drinks.vercel.app` → te tiene que mandar al login.
2. Ingresá con el usuario que creaste → pantalla de bienvenida → sistema.
3. Configuración → **Datos del negocio** → cambiá el nombre y subí el logo.
4. Cerrá sesión → **¿Olvidaste tu contraseña?** → probá el flujo completo.

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
