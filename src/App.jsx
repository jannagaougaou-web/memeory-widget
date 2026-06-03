import { useState, useEffect, useRef, useCallback } from 'react'

// ── Storage helpers ───────────────────────────────────────────────────────────
const ls = {
  get: (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback } catch { return fallback } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

const DEFAULT_COURSES = ['Biology','Physics','English','Math','Sport','French','Philosophy','Chemistry','Integrative Science']

// ── Secret settings trigger: click logo 5 times ───────────────────────────────
function useSecretClick(onActivate) {
  const count = useRef(0)
  const timer = useRef(null)
  return () => {
    count.current += 1
    clearTimeout(timer.current)
    if (count.current >= 5) { count.current = 0; onActivate() }
    else { timer.current = setTimeout(() => { count.current = 0 }, 2000) }
  }
}

// ── Memory Card ───────────────────────────────────────────────────────────────
function MemoryCard({ memory, image, customText, onClick }) {
  const isUnlocked = memory.unlocked
  const pct = memory.hoursRequired > 0
    ? Math.min(100, Math.round((memory.hoursTogether / memory.hoursRequired) * 100))
    : 0

  return (
    <div
      className={`memory-card ${isUnlocked ? 'unlocked' : ''}`}
      onClick={() => onClick(memory)}
      title={isUnlocked ? memory.title : `Locked — ${memory.hoursRequired}h required`}
    >
      {/* Background image or gradient */}
      <div className="absolute inset-0" style={{
        backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, #1a0b2e, #2d1060)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: isUnlocked ? 'none' : 'blur(8px) brightness(0.35)',
        transform: 'scale(1.05)',
        transition: 'filter 0.5s ease',
      }} />

      {/* Overlay */}
      <div className="absolute inset-0" style={{
        background: isUnlocked
          ? 'linear-gradient(to top, rgba(10,8,20,0.85) 0%, rgba(10,8,20,0.2) 50%, transparent 100%)'
          : 'linear-gradient(to top, rgba(10,8,20,0.95) 0%, rgba(10,8,20,0.7) 100%)',
      }} />

      {/* Unlocked glow border */}
      {isUnlocked && (
        <div className="absolute inset-0 rounded pointer-events-none" style={{
          boxShadow: 'inset 0 0 0 1px rgba(155,109,255,0.4)',
        }} />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        {/* Top — hours badge */}
        <div className="flex justify-between items-start">
          <span className="text-xs px-2 py-0.5 rounded-sm" style={{
            background: isUnlocked ? 'rgba(155,109,255,0.3)' : 'rgba(255,255,255,0.08)',
            color: isUnlocked ? '#c4a4ff' : 'rgba(255,255,255,0.4)',
            border: `1px solid ${isUnlocked ? 'rgba(155,109,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
          }}>
            {memory.hoursRequired}h
          </span>

          {isUnlocked ? (
            <span style={{ fontSize: '14px' }}>✨</span>
          ) : (
            <span style={{ fontSize: '14px', opacity: 0.5 }}>🔒</span>
          )}
        </div>

        {/* Bottom — title or locked info */}
        <div>
          {isUnlocked ? (
            <p className="font-display italic text-sm leading-tight" style={{ color: '#e8dff5' }}>
              {customText || memory.title}
            </p>
          ) : (
            <div>
              {/* Progress bar */}
              <div className="mb-1.5" style={{
                height: '2px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '1px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6b3fa0, #9b6dff)',
                  borderRadius: '1px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
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
function CardModal({ memory, image, customText, onClose }) {
  if (!memory) return null
  const isUnlocked = memory.unlocked

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box max-w-sm">
        {/* Image */}
        <div className="relative overflow-hidden" style={{ height: '200px', borderRadius: '4px 4px 0 0' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, #1a0b2e, #2d1060)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: isUnlocked ? 'none' : 'blur(10px) brightness(0.3)',
            transform: 'scale(1.05)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,8,20,0.8) 0%, transparent 60%)',
          }} />
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {memory.hoursRequired}h required
                </p>
              </div>
            </div>
          )}
          {isUnlocked && (
            <div className="absolute bottom-3 left-4">
              <span style={{ fontSize: '18px' }}>✨</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-sm" style={{
              background: 'rgba(155,109,255,0.15)',
              color: 'var(--purple-soft)',
              border: '1px solid rgba(155,109,255,0.3)',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
            }}>
              {memory.course}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{memory.hoursRequired}h milestone</span>
          </div>

          {isUnlocked ? (
            <>
              <p className="font-display italic text-lg leading-snug mb-2" style={{ color: 'var(--text)' }}>
                {customText || memory.title}
              </p>
              <p className="text-xs" style={{ color: 'rgba(155,109,255,0.7)' }}>Memory unlocked ✨</p>
            </>
          ) : (
            <>
              <p className="font-display italic text-lg mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                ???
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
                  <span>Progress</span>
                  <span>{memory.hoursTogether}h / {memory.hoursRequired}h</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.round((memory.hoursTogether/memory.hoursRequired)*100))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6b3fa0, #9b6dff)',
                  }} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="btn-s">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ memories, images, customTexts, courses, onSaveImage, onSaveText, onSaveCourses, onClose }) {
  const [tab, setTab] = useState('courses')
  const [courseList, setCourseList] = useState([...courses])
  const [newCourse, setNewCourse] = useState('')
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [selectedMemoryId, setSelectedMemoryId] = useState(memories[0]?.id || '')
  const [imgUrl, setImgUrl] = useState('')
  const [memText, setMemText] = useState('')

  const selectedMemory = memories.find(m => m.id === selectedMemoryId)

  useEffect(() => {
    if (selectedMemoryId) {
      setImgUrl(images[selectedMemoryId] || '')
      setMemText(customTexts[selectedMemoryId] || '')
    }
  }, [selectedMemoryId])

  const addCourse = () => {
    const t = newCourse.trim()
    if (!t || courseList.includes(t)) return
    setCourseList([...courseList, t])
    setNewCourse('')
  }

  const removeCourse = i => setCourseList(courseList.filter((_, idx) => idx !== i))

  const startEdit = i => { setEditIdx(i); setEditVal(courseList[i]) }
  const confirmEdit = () => {
    if (!editVal.trim()) return
    const u = [...courseList]; u[editIdx] = editVal.trim()
    setCourseList(u); setEditIdx(null)
  }

  const saveMemorySettings = () => {
    onSaveImage(selectedMemoryId, imgUrl.trim())
    onSaveText(selectedMemoryId, memText.trim())
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(155,109,255,0.15)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-widest uppercase mb-0.5" style={{ color: 'var(--purple-soft)', opacity: 0.7 }}>⚙ Settings</p>
              <h2 className="font-display text-2xl font-light italic" style={{ color: 'var(--text)' }}>Gallery Config</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '18px' }}>✕</button>
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            {['courses','memories'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="text-xs px-3 py-1 rounded-sm transition-all capitalize"
                style={{
                  background: tab === t ? 'rgba(155,109,255,0.2)' : 'transparent',
                  border: `1px solid ${tab === t ? 'rgba(155,109,255,0.5)' : 'var(--border)'}`,
                  color: tab === t ? 'var(--purple-soft)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Tab: Courses */}
        {tab === 'courses' && (
          <div className="px-5 py-4">
            <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>Add, rename or remove course tabs.</p>
            <div className="max-h-52 overflow-y-auto mb-3">
              {courseList.map((c, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 group">
                  {editIdx === i ? (
                    <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') confirmEdit(); if(e.key==='Escape') setEditIdx(null) }}
                      className="field-input flex-1" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} />
                  ) : (
                    <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{c}</span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editIdx === i
                      ? <button onClick={confirmEdit} style={{ background: 'rgba(155,109,255,0.2)', color: 'var(--purple-soft)', border: 'none', cursor: 'pointer', borderRadius: '2px', padding: '2px 6px', fontSize: '11px' }}>✓</button>
                      : <button onClick={() => startEdit(i)} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', borderRadius: '2px', padding: '2px 6px', fontSize: '11px' }}>edit</button>
                    }
                    <button onClick={() => removeCourse(i)} style={{ background: 'rgba(180,60,100,0.15)', color: 'rgba(255,140,170,0.7)', border: 'none', cursor: 'pointer', borderRadius: '2px', padding: '2px 6px', fontSize: '11px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCourse} onChange={e => setNewCourse(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') addCourse() }}
                placeholder="New course name..." className="field-input flex-1" />
              <button onClick={addCourse} className="btn-p" style={{ padding: '0.55rem 1rem' }}>Add</button>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="btn-s">Cancel</button>
              <button onClick={() => { onSaveCourses(courseList); onClose() }} className="btn-p">Save</button>
            </div>
          </div>
        )}

        {/* Tab: Memories */}
        {tab === 'memories' && (
          <div className="px-5 py-4">
            <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>Set a background image and custom text for each memory.</p>

            {/* Memory selector */}
            <div className="mb-3">
              <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-dim)' }}>Select Memory</label>
              <select value={selectedMemoryId} onChange={e => setSelectedMemoryId(e.target.value)} className="field-input">
                {memories.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.course}] {m.hoursRequired}h — {m.title.substring(0, 35)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Image URL */}
            <div className="mb-3">
              <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-dim)' }}>Background Image URL</label>
              <input value={imgUrl} onChange={e => setImgUrl(e.target.value)}
                placeholder="https://i.imgur.com/..." className="field-input" />
              {imgUrl && (
                <div className="mt-2 rounded overflow-hidden" style={{ height: '60px' }}>
                  <img src={imgUrl} alt="preview" className="w-full h-full object-cover"
                    onError={e => e.target.style.display='none'} />
                </div>
              )}
            </div>

            {/* Custom text */}
            <div className="mb-4">
              <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-dim)' }}>Custom Memory Text <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <textarea value={memText} onChange={e => setMemText(e.target.value)}
                placeholder="Leave empty to use Notion text..."
                rows={3} className="field-input" style={{ resize: 'vertical' }} />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-s">Cancel</button>
              <button onClick={saveMemorySettings} className="btn-p">Save Memory</button>
            </div>
          </div>
        )}
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
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // Persistent state
  const [courses, setCourses] = useState(() => ls.get('mg_courses', DEFAULT_COURSES))
  const [images, setImages] = useState(() => ls.get('mg_images', {}))
  const [customTexts, setCustomTexts] = useState(() => ls.get('mg_texts', {}))

  // Secret click on title
  const handleSecretClick = useSecretClick(() => setShowSettings(true))

  // Fetch memories from Notion
  const fetchMemories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/memories')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMemories(data.memories)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMemories() }, [fetchMemories])

  // Derived course list from Notion data + user custom courses
  const notionCourses = [...new Set(memories.map(m => m.course).filter(Boolean))]
  const allTabs = ['All', ...courses.filter(c => notionCourses.includes(c) || courses.includes(c))]
  const uniqueTabs = ['All', ...new Set([...courses.filter(c => notionCourses.includes(c))])]

  const filtered = activeCourse === 'All'
    ? memories
    : memories.filter(m => m.course === activeCourse)

  const saveImage = (id, url) => {
    const updated = { ...images, [id]: url }
    setImages(updated)
    ls.set('mg_images', updated)
  }

  const saveText = (id, text) => {
    const updated = { ...customTexts, [id]: text }
    setCustomTexts(updated)
    ls.set('mg_texts', updated)
  }

  const saveCourses = (list) => {
    setCourses(list)
    ls.set('mg_courses', list)
    if (activeCourse !== 'All' && !list.includes(activeCourse)) setActiveCourse('All')
  }

  // Stats
  const totalUnlocked = memories.filter(m => m.unlocked).length
  const total = memories.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1.5rem' }}>

      {/* Modals */}
      {selectedMemory && (
        <CardModal
          memory={selectedMemory}
          image={images[selectedMemory.id]}
          customText={customTexts[selectedMemory.id]}
          onClose={() => setSelectedMemory(null)}
        />
      )}
      {showSettings && memories.length > 0 && (
        <SettingsPanel
          memories={memories}
          images={images}
          customTexts={customTexts}
          courses={courses}
          onSaveImage={saveImage}
          onSaveText={saveText}
          onSaveCourses={saveCourses}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--purple-soft)', opacity: 0.6 }}>
              ✦ Memory Collection ✦
            </p>
            <h1
              className="font-display text-3xl font-light italic cursor-default select-none"
              style={{ color: 'var(--text)' }}
              onClick={handleSecretClick}
              title=""
            >
              Memories
            </h1>
          </div>
          {/* Stats */}
          {!loading && !error && (
            <div className="text-right">
              <p className="font-display italic text-2xl" style={{ color: 'var(--purple-soft)' }}>
                {totalUnlocked}<span className="text-sm" style={{ color: 'var(--text-dim)' }}>/{total}</span>
              </p>
              <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>Unlocked</p>
            </div>
          )}
        </div>
        <div className="h-px" style={{ background: 'linear-gradient(90deg, var(--purple), transparent)' }} />
      </div>

      {/* Course tabs */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap mb-5">
          {['All', ...new Set(memories.map(m => m.course).filter(Boolean).filter(c => courses.includes(c) || true))].map(c => (
            <button key={c} onClick={() => setActiveCourse(c)}
              className={`course-tab ${activeCourse === c ? 'active' : ''}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="spinner" />
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>Loading memories…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-sm mb-2" style={{ color: 'rgba(255,120,150,0.9)' }}>Failed to load memories</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>{error}</p>
          <button onClick={fetchMemories} className="btn-p">Retry</button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-display italic text-xl mb-2" style={{ color: 'var(--text-dim)' }}>No memories yet</p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Keep studying to unlock memories ✨</p>
            </div>
          ) : (
            <div className="grid gap-4 fade-in" style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            }}>
              {filtered.map(m => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  image={images[m.id]}
                  customText={customTexts[m.id]}
                  onClick={setSelectedMemory}
                />
              ))}
            </div>
          )}

          {/* Footer hint */}
          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: 'rgba(155,109,255,0.2)', letterSpacing: '0.1em' }}>
              ✦ ✦ ✦
            </p>
          </div>
        </>
      )}
    </div>
  )
}
