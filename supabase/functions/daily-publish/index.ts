// Supabase Edge Function: daily-publish
// Generates deterministic daily boards at 00:00 UTC.
// Can be triggered by: pg_cron, GitHub Actions, or client-side ensure (first visitor of day).
// Supports ?date=YYYY-MM-DD, ?backfill=7, ?from=YYYY-MM-DD&to=YYYY-MM-DD
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// seeded RNG + board gen (mirrors src/lib/daily.js — must stay in sync)
const FREQ = [0.08167,0.01492,0.02782,0.04253,0.12702,0.02228,0.02015,0.06094,0.06966,0.00153,0.00772,0.04025,0.02406,0.06749,0.07507,0.01929,0.00095,0.05987,0.06327,0.09056,0.02758,0.00978,0.02360,0.00150,0.01974,0.00074]
function mulberry32(seed:number){ return function(){ let t=(seed+=0x6d2b79f5); t=Math.imul(t ^ t>>>15, t|1); t^=t+Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296 } }
function dateToSeed(dateStr:string, boardType:string | number){
  let h=2166136261; const s=boardType==='' ? `${dateStr}` : `${dateStr}:${boardType}`; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)} return h>>>0
}
const DAILY_BOARD_TYPES = [16,20,21,25] as const
function chooseDailyBoardType(dateStr:string){
  const seed=dateToSeed(dateStr,'choose'); const rand=mulberry32(seed); const idx=Math.floor(rand()*DAILY_BOARD_TYPES.length); return DAILY_BOARD_TYPES[idx]
}
function generateSeededBoard(dateStr:string, boardType:number){
  const seed=dateToSeed(dateStr, boardType); const rand=mulberry32(seed)
  const letters='abcdefghijklmnopqrstuvwxyz'; const cumulative:number[]=[]; let sum=0; for(const f of FREQ){ sum+=f; cumulative.push(sum)} const total=cumulative[cumulative.length-1]
  let board=''; for(let i=0;i<boardType;i++){ const r=rand()*total; const idx=cumulative.findIndex(w=>r<=w); board+=letters[idx]} return board
}
function createDailyBoard(dateStr:string){
  const bt=chooseDailyBoardType(dateStr); return { puzzle_date:dateStr, board_type:bt, board_letters:generateSeededBoard(dateStr,bt) }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extraHeaders },
  })
}

function enumerateDates(fromStr: string, toStr: string): string[] {
  const dates: string[] = []
  const from = new Date(fromStr + 'T00:00:00Z')
  const to = new Date(toStr + 'T00:00:00Z')
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return []
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0,10))
  }
  return dates
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)

    // Determine target dates
    let dates: string[] = []
    const dateParam = url.searchParams.get('date')
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')
    const backfillParam = url.searchParams.get('backfill')

    if (fromParam) {
      const to = toParam || new Date().toISOString().slice(0,10)
      dates = enumerateDates(fromParam, to)
      if (dates.length === 0) throw new Error(`Invalid from/to: ${fromParam} -> ${to}`)
      if (dates.length > 90) throw new Error('backfill range too large (max 90 days)')
    } else if (backfillParam) {
      const n = Math.min(Math.max(parseInt(backfillParam, 10) || 1, 1), 90)
      const today = new Date().toISOString().slice(0,10)
      const start = new Date()
      start.setUTCDate(start.getUTCDate() - (n - 1))
      dates = enumerateDates(start.toISOString().slice(0,10), today)
    } else if (dateParam) {
      // validate YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) throw new Error('Invalid date format, expected YYYY-MM-DD')
      dates = [dateParam]
    } else {
      // No param: if POST body contains json with dates, use that, else today
      if (req.method === 'POST') {
        try {
          const body = await req.clone().json()
          if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
            dates = [body.date]
          } else if (body?.from) {
            dates = enumerateDates(body.from, body.to || new Date().toISOString().slice(0,10))
          } else if (body?.backfill) {
            const n = Math.min(Math.max(parseInt(String(body.backfill),10)||1,1),90)
            const today = new Date().toISOString().slice(0,10)
            const start = new Date()
            start.setUTCDate(start.getUTCDate() - (n-1))
            dates = enumerateDates(start.toISOString().slice(0,10), today)
          }
        } catch (_e) { /* not json, fallback to today */ }
      }
      if (dates.length === 0) {
        dates = [new Date().toISOString().slice(0,10)]
      }
    }

    const allRows = dates.map(dateStr => createDailyBoard(dateStr))

    const { data, error } = await supabase.from('daily_puzzles').upsert(allRows, { onConflict: 'puzzle_date,board_type', ignoreDuplicates: false }).select()
    if (error) throw error

    return jsonResponse({ ok: true, dates, count: allRows.length, inserted: data })
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500)
  }
})
