-- ============================================================
-- Fijar el search_path de las funciones — Flowi Gestor
-- ============================================================
-- PRIORIDAD: BAJA. Es higiene, no un agujero.
--
-- El linter de Supabase avisa que estas 7 funciones no tienen el
-- search_path fijado. Se verificó que las 7 son SECURITY INVOKER
-- (corren con los permisos de quien las llama, no con los del
-- dueño), así que NO hay riesgo de escalada de privilegios. El
-- warning igual conviene sacarlo: con el search_path fijo nadie
-- puede hacer que la función resuelva un nombre de tabla hacia
-- otro esquema.
--
-- Es idempotente: se puede correr las veces que haga falta.
-- No cambia el comportamiento de ningún trigger.
-- ============================================================

alter function public.calcular_nro_venta()        set search_path = public, pg_temp;
alter function public.actualizar_totales_venta()  set search_path = public, pg_temp;
alter function public.descontar_stock_venta()     set search_path = public, pg_temp;
alter function public.restaurar_stock_venta()     set search_path = public, pg_temp;
alter function public.aumentar_stock_compra()     set search_path = public, pg_temp;
alter function public.revertir_stock_compra()     set search_path = public, pg_temp;
alter function public.set_actualizado_en()        set search_path = public, pg_temp;

-- Verificación: las 7 tienen que aparecer con "search_path=public, pg_temp".
select p.proname as funcion,
       coalesce(array_to_string(p.proconfig, ', '), 'SIN FIJAR') as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1;
