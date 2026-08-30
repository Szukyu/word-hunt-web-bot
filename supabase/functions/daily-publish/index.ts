// Supabase Edge Function: daily-publish
// Deploys as cron at 00:00 UTC to generate deterministic daily boards.
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// seeded RNG + board gen (mirrors src/lib/daily.js)
const FREQ = [0.08167,0.01492,0.02782,0.04253,0.12702,0.02228,0.02015,0.06094,0.06966,0.00153,0.00772,0.04025,0.02406,0.06749,0.07507,0.01929,0.00095,0.05987,0.06327,0.09056,0.02758,0.00978,0.02360,0.00150,0.01974,0.00074]
function mulberry32(seed:number){ return function(){ let t=(seed+=0x6d2b79f5); t=Math.imul(t ^ t>>>15, t|1); t^=t+Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296 } }
function dateToSeed(dateStr:string, boardType:number){
  let h=2166136261; const s=`${dateStr}:${boardType}`; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)} return h>>>0
}
function generateSeededBoard(dateStr:string, boardType:number){
  const seed=dateToSeed(dateStr, boardType); const rand=mulberry32(seed)
  const letters='abcdefghijklmnopqrstuvwxyz'; const cumulative:number[]=[]; let sum=0; for(const f of FREQ){ sum+=f; cumulative.push(sum)} const total=cumulative[cumulative.length-1]
  let board=''; for(let i=0;i<boardType;i++){ const r=rand()*total; const idx=cumulative.findIndex(w=>r<=w); board+=letters[idx]} return board
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // allow ?date=YYYY-MM-DD override, else today UTC
    const url = new URL(req.url)
    const dateStr = url.searchParams.get('date') || new Date().toISOString().slice(0,10)
    const boardTypes = [16,20,21,25]

    const rows = boardTypes.map(bt => ({
      puzzle_date: dateStr,
      board_type: bt,
      board_letters: generateSeededBoard(dateStr, bt),
    }))

    const { data, error } = await supabase.from('daily_puzzles').upsert(rows, { onConflict: 'puzzle_date,board_type', ignoreDuplicates: false }).select()
    if (error) throw error

    return new Response(JSON.stringify({ ok: true, date: dateStr, inserted: data }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
