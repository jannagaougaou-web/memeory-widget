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

// ── Memory Card ───────────────────────────────────────────────────────────────
function MemoryCard({ memory, image, editedTitle, revealed, onClick }) {
  const pct = memory.hoursRequired > 0
    ? Math.min(100, Math.round((memory.hoursTogether / memory.hoursRequired) * 100))
    : 0

  return (
    <div
      onClick={() => onClick(memory)}
      style={{
        position: 'relative', borderRadius: '6px', overflow: 'hidden',
        cursor: 'pointer', aspectRatio: '3/4',
        border: memory.unlocked
          ? revealed ? '1px solid rgba(255,200,100,0.5)' : '1px solid rgba(155,109,255,0.5)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: memory.unlocked
          ? revealed ? '0 0 20px rgba(255,200,100,0.15)' : '0 0 20px rgba(155,109,255,0.15)'
          : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg,#1a0b2e,#2d1060)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: memory.unlocked ? 'none' : 'blur(8px) brightness(0.3)',
        transform: 'scale(1.06)', transition: 'filter 0.5s',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: memory.unlocked
          ? 'linear-gradient(to top,rgba(10,8,20,0.92)0%,rgba(10,8,20,0.05)55%,transparent 100%)'
          : 'linear-gradient(to top,rgba(10,8,20,0.97)0%,rgba(10,8,20,0.75)100%)',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.62rem', padding: '2px 7px', borderRadius: '2px',
            background: memory.unlocked ? (revealed ? 'rgba(255,200,100,0.2)' : 'rgba(155,109,255,0.3)') : 'rgba(255,255,255,0.07)',
            color: memory.unlocked ? (revealed ? '#ffd580' : '#c4a4ff') : 'rgba(255,255,255,0.3)',
            border: `1px solid ${memory.unlocked ? (revealed ? 'rgba(255,200,100,0.4)' : 'rgba(155,109,255,0.5)') : 'rgba(255,255,255,0.1)'}`,
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
                <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(232,223,245,0.4)', margin: '0 0 4px', lineHeight: 1.3 }}>
                  🪙 {memory.hoursRequired} to reveal
                </p>
                <p style={{ fontSize: '0.6rem', color: 'rgba(155,109,255,0.6)', margin: 0 }}>Click to unlock text</p>
              </div>
            )
          ) : (
            <div>
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', marginBottom: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#6b3fa0,#9b6dff)' }} />
              </div>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.28)', margin: 0 }}>
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

  if (!memory) return null

  const pct = memory.hoursRequired > 0
    ? Math.min(100, Math.round((memory.hoursTogether / memory.hoursRequired) * 100))
    : 0

  const canAfford = coins >= memory.hoursRequired

  const handleSpend = async () => {
    setSpending(true)
    setSpendError('')
    try {
      await onSpend(memory.id, memory.hoursRequired)
    } catch (err) {
      setSpendError(err.message)
    } finally {
      setSpending(false)
    }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#0f0c1a', border: `1px solid ${revealed ? 'rgba(255,200,100,0.3)' : 'rgba(155,109,255,0.3)'}`, borderRadius: '6px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', width: '100%', maxWidth: '360px' }}>

        {/* Image */}
        <div style={{ position: 'relative', height: '180px', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg,#1a0b2e,#2d1060)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: memory.unlocked ? 'none' : 'blur(10px) brightness(0.2)',
            transform: 'scale(1.05)',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,8,20,0.85)0%,transparent 60%)' }} />
          {!memory.unlocked && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔒</div>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{memory.hoursRequired}h required</p>
            </div>
          )}
          {memory.unlocked && !revealed && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>✨</div>
              <p style={{ fontSize: '0.68rem', color: 'rgba(196,164,255,0.7)', letterSpacing: '0.1em' }}>Unlocked! Spend coins to read</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '2px', background: 'rgba(155,109,255,0.15)', color: '#c4a4ff', border: '1px solid rgba(155,109,255,0.3)' }}>
              {memory.course}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'rgba(232,223,245,0.35)' }}>{memory.hoursRequired}h milestone</span>
          </div>

          {!memory.unlocked && (
            <>
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(255,255,255,0.15)', marginBottom: '12px' }}>???</p>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(232,223,245,0.35)', marginBottom: '4px' }}>
                  <span>Progress</span><span>{memory.hoursTogether}h / {memory.hoursRequired}h</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#6b3fa0,#9b6dff)' }} />
                </div>
              </div>
            </>
          )}

          {memory.unlocked && !revealed && (
            <div>
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1rem', color: 'rgba(232,223,245,0.25)', marginBottom: '14px', letterSpacing: '0.1em' }}>
                ✦ ✦ ✦ hidden ✦ ✦ ✦
              </p>
              <div style={{ background: 'rgba(155,109,255,0.06)', border: '1px solid rgba(155,109,255,0.15)', borderRadius: '4px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(232,223,245,0.5)' }}>Cost to reveal</span>
                  <span style={{ fontSize: '0.9rem', color: '#ffd580', fontWeight: 500 }}>🪙 {memory.hoursRequired}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(232,223,245,0.5)' }}>Your balance</span>
                  <span style={{ fontSize: '0.9rem', color: canAfford ? '#a8e6a3' : 'rgba(255,120,120,0.8)', fontWeight: 500 }}>🪙 {coins}</span>
                </div>
              </div>
              {spendError && <p style={{ fontSize: '0.7rem', color: 'rgba(255,120,150,0.8)', marginBottom: '8px' }}>{spendError}</p>}
              {!canAfford && (
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,150,100,0.7)', marginBottom: '8px' }}>
                  Not enough coins — you need {memory.hoursRequired - coins} more 🪙
                </p>
              )}
              <button
                onClick={handleSpend}
                disabled={!canAfford || spending}
                style={{
                  width: '100%', padding: '0.65rem', borderRadius: '2px', border: 'none',
                  background: canAfford ? 'linear-gradient(135deg,#8b6914,#ffd580)' : 'rgba(255,255,255,0.06)',
                  color: canAfford ? '#1a0f00' : 'rgba(255,255,255,0.2)',
                  fontFamily: 'DM Sans,sans-serif', fontSize: '0.72rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: canAfford ? 'pointer' : 'not-allowed',
                  fontWeight: 600, transition: 'all 0.2s',
                }}
              >
                {spending ? 'Spending…' : `🪙 Spend ${memory.hoursRequired} coins to reveal`}
              </button>
            </div>
          )}

          {memory.unlocked && revealed && (
            <>
              <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1.05rem', color: '#f5e6c0', lineHeight: 1.6, marginBottom: '8px' }}>
                {editedTitle || memory.title}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,200,100,0.5)' }}>📖 Memory revealed</p>
            </>
          )}
        </div>

        <div style={{ padding: '0 1.2rem 1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(155,109,255,0.25)', color: '#c4a4ff', fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 1.2rem', borderRadius: '2px', cursor: 'pointer' }}>
            Close
          </button>
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
    setPreviewOk(true)
    setSaved(false)
  }, [selectedId])

  const handleSave = () => {
    onSave(selectedId, imgUrl.trim(), memTitle.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#0f0c1a', border: '1px solid rgba(155,109,255,0.3)', borderRadius: '6px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', width: '100%', maxWidth: '440px' }}>
        <div style={{ padding: '1.2rem 1.2rem 0.8rem', borderBottom: '1px solid rgba(155,109,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(196,164,255,0.55)', marginBottom: '2px' }}>⚙ Settings</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontWeight: 300, fontStyle: 'italic', fontSize: '1.5rem', color: '#e8dff5', margin: 0 }}>Edit Memories</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,223,245,0.35)', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ padding: '1.2rem' }}>
          <p style={{ fontSize: '0.72rem', color: 'rgba(232,223,245,0.38)', marginBottom: '14px', lineHeight: 1.6 }}>
            Select a memory to set its background image and edit the displayed text.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(232,223,245,0.38)', marginBottom: '6px' }}>Select Memory</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(155,109,255,0.2)', borderRadius: '2px', color: '#e8dff5', fontFamily: 'DM Sans,sans-serif', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}>
              {memories.map(m => (
                <option key={m.id} value={m.id} style={{ background: '#1a1428' }}>
                  [{m.course}] {m.hoursRequired}h — {m.title.substring(0, 38)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(232,223,245,0.38)', marginBottom: '6px' }}>Memory Text</label>
            <textarea value={memTitle} onChange={e => setMemTitle(e.target.value)} rows={3}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(155,109,255,0.2)', borderRadius: '2px', color: '#e8dff5', fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }} />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(232,223,245,0.38)', marginBottom: '6px' }}>Background Image URL</label>
            <input type="text" value={imgUrl} onChange={e => { setImgUrl(e.target.value); setPreviewOk(true) }} placeholder="https://i.imgur.com/..."
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(155,109,255,0.2)', borderRadius: '2px', color: '#e8dff5', fontFamily: 'DM Sans,sans-serif', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }} />
            {imgUrl && previewOk && (
              <div style={{ marginTop: '8px', height: '70px', borderRadius: '3px', overflow: 'hidden' }}>
                <img src={imgUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPreviewOk(false)} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(155,109,255,0.2)', color: '#c4a4ff', fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.55rem 1.2rem', borderRadius: '2px', cursor: 'pointer' }}>Close</button>
            <button onClick={handleSave} style={{ background: saved ? 'linear-gradient(135deg,#3a7a50,#5ab070)' : 'linear-gradient(135deg,#6b3fa0,#9b6dff)', border: 'none', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.55rem 1.2rem', borderRadius: '2px', cursor: 'pointer', transition: 'background 0.3s' }}>
              {saved ? 'Saved ✓' : 'Save'}
            </button>
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
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to spend coins')
    // Update local state
    const newRevealed = { ...revealed, [memoryId]: true }
    setRevealed(newRevealed)
    ls.set('mg_revealed', newRevealed)
    setCoins(prev => prev - coinCost)
    // Update selected memory to show revealed state
    setSelected(prev => prev ? { ...prev } : null)
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
    <div style={{ minHeight: '100vh', background: '#0a0812', padding: '1.5rem' }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        body { margin:0; font-family:'DM Sans',sans-serif; color:#e8dff5; }
        select option { background:#1a1428; color:#e8dff5; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#3d2270;border-radius:2px}
      `}</style>

      {selected && (
        <CardModal
          memory={selected}
          image={images[selected.id]}
          editedTitle={editedTitles[selected.id]}
          revealed={!!revealed[selected.id]}
          coins={coins ?? 0}
          onSpend={handleSpend}
          onClose={() => setSelected(null)}
        />
      )}

      {showSettings && memories.length > 0 && (
        <SettingsPanel
          memories={memories}
          images={images}
          editedTitles={editedTitles}
          onSave={saveMemory}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <p style={{ fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,164,255,0.5)', marginBottom: '2px' }}>✦ Memory Collection ✦</p>
            <h1 onClick={handleSecretClick} style={{ fontFamily: 'Cormorant Garamond,serif', fontWeight: 300, fontStyle: 'italic', fontSize: '2rem', color: '#e8dff5', margin: 0, cursor: 'default', userSelect: 'none' }}>
              Memories
            </h1>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            {/* Coin balance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,200,100,0.08)', border: '1px solid rgba(255,200,100,0.2)', borderRadius: '20px', padding: '4px 12px' }}>
              <span style={{ fontSize: '14px' }}>🪙</span>
              <span style={{ fontSize: '0.85rem', color: '#ffd580', fontWeight: 500 }}>
                {coinsLoading ? '…' : coins}
              </span>
            </div>
            {/* Stats */}
            {!loading && !error && (
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,223,245,0.3)', margin: 0 }}>
                {totalUnlocked} unlocked · {totalRevealed} revealed
              </p>
            )}
          </div>
        </div>
        <div style={{ height: '1px', background: 'linear-gradient(90deg,rgba(155,109,255,0.6),transparent)' }} />
      </div>

      {/* Course tabs */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {courses.map(c => (
            <button key={c} onClick={() => setActiveCourse(c)} style={{
              padding: '4px 14px', borderRadius: '2px', fontSize: '0.66rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'DM Sans,sans-serif', transition: 'all 0.15s', border: 'none',
              background: activeCourse === c ? 'linear-gradient(135deg,#6b3fa0,#9b6dff)' : 'rgba(255,255,255,0.04)',
              color: activeCourse === c ? '#fff' : 'rgba(232,223,245,0.4)',
              outline: activeCourse === c ? 'none' : '1px solid rgba(155,109,255,0.15)',
            }}>{c}</button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '14px' }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid rgba(155,109,255,0.15)', borderTopColor: '#9b6dff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(232,223,245,0.25)' }}>Loading memories…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,120,150,0.9)', marginBottom: '6px' }}>Failed to load</p>
          <p style={{ fontSize: '0.72rem', color: 'rgba(232,223,245,0.3)', marginBottom: '14px' }}>{error}</p>
          <button onClick={fetchMemories} style={{ background: 'linear-gradient(135deg,#6b3fa0,#9b6dff)', border: 'none', color: '#fff', fontFamily: 'DM Sans,sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.55rem 1.4rem', borderRadius: '2px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ fontFamily: 'Cormorant Garamond,serif', fontStyle: 'italic', fontSize: '1.3rem', color: 'rgba(232,223,245,0.25)', marginBottom: '6px' }}>No memories yet</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(232,223,245,0.18)' }}>Keep studying to unlock memories ✨</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '14px', animation: 'fadeIn 0.4s ease' }}>
            {filtered.map(m => (
              <MemoryCard
                key={m.id}
                memory={m}
                image={images[m.id]}
                editedTitle={editedTitles[m.id]}
                revealed={!!revealed[m.id]}
                onClick={setSelected}
              />
            ))}
          </div>
        )
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.6rem', color: 'rgba(155,109,255,0.12)', letterSpacing: '0.15em' }}>✦ ✦ ✦</p>
      </div>
    </div>
  )
}
