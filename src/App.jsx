import { useState, useEffect, useRef, useCallback } from 'react'

const ls = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

function useSecretClick(cb) {
  const count = useRef(0)
  const timer = useRef(null)
  return () => {
    count.current += 1
    clearTimeout(timer.current)
    if (count.current >= 5) { count.current = 0; cb() }
    else timer.current = setTimeout(() => { count.current = 0 }, 2000)
  }
}

// Theme colors matching the template
const T = {
  bg: '#0f0a08',
  surface: 'rgba(80,30,20,0.25)',
  border: 'rgba(160,80,60,0.25)',
  borderHover: 'rgba(200,100,70,0.5)',
  accent: '#c8704a',
  accentSoft: '#e8a882',
  accentDim: 'rgba(200,112,74,0.15)',
  purple: '#8b6daa',
  purpleSoft: '#b09ac8',
  gold: '#d4a843',
  goldSoft: '#f0c870',
  text: '#f0e8e0',
  textDim: 'rgba(240,232,224,0.45)',
  textFaint: 'rgba(240,232,224,0.22)',
  cardLocked: 'rgba(30,15,10,0.95)',
  tabActive: 'linear-gradient(135deg,#7a3020,#c8704a)',
  btnPrimary: 'linear-gradient(135deg,#7a3020,#c8704a)',
  btnGold: 'linear-gradient(135deg,#8b6914,#d4a843)',
}

