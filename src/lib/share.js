// Share helpers — spoiler-free daily result text
export function formatDailyShareText({ puzzleDate, score, wordsFoundCount, totalPossibleWords, boardName }) {
  if (!puzzleDate) return `Word Hunt — ${score ?? 0} pts — ${wordsFoundCount ?? 0}/${totalPossibleWords ?? '?'} words`
  const [y, m, d] = puzzleDate.split('-')
  const date = `${d}/${m}/${y}`
  const board = boardName ? ` · ${boardName}` : ''
  // Spoiler-free: no words revealed, only counts/score
  return `Word Hunt ${date}${board} — ${score} pts — ${wordsFoundCount}/${totalPossibleWords} words`
}

export async function copyToClipboard(text) {
  if (!text) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fallback */ }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return true
  } catch { return false }
}

export async function shareText(text, title = 'Word Hunt') {
  const payload = { title, text }
  try {
    if (navigator.share && navigator.canShare?.(payload)) {
      await navigator.share(payload)
      return 'shared'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
  }
  const ok = await copyToClipboard(text)
  return ok ? 'copied' : 'failed'
}
