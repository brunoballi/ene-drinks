import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Endpoint de keep-alive: lo llama un Vercel Cron diario (ver vercel.json)
// para que Supabase no pause el proyecto por inactividad.
export async function GET() {
  const sb = createClient()
  const { error } = await sb.from('categorias').select('id').limit(1)
  return NextResponse.json({ ok: !error, timestamp: new Date().toISOString() })
}
