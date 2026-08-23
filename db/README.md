# Scripts de base de datos

Todos se ejecutan en **Supabase → SQL Editor** (pegar y Run).
Ver [`../PUESTA_EN_MARCHA.md`](../PUESTA_EN_MARCHA.md) para el procedimiento completo.

## Puesta en marcha (en orden)

| # | Script | Cuándo | Estado |
|---|---|---|---|
| 1 | `setup_1_negocio.sql` | antes de deployar | ✅ aplicado |
| 2 | `setup_2_seguridad.sql` | **después** de deployar | ✅ aplicado |
| 3 | `setup_3_vistas.sql` | junto con el 2 | ✅ aplicado |

El orden importa: el 2 y el 3 cierran el acceso público a los datos. Si se corren
antes de subir el código con login, la app en producción se queda sin poder leer.

## Correcciones de triggers

| Script | Qué arregla | Estado |
|---|---|---|
| `fix_stock_al_borrar_venta.sql` | Borrar una venta ahora devuelve el stock | ✅ aplicado |
| `fix_stock_al_borrar_compra.sql` | Borrar una compra ahora descuenta el stock y la deuda | ✅ aplicado |

Ambos son idempotentes: se pueden volver a correr sin problema.

**Verificado en la base real el 2026-08-23** (vía MCP de Supabase): los 4 triggers
de stock existen y están activos — `trg_descontar_stock` (BEFORE INSERT) y
`trg_restaurar_stock` (AFTER DELETE) en `ventas_detalle`, `trg_aumentar_stock`
(AFTER INSERT) y `trg_revertir_stock_compra` (AFTER DELETE) en `compras`. Las 4
vistas (`v_stock`, `v_ganancias`, `v_resumen_diario`, `v_ventas_completas`) tienen
`security_invoker=on`.

## Higiene pendiente

| Script | Qué hace | Estado |
|---|---|---|
| `fix_search_path_funciones.sql` | Fija el `search_path` de las 7 funciones. Prioridad baja: son todas SECURITY INVOKER, así que el warning del linter no implica riesgo de escalada. | ⬜ sin aplicar |

También queda pendiente, y es un solo botón: Supabase → Authentication → Policies →
activar **Leaked Password Protection** (chequea las contraseñas contra
HaveIBeenPwned al crearlas).

## Mantenimiento

| Script | Para qué |
|---|---|
| `reset_historial_ventas.sql` | ⚠️ Borra **todo** el historial de ventas y reinicia la numeración. Irreversible. |
| `ver_funciones_stock.sql` | Diagnóstico: muestra el código de los triggers de stock |
| `ver_funcion_compras.sql` | Diagnóstico: ídem para compras |

## Histórico

| Script | Nota |
|---|---|
| `fix_rls.sql` | Abría las tablas a la anon key cuando no había login. **Reemplazado** por `setup_2_seguridad.sql`. Se conserva como referencia — no volver a correrlo. |