// ── Memory Card ───────────────────────────────────────────────────────────────
function MemoryCard({ memory, image, editedTitle, revealed, onClick }) {
  const pct = memory.hoursRequired > 0
    ? Math.min(100, Math.round((memory.hoursTogether / memory.hoursRequired) * 100))
    : 0

  const borderColor = memory.unlocked
    ? revealed ? `rgba(212,168,67,0.6)` : T.borderHover
    : T.border

  const glowColor = memory.unlocked
    ? revealed ? 'rgba(212,168,67,0.2)' : 'rgba(200,112,74,0.15)'
    : 'none'

  return (
    <div
      onClick={() => onClick(memory)}
      style={{
        position: 'relative', borderRadius: '6px', overflow: 'hidden',
        cursor: 'pointer', aspectRatio: '3/4',
        border: `1px solid ${borderColor}`,
        boxShadow: memory.unlocked ? `0 0 18px ${glowColor}` : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        background: T.cardLocked,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: image ? `url(${image})` : `linear-gradient(135deg,#1a0a06,#2d1208)`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: memory.unlocked ? 'none' : 'blur(8px) brightness(0.25)',
        transform: 'scale(1.06)', transition: 'filter 0.5s',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: memory.unlocked
          ? 'linear-gradient(to top,rgba(10,5,3,0.92)0%,rgba(10,5,3,0.05)55%,transparent 100%)'
          : 'linear-gradient(to top,rgba(10,5,3,0.97)0%,rgba(10,5,3,0.8)100%)',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.62rem', padding: '2px 7px', borderRadius: '2px',
            background: memory.unlocked ? (revealed ? 'rgba(212,168,67,0.2)' : T.accentDim) : 'rgba(255,255,255,0.06)',
            color: memory.unlocked ? (revealed ? T.goldSoft : T.accentSoft) : T.textFaint,
            border: `1px solid ${memory.unlocked ? (revealed ? 'rgba(212,168,67,0.4)' : T.borderHover) : 'rgba(255,255,255,0.08)'}`,
            letterSpacing: '0.04em',
          }}>{memory.hoursRequired}h</span>
          <span style={{ fontSize: '13px' }}>
            {memory.unlocked ? (revealed ? '📖' : '✨') : '🔒'}
          </span>
        </div>
        <div>
          {memory.unlocked ? (
            revealed ? (
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '0.82rem', color: '#f5e6c0', lineHeight: 1.35, margin: 0 }}>
                {editedTitle || memory.title}
              </p>
            ) : (
              <div>
                <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '0.75rem', color: T.textDim, margin: '0 0 3px', lineHeight: 1.3 }}>
                  🪙 {memory.hoursRequired} to reveal
                </p>
                <p style={{ fontSize: '0.6rem', color: T.accent, margin: 0, opacity: 0.7 }}>Tap to unlock text</p>
              </div>
            )
          ) : (
            <div>
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.07)', borderRadius: '1px', marginBottom: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,#7a3020,${T.accent})` }} />
              </div>
              <p style={{ fontSize: '0.6rem', color: T.textFaint, margin: 0 }}>
                {pct}% · {memory.hoursTogether}h / {memory.hoursRequired}h
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card Detail Modal ─────────────────────────────────────────────────────────
function CardModal({ memory, image, editedTitle, revealed, coins, onSpend, onClose }) {
  const [spending, setSpending] = useState(false)
  const [spendError, setSpendError] = useState('')
  const [justRevealed, setJustRevealed] = useState(false)

  if (!memory) return null
  const pct = memory.hoursRequired > 0
    ? Math.min(100, Math.round((memory.hoursTogether / memory.hoursRequired) * 100)) : 0
  const canAfford = coins >= memory.hoursRequired

  const handleSpend = async () => {
    setSpending(true); setSpendError('')
    try {
      await onSpend(memory.id, memory.hoursRequired)
      setJustRevealed(true)
    } catch (err) { setSpendError(err.message) }
    finally { setSpending(false) }
  }

  const isRevealed = revealed || justRevealed

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#120a07', border: `1px solid ${isRevealed ? 'rgba(212,168,67,0.35)' : T.borderHover}`, borderRadius: '6px', boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${isRevealed ? 'rgba(212,168,67,0.08)' : 'rgba(200,112,74,0.08)'}`, width: '100%', maxWidth: '360px' }}>
        <div style={{ position: 'relative', height: '180px', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg,#1a0a06,#2d1208)', backgroundSize: 'cover', backgroundPosition: 'center', filter: memory.unlocked ? 'none' : 'blur(10px) brightness(0.2)', transform: 'scale(1.05)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,5,3,0.9)0%,transparent 60%)' }} />
          {!memory.unlocked && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔒</div>
              <p style={{ fontSize: '0.68rem', color: T.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{memory.hoursRequired}h required</p>
            </div>
          )}
          {memory.unlocked && !isRevealed && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>✨</div>
              <p style={{ fontSize: '0.68rem', color: T.accentSoft, letterSpacing: '0.08em' }}>Spend coins to read</p>
            </div>
          )}
        </div>

        <div style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '2px', background: T.accentDim, color: T.accentSoft, border: `1px solid ${T.borderHover}` }}>{memory.course}</span>
            <span style={{ fontSize: '0.68rem', color: T.textDim }}>{memory.hoursRequired}h milestone</span>
          </div>

          {!memory.unlocked && (
            <>
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1.05rem', color: T.textFaint, marginBottom: '12px' }}>???</p>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: T.textDim, marginBottom: '4px' }}>
                  <span>Progress</span><span>{memory.hoursTogether}h / {memory.hoursRequired}h</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,#7a3020,${T.accent})` }} />
                </div>
              </div>
            </>
          )}

          {memory.unlocked && !isRevealed && (
            <div>
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1rem', color: T.textFaint, marginBottom: '14px', textAlign: 'center', letterSpacing: '0.15em' }}>✦ ✦ ✦</p>
              <div style={{ background: 'rgba(200,112,74,0.06)', border: `1px solid ${T.border}`, borderRadius: '4px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: T.textDim }}>Cost to reveal</span>
                  <span style={{ fontSize: '0.9rem', color: T.goldSoft, fontWeight: 500 }}>🪙 {memory.hoursRequired}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: T.textDim }}>Your balance</span>
                  <span style={{ fontSize: '0.9rem', color: canAfford ? '#a8d8a0' : 'rgba(255,120,100,0.8)', fontWeight: 500 }}>🪙 {coins}</span>
                </div>
              </div>
              {spendError && <p style={{ fontSize: '0.7rem', color: 'rgba(255,120,100,0.8)', marginBottom: '8px' }}>{spendError}</p>}
              {!canAfford && <p style={{ fontSize: '0.7rem', color: 'rgba(255,160,100,0.7)', marginBottom: '8px' }}>Need {memory.hoursRequired - coins} more coins 🪙</p>}
              <button onClick={handleSpend} disabled={!canAfford || spending} style={{
                width: '100%', padding: '0.65rem', borderRadius: '2px', border: 'none',
                background: canAfford ? T.btnGold : 'rgba(255,255,255,0.05)',
                color: canAfford ? '#1a0f00' : T.textFaint,
                fontFamily: 'DM Sans,sans-serif', fontSize: '0.72rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: canAfford ? 'pointer' : 'not-allowed', fontWeight: 600,
              }}>
                {spending ? 'Spending…' : `🪙 Spend ${memory.hoursRequired} coins to reveal`}
              </button>
            </div>
          )}

          {memory.unlocked && isRevealed && (
            <>
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1.05rem', color: '#f5e6c0', lineHeight: 1.6, marginBottom: '8px' }}>
                {editedTitle || memory.title}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'rgba(212,168,67,0.5)' }}>📖 Memory revealed</p>
            </>
          )}
        </div>

        <div style={{ padding: '0 1.2rem 1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.accentSoft, fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 1.2rem', borderRadius: '2px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ memories, images, editedTitles, onSave, onClose }) {
  const [selectedId, setSelectedId] = useState(memories[0]?.id || '')
  const [imgUrl, setImgUrl] = useState('')
  const [memTitle, setMemTitle] = useState('')
  const [saved, setSaved] = useState(false)
  const [previewOk, setPreviewOk] = useState(true)

  useEffect(() => {
    if (!selectedId) return
    setImgUrl(images[selectedId] || '')
    setMemTitle(editedTitles[selectedId] || memories.find(m => m.id === selectedId)?.title || '')
    setPreviewOk(true); setSaved(false)
  }, [selectedId])

  const handleSave = () => {
    onSave(selectedId, imgUrl.trim(), memTitle.trim())
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const input = { width: '100%', padding: '8px 10px', background: 'rgba(200,112,74,0.06)', border: `1px solid ${T.border}`, borderRadius: '2px', color: T.text, fontFamily: 'DM Sans,sans-serif', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#120a07', border: `1px solid ${T.borderHover}`, borderRadius: '6px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', width: '100%', maxWidth: '440px' }}>
        <div style={{ padding: '1.2rem', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: T.accentSoft, opacity: 0.6, marginBottom: '2px' }}>⚙ Settings</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontWeight: 300, fontStyle: 'italic', fontSize: '1.5rem', color: T.text, margin: 0 }}>Edit Memories</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, fontSize: '18px' }}>✕</button>
        </div>
        <div style={{ padding: '1.2rem' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textDim, marginBottom: '6px' }}>Select Memory</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ ...input }}>
              {memories.map(m => <option key={m.id} value={m.id} style={{ background: '#1a0a06' }}>[{m.course}] {m.hoursRequired}h — {m.title.substring(0, 38)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textDim, marginBottom: '6px' }}>Memory Text</label>
            <textarea value={memTitle} onChange={e => setMemTitle(e.target.value)} rows={3} style={{ ...input, fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '0.9rem', resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: T.textDim, marginBottom: '6px' }}>Background Image URL</label>
            <input type="text" value={imgUrl} onChange={e => { setImgUrl(e.target.value); setPreviewOk(true) }} placeholder="https://i.imgur.com/..." style={{ ...input }} />
            {imgUrl && previewOk && <div style={{ marginTop: '8px', height: '70px', borderRadius: '3px', overflow: 'hidden' }}><img src={imgUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPreviewOk(false)} /></div>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.accentSoft, fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.55rem 1.2rem', borderRadius: '2px', cursor: 'pointer' }}>Close</button>
            <button onClick={handleSave} style={{ background: saved ? 'linear-gradient(135deg,#2a6a40,#4a9a60)' : T.btnPrimary, border: 'none', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.55rem 1.2rem', borderRadius: '2px', cursor: 'pointer', transition: 'background 0.3s' }}>
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,80,60,0.15)', paddingTop: '14px' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,100,80,0.4)', marginBottom: '8px' }}>⚠ Danger Zone</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.7rem', color: T.textDim, margin: 0 }}>Reset all revealed memories & cached data</p>
              <button onClick={() => { if (window.confirm('Reset all local data? This clears revealed memories, images and custom texts.')) { localStorage.removeItem('mg_revealed'); localStorage.removeItem('mg_images'); localStorage.removeItem('mg_titles'); window.location.reload(); } }} style={{ background: 'rgba(255,80,60,0.1)', border: '1px solid rgba(255,80,60,0.3)', color: 'rgba(255,120,100,0.8)', fontFamily: 'DM Sans,sans-serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.45rem 1rem', borderRadius: '2px', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '12px' }}>Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCourse, setActiveCourse] = useState('All')
  const [selected, setSelected] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [images, setImages] = useState(() => ls.get('mg_images', {}))
  const [editedTitles, setEditedTitles] = useState(() => ls.get('mg_titles', {}))
  const [revealed, setRevealed] = useState(() => ls.get('mg_revealed', {}))
  const [coins, setCoins] = useState(null)
  const [coinsLoading, setCoinsLoading] = useState(true)

  const handleSecretClick = useSecretClick(() => setShowSettings(true))

  const fetchMemories = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/memories')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMemories(data.memories || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  const fetchCoins = useCallback(async () => {
    setCoinsLoading(true)
    try {
      const res = await fetch('/api/get-coins')
      const data = await res.json()
      setCoins(data.availableCoins ?? 0)
    } catch { setCoins(0) }
    finally { setCoinsLoading(false) }
  }, [])

  useEffect(() => { fetchMemories(); fetchCoins() }, [])

  const handleSpend = async (memoryId, coinCost) => {
    if (coins < coinCost) throw new Error('Not enough coins')
    const res = await fetch('/api/spend-coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coinCost }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || 'Failed')
    const newRevealed = { ...revealed, [memoryId]: true }
    setRevealed(newRevealed); ls.set('mg_revealed', newRevealed)
    setCoins(prev => Math.max(0, prev - coinCost))
  }

  const saveMemory = (id, imgUrl, title) => {
    const newImgs = { ...images, [id]: imgUrl }
    const newTitles = { ...editedTitles, [id]: title }
    setImages(newImgs); ls.set('mg_images', newImgs)
    setEditedTitles(newTitles); ls.set('mg_titles', newTitles)
  }

  const courses = ['All', ...new Set(memories.map(m => m.course).filter(Boolean))]
  const filtered = activeCourse === 'All' ? memories : memories.filter(m => m.course === activeCourse)
  const totalUnlocked = memories.filter(m => m.unlocked).length
  const totalRevealed = memories.filter(m => revealed[m.id]).length

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '1.5rem' }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        body { margin:0; font-family:'DM Sans',sans-serif; color:${T.text}; }
        select option { background:#1a0a06; color:${T.text}; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(200,112,74,0.3);border-radius:2px}
      `}</style>

      {selected && <CardModal memory={selected} image={images[selected.id]} editedTitle={editedTitles[selected.id]} revealed={!!revealed[selected.id]} coins={coins ?? 0} onSpend={handleSpend} onClose={() => setSelected(null)} />}
      {showSettings && memories.length > 0 && <SettingsPanel memories={memories} images={images} editedTitles={editedTitles} onSave={saveMemory} onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: T.accentSoft, opacity: 0.6, marginBottom: '2px' }}>✦ Memory Collection ✦</p>
            <h1 onClick={handleSecretClick} style={{ fontFamily: 'Cormorant Garamond,serif', fontWeight: 300, fontStyle: 'italic', fontSize: '2rem', color: T.text, margin: 0, cursor: 'default', userSelect: 'none' }}>Memories</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: '20px', padding: '4px 12px' }}>
              <span style={{ fontSize: '14px' }}>🪙</span>
              <span style={{ fontSize: '0.85rem', color: T.goldSoft, fontWeight: 500 }}>{coinsLoading ? '…' : coins}</span>
            </div>
            {!loading && !error && (
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textFaint, margin: 0 }}>
                {totalUnlocked} unlocked · {totalRevealed} revealed
              </p>
            )}
          </div>
        </div>
        <div style={{ height: '1px', background: `linear-gradient(90deg,${T.accent},transparent)` }} />
      </div>

      {/* Course tabs */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {courses.map(c => (
            <button key={c} onClick={() => setActiveCourse(c)} style={{
              padding: '4px 14px', borderRadius: '2px', fontSize: '0.66rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'DM Sans,sans-serif', transition: 'all 0.15s', border: 'none',
              background: activeCourse === c ? T.tabActive : 'rgba(200,112,74,0.06)',
              color: activeCourse === c ? '#fff' : T.textDim,
              outline: activeCourse === c ? 'none' : `1px solid ${T.border}`,
            }}>{c}</button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '14px' }}>
          <div style={{ width: '28px', height: '28px', border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: T.textFaint }}>Loading memories…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,120,100,0.9)', marginBottom: '6px' }}>Failed to load</p>
          <p style={{ fontSize: '0.72rem', color: T.textDim, marginBottom: '14px' }}>{error}</p>
          <button onClick={fetchMemories} style={{ background: T.btnPrimary, border: 'none', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.55rem 1.4rem', borderRadius: '2px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1.3rem', color: T.textFaint, marginBottom: '6px' }}>No memories yet</p>
            <p style={{ fontSize: '0.7rem', color: T.textFaint }}>Keep studying to unlock memories ✨</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '14px', animation: 'fadeIn 0.4s ease' }}>
            {filtered.map(m => (
              <MemoryCard key={m.id} memory={m} image={images[m.id]} editedTitle={editedTitles[m.id]} revealed={!!revealed[m.id]} onClick={setSelected} />
            ))}
          </div>
        )
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.6rem', color: `${T.accent}22`, letterSpacing: '0.15em' }}>✦ ✦ ✦</p>
      </div>
    </div>
  )
}
