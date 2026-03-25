'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const TOTAL_MODULES = 8

interface QuizState {
  selected: string | null
  revealed: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface TrainingModule {
  title: string
  emoji: string
  content: string
  quiz: {
    question: string
    options: string[]
    answer: 'A' | 'B' | 'C' | 'D'
    explanation: string
  }
}

interface Session {
  id: string | null
  topic: string
  level: string
  modules: TrainingModule[]
  current_module: number
  completed_modules: number[]
  chat_history: ChatMessage[]
}

type View = 'setup' | 'loading' | 'training'

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

function renderContent(text: string) {
  return text.split('\n\n').map((para, i) => {
    const html = para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return (
      <p
        key={i}
        style={{ marginBottom: '16px', lineHeight: 1.75, color: '#333333' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  })
}

export default function TrainingPage() {
  const router = useRouter()

  // Setup state
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('Intermediate')
  const [autoStartTopic, setAutoStartTopic] = useState<string | null>(null)
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const [popularCourses, setPopularCourses] = useState<{ topic_display: string; level: string; use_count: number }[]>([])
  const [activeSessionPreview, setActiveSessionPreview] = useState<{ id: string; topic: string; level: string; progress: number } | null>(null)

  // Session state
  const [view, setView] = useState<View>('setup')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTopic, setSessionTopic] = useState('')
  const [sessionLevel, setSessionLevel] = useState('')
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [currentModule, setCurrentModule] = useState(0)
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set())
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  // Progressive generation state
  const [generatingNext, setGeneratingNext] = useState(false)
  const generatingRef = useRef(false)

  // Quiz state per module
  const [quizStates, setQuizStates] = useState<Record<number, QuizState>>({})

  // Key terms state — cached per module index
  const [rightTab, setRightTab] = useState<'tutor' | 'terms'>('tutor')
  const [termsByModule, setTermsByModule] = useState<Record<number, { term: string; definition: string }[]>>({})
  const [termsLoading, setTermsLoading] = useState(false)

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Refs to capture latest state in async functions
  const sessionIdRef = useRef<string | null>(null)
  const modulesRef = useRef<TrainingModule[]>([])
  const completedRef = useRef<Set<number>>(new Set())
  const chatHistoryRef = useRef<ChatMessage[]>([])
  const sessionTopicRef = useRef('')
  const sessionLevelRef = useRef('')

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { modulesRef.current = modules }, [modules])
  useEffect(() => { completedRef.current = completedModules }, [completedModules])
  useEffect(() => { chatHistoryRef.current = chatHistory }, [chatHistory])
  useEffect(() => { sessionTopicRef.current = sessionTopic }, [sessionTopic])
  useEffect(() => { sessionLevelRef.current = sessionLevel }, [sessionLevel])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    const stored = localStorage.getItem('ic_recent_topics')
    if (stored) {
      try { setRecentTopics(JSON.parse(stored)) } catch {}
    }
    fetch('/api/training?action=popular')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPopularCourses(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const topicParam = params.get('topic')
    const levelParam = params.get('level')
    if (topicParam) {
      // Deep-link from Council — skip any cached session and auto-start
      const resolvedLevel = LEVELS.includes(levelParam ?? '') ? (levelParam as string) : 'Intermediate'
      localStorage.removeItem('ic_training_session_id')
      setTopic(topicParam)
      setLevel(resolvedLevel)
      setAutoStartTopic(topicParam)
    } else {
      const storedId = localStorage.getItem('ic_training_session_id')
      if (storedId) restoreSession(storedId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-start when deep-linked from Council chat
  useEffect(() => {
    if (!autoStartTopic || !topic) return
    startTraining()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartTopic, topic])

  // Progressive generation trigger
  useEffect(() => {
    if (view !== 'training') return
    if (!sessionTopicRef.current) return
    const nextIdx = modulesRef.current.length
    if (nextIdx >= TOTAL_MODULES) return
    if (nextIdx > currentModule + 1) return
    if (generatingRef.current) return
    generateNextModule()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModule, view])

  async function generateNextModule() {
    if (generatingRef.current) return
    const currentModules = modulesRef.current
    const nextIdx = currentModules.length
    if (nextIdx >= TOTAL_MODULES) return

    generatingRef.current = true
    setGeneratingNext(true)

    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_module',
          topic: sessionTopicRef.current,
          level: sessionLevelRef.current,
          moduleNumber: nextIdx + 1,
          previousTitles: currentModules.map(m => m.title),
        }),
      })
      const data = await res.json()
      if (!data.module) return

      setModules(prev => {
        const updated = [...prev, data.module]
        const sid = sessionIdRef.current
        if (sid) {
          const isComplete = updated.length >= TOTAL_MODULES
          fetch('/api/training', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              sessionId: sid,
              currentModule: currentModule,
              completedModules: Array.from(completedRef.current),
              chatHistory: chatHistoryRef.current,
              modules: updated,
              ...(isComplete ? {
                saveToCache: {
                  topic: sessionTopicRef.current,
                  level: sessionLevelRef.current,
                  topicNormalized: sessionTopicRef.current.trim().toLowerCase().replace(/\s+/g, ' '),
                }
              } : {}),
            }),
          }).catch(() => {})
        }
        return updated
      })
    } catch {
      // Silently fail
    } finally {
      generatingRef.current = false
      setGeneratingNext(false)
    }
  }

  async function restoreSession(id: string) {
    try {
      const res = await fetch(`/api/training?sessionId=${id}`)
      if (!res.ok) { localStorage.removeItem('ic_training_session_id'); return }
      const data = await res.json()
      if (!data?.modules?.length) { localStorage.removeItem('ic_training_session_id'); return }
      setActiveSessionPreview({
        id: data.id,
        topic: data.topic,
        level: data.level,
        progress: data.completed_modules?.length ?? 0,
      })
      applySession(data)
    } catch {
      localStorage.removeItem('ic_training_session_id')
    }
  }

  function applySession(data: Session) {
    setSessionId(data.id)
    setSessionTopic(data.topic)
    setSessionLevel(data.level)
    setModules(data.modules)
    setCurrentModule(data.current_module)
    setCompletedModules(new Set(data.completed_modules))
    setChatHistory(data.chat_history || [])
    setView('training')
  }

  async function startTraining() {
    if (!topic.trim()) return
    setView('loading')

    const recent = [topic, ...recentTopics.filter(t => t !== topic)].slice(0, 5)
    setRecentTopics(recent)
    localStorage.setItem('ic_recent_topics', JSON.stringify(recent))

    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', topic: topic.trim(), level }),
      })
      const data = await res.json()
      if (!data?.modules?.length) {
        alert('Failed to generate training plan. Please try again.')
        setView('setup')
        return
      }
      if (data.id) localStorage.setItem('ic_training_session_id', data.id)
      applySession(data)
    } catch {
      alert('Error generating training plan. Please try again.')
      setView('setup')
    }
  }

  async function autoSave(sid: string | null, curMod: number, completed: Set<number>, history: ChatMessage[]) {
    if (!sid) return
    try {
      await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          sessionId: sid,
          currentModule: curMod,
          completedModules: Array.from(completed),
          chatHistory: history,
        }),
      })
    } catch {}
  }

  function goToModule(idx: number) {
    if (idx >= modulesRef.current.length) return
    if (!completedModules.has(idx) && idx > currentModule) return
    setCurrentModule(idx)
    autoSave(sessionId, idx, completedModules, chatHistory)
  }

  function handleQuizSelect(moduleIdx: number, letter: string) {
    const mod = modules[moduleIdx]
    if (!mod) return
    const isCorrect = letter === mod.quiz.answer
    setQuizStates(prev => ({ ...prev, [moduleIdx]: { selected: letter, revealed: true } }))

    if (isCorrect && !completedModules.has(moduleIdx)) {
      const newCompleted = new Set(completedModules)
      newCompleted.add(moduleIdx)
      setCompletedModules(newCompleted)
      autoSave(sessionId, currentModule, newCompleted, chatHistory)
    }
  }

  function goToNextModule() {
    const next = currentModule + 1
    if (next >= TOTAL_MODULES) return
    setCurrentModule(next)
    autoSave(sessionId, next, completedModules, chatHistory)
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() }
    const newHistory = [...chatHistory, userMsg]
    setChatHistory(newHistory)
    setChatInput('')
    setChatLoading(true)

    const mod = modules[currentModule]
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          sessionId,
          message: userMsg.content,
          moduleTitle: mod?.title || '',
          moduleContent: mod?.content || '',
          topic: sessionTopic,
          level: sessionLevel,
          chatHistory: newHistory.slice(-10),
        }),
      })
      const data = await res.json()
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply || 'Sorry, I could not respond.' }
      const finalHistory = [...newHistory, assistantMsg]
      setChatHistory(finalHistory)
      autoSave(sessionId, currentModule, completedModules, finalHistory)
    } catch {
      const finalHistory = [...newHistory, { role: 'assistant' as const, content: 'Error reaching tutor. Please try again.' }]
      setChatHistory(finalHistory)
    } finally {
      setChatLoading(false)
    }
  }

  async function loadTerms(moduleIdx: number, content: string) {
    if (termsByModule[moduleIdx] !== undefined) return // already loaded
    setTermsLoading(true)
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_terms', content, level: sessionLevel }),
      })
      const data = await res.json()
      if (data.terms) {
        setTermsByModule(prev => ({ ...prev, [moduleIdx]: data.terms }))
      }
    } catch {
      setTermsByModule(prev => ({ ...prev, [moduleIdx]: [] }))
    } finally {
      setTermsLoading(false)
    }
  }

  function switchToTerms() {
    setRightTab('terms')
    const mod = modules[currentModule]
    if (mod) loadTerms(currentModule, mod.content)
  }

  function startNewCourse() {
    localStorage.removeItem('ic_training_session_id')
    setSessionId(null); setSessionTopic(''); setSessionLevel('')
    setModules([]); setCurrentModule(0)
    setCompletedModules(new Set()); setChatHistory([])
    setQuizStates({}); setTopic(''); setLevel('Intermediate')
    setActiveSessionPreview(null)
    setView('setup')
  }

  // ── Setup Screen ──────────────────────────────────────────────────────────

  if (view === 'setup') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'inherit' }}>
        <div style={{ position: 'fixed', top: '16px', left: '16px' }}>
          <button onClick={() => router.push('/app')} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '520px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          {/* Resume active course */}
          {activeSessionPreview && (
            <div style={{ marginBottom: '28px', padding: '16px', background: '#eaf5ef', border: '1px solid #a7d9bc', borderRadius: '10px', cursor: 'pointer' }}
              onClick={() => applySession({ id: activeSessionPreview.id, topic: activeSessionPreview.topic, level: activeSessionPreview.level, modules, current_module: currentModule, completed_modules: Array.from(completedModules), chat_history: chatHistory })}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#2d6a4f', letterSpacing: '0.1em', marginBottom: '8px' }}>▶ CONTINUE WHERE YOU LEFT OFF</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>{activeSessionPreview.topic}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '10px', color: '#2d6a4f', background: '#d0eadb', borderRadius: '8px', padding: '2px 8px', fontWeight: 600 }}>{activeSessionPreview.level}</span>
                <span style={{ fontSize: '11px', color: '#888' }}>{activeSessionPreview.progress} of {TOTAL_MODULES} modules complete</span>
              </div>
              <div style={{ marginTop: '10px', height: '3px', background: '#d0eadb', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(activeSessionPreview.progress / TOTAL_MODULES) * 100}%`, background: 'linear-gradient(90deg, #2d6a4f, #4a9a70)', borderRadius: '2px' }} />
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#111', letterSpacing: '-0.02em', marginBottom: '8px' }}>Investment Council Training</div>
            <div style={{ fontSize: '14px', color: '#888' }}>8-module courses built for you, one lesson at a time</div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>What do you want to learn?</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') startTraining() }}
              placeholder="e.g. Options trading, DeFi, Technical Analysis, Macro investing..."
              style={{ width: '100%', background: '#fafafa', border: '1px solid #ddd', borderRadius: '8px', padding: '12px 14px', color: '#111', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#2d6a4f')}
              onBlur={e => (e.currentTarget.style.borderColor = '#ddd')}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your level</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${level === l ? '#2d6a4f' : '#ddd'}`, background: level === l ? '#eaf5ef' : '#fff', color: level === l ? '#2d6a4f' : '#666', fontSize: '13px', fontWeight: level === l ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{l}</button>
              ))}
            </div>
          </div>

          <button
            onClick={startTraining}
            disabled={!topic.trim()}
            style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: topic.trim() ? 'linear-gradient(135deg, #2d6a4f, #4a9a70)' : '#e5e5e5', color: topic.trim() ? '#fff' : '#aaa', fontSize: '15px', fontWeight: 700, cursor: topic.trim() ? 'pointer' : 'default', fontFamily: 'inherit', letterSpacing: '0.02em', transition: 'all 0.15s' }}
          >
            Start Training →
          </button>

          {popularCourses.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>🔥 Popular Courses</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {popularCourses.map((c, i) => (
                  <button key={i} onClick={() => { setTopic(c.topic_display); setLevel(c.level) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e5e5', background: '#fafafa', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d6a4f'; e.currentTarget.style.background = '#eaf5ef' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e5e5'; e.currentTarget.style.background = '#fafafa' }}
                  >
                    <div>
                      <span style={{ fontSize: '13px', color: '#222', fontWeight: 600 }}>{c.topic_display}</span>
                      <span style={{ marginLeft: '10px', fontSize: '10px', color: '#888', background: '#eee', borderRadius: '4px', padding: '2px 7px' }}>{c.level}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#bbb' }}>{c.use_count >= 1000 ? `${(c.use_count / 1000).toFixed(1)}k` : c.use_count} enrolled</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentTopics.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Your Recent</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {recentTopics.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    style={{ padding: '5px 12px', borderRadius: '16px', border: '1px solid #ddd', background: '#fafafa', color: '#666', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d6a4f'; e.currentTarget.style.color = '#2d6a4f' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#666' }}
                  >{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Loading Screen ────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '20px' }}>📚</div>
          <div style={{ fontSize: '16px', color: '#222', marginBottom: '12px', fontWeight: 600 }}>
            Building your <span style={{ color: '#2d6a4f' }}>{topic}</span> course...
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2d6a4f', animation: 'blink 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#aaa' }}>Preparing your first module...</div>
        </div>
        <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
      </div>
    )
  }

  // ── Training Screen ───────────────────────────────────────────────────────

  const mod = modules[currentModule]
  const completedCount = completedModules.size
  const quizState = quizStates[currentModule]
  const isCompleted = completedModules.has(currentModule)
  const quizPassed = quizState?.revealed && quizState.selected === mod?.quiz.answer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', fontFamily: 'inherit', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, background: '#ffffff', boxShadow: '0 1px 0 #e5e5e5' }}>
        <button onClick={() => router.push('/app')} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '4px 10px', color: '#666', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #2d6a4f, #4a9a70)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>📚</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>Investment Council Training</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '11px', color: '#999' }}>
          {completedCount} of {TOTAL_MODULES} modules complete
        </div>
      </div>

      {/* 3-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: Module sidebar */}
        <div style={{ width: '220px', minWidth: '220px', borderRight: '1px solid #e5e5e5', background: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #eeeeee' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '4px', lineHeight: 1.3 }}>{sessionTopic}</div>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#eaf5ef', color: '#2d6a4f', fontWeight: 600, letterSpacing: '0.04em' }}>{sessionLevel}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {Array.from({ length: TOTAL_MODULES }, (_, idx) => {
              const m = modules[idx]
              const isCurrentMod = idx === currentModule
              const isCompletedMod = completedModules.has(idx)
              const isGenerated = idx < modules.length
              const isNextGenerating = idx === modules.length && generatingNext
              const isLocked = !isGenerated && !isNextGenerating

              return (
                <button
                  key={idx}
                  onClick={() => isGenerated && goToModule(idx)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: '2px',
                    borderRadius: '7px',
                    border: isCurrentMod ? '1px solid #a7d9bc' : '1px solid transparent',
                    background: isCurrentMod ? '#eaf5ef' : 'transparent',
                    color: isLocked ? '#ccc' : isNextGenerating ? '#bbb' : isCurrentMod ? '#2d6a4f' : isCompletedMod ? '#4a9a70' : '#555',
                    fontSize: '11px',
                    cursor: isGenerated && !isCurrentMod ? 'pointer' : 'default',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    lineHeight: 1.3,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (isGenerated && !isCurrentMod) e.currentTarget.style.background = '#f0f0f0' }}
                  onMouseLeave={e => { if (!isCurrentMod) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ flexShrink: 0, fontSize: '12px' }}>
                    {isCompletedMod ? '✓' : isNextGenerating ? '⏳' : isLocked ? '🔒' : m?.emoji || '•'}
                  </span>
                  <span style={{ flex: 1 }}>
                    {isGenerated ? m.title : isNextGenerating ? 'Generating...' : `Module ${idx + 1}`}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #eeeeee' }}>
            <button onClick={startNewCourse}
              style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px solid #ddd', background: '#fff', color: '#888', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.04em', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d6a4f'; e.currentTarget.style.color = '#2d6a4f' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#888' }}
            >+ New Course</button>
          </div>
        </div>

        {/* Center: Lesson content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #e5e5e5', background: '#ffffff' }}>
          <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#999' }}>Module {currentModule + 1} of {TOTAL_MODULES}</span>
              <span style={{ fontSize: '11px', color: '#999' }}>{completedCount}/{TOTAL_MODULES} complete</span>
            </div>
            <div style={{ height: '3px', background: '#eeeeee', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(completedCount / TOTAL_MODULES) * 100}%`, background: 'linear-gradient(90deg, #2d6a4f, #4a9a70)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {mod ? (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{mod.emoji}</div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{mod.title}</h1>
                  {isCompleted && (
                    <span style={{ display: 'inline-block', fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: '#eaf5ef', border: '1px solid #a7d9bc', color: '#2d6a4f', fontWeight: 600 }}>✓ Module Complete</span>
                  )}
                </div>

                <div style={{ marginBottom: '32px' }}>{renderContent(mod.content)}</div>

                {/* Quiz */}
                <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>Knowledge Check</div>
                  <div style={{ fontSize: '15px', color: '#111', marginBottom: '16px', lineHeight: 1.6 }}>{mod.quiz.question}</div>

                  {isCompleted && !quizState ? (
                    <div style={{ fontSize: '13px', color: '#4a9a70', fontStyle: 'italic' }}>Quiz already completed for this module.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {mod.quiz.options.map(option => {
                        const letter = option.charAt(0)
                        const isSelected = quizState?.selected === letter
                        const isCorrectAnswer = letter === mod.quiz.answer
                        const isRevealed = quizState?.revealed

                        let bg = '#ffffff', border = '#ddd', color = '#444'
                        if (isRevealed) {
                          if (isCorrectAnswer) { bg = '#eaf5ef'; border = '#a7d9bc'; color = '#2d6a4f' }
                          else if (isSelected) { bg = '#fff0f0'; border = '#ffaaaa'; color = '#cc4444' }
                          else { color = '#ccc' }
                        } else if (isSelected) { bg = '#f5f5f5'; border = '#999'; color = '#111' }

                        return (
                          <button key={letter}
                            onClick={() => !quizState?.revealed && handleQuizSelect(currentModule, letter)}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${border}`, background: bg, color, fontSize: '13px', cursor: quizState?.revealed ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', lineHeight: 1.4, transition: 'all 0.15s', fontWeight: isRevealed && isCorrectAnswer ? 600 : 400 }}
                            onMouseEnter={e => { if (!quizState?.revealed) e.currentTarget.style.borderColor = '#2d6a4f' }}
                            onMouseLeave={e => { if (!quizState?.revealed && !isSelected) e.currentTarget.style.borderColor = '#ddd' }}
                          >{option}</button>
                        )
                      })}
                    </div>
                  )}

                  {quizState?.revealed && (
                    <div style={{ marginTop: '12px' }}>
                      {quizState.selected === mod.quiz.answer
                        ? <div style={{ color: '#2d6a4f', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>✓ Correct!</div>
                        : <div style={{ color: '#cc4444', fontSize: '14px', marginBottom: '8px' }}>Incorrect — the correct answer is {mod.quiz.answer})</div>
                      }
                      <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{mod.quiz.explanation}</div>
                    </div>
                  )}

                  {(isCompleted || quizPassed) && currentModule < TOTAL_MODULES - 1 && (
                    <div style={{ marginTop: '16px' }}>
                      {currentModule + 1 < modules.length ? (
                        <button onClick={goToNextModule}
                          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2d6a4f, #4a9a70)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}
                        >Next Module →</button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4a9a70', fontSize: '12px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4a9a70', animation: 'blink 1.2s ease-in-out infinite' }} />
                          Preparing next module...
                        </div>
                      )}
                    </div>
                  )}

                  {(isCompleted || quizPassed) && currentModule === TOTAL_MODULES - 1 && completedCount >= TOTAL_MODULES && (
                    <div style={{ marginTop: '16px', padding: '16px', background: '#eaf5ef', borderRadius: '8px', border: '1px solid #a7d9bc', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '8px' }}>🎓</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#2d6a4f', marginBottom: '4px' }}>Course Complete!</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>You&apos;ve finished all {TOTAL_MODULES} modules on {sessionTopic}.</div>
                      <button onClick={startNewCourse}
                        style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '7px', border: '1px solid #a7d9bc', background: '#fff', color: '#2d6a4f', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >Start Another Course</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: '#aaa', fontSize: '14px' }}>Loading module...</div>
            )}
          </div>
        </div>

        {/* Right: Tabbed panel — Tutor | Key Terms */}
        <div style={{ width: '300px', minWidth: '300px', display: 'flex', flexDirection: 'column', background: '#fafafa', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #eeeeee', background: '#ffffff', flexShrink: 0 }}>
            <button
              onClick={() => setRightTab('tutor')}
              style={{ flex: 1, padding: '11px 0', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', border: 'none', cursor: 'pointer', background: 'transparent', borderBottom: rightTab === 'tutor' ? '2px solid #2d6a4f' : '2px solid transparent', color: rightTab === 'tutor' ? '#2d6a4f' : '#aaa', transition: 'all 0.15s' }}
            >🎓 Ask Tutor</button>
            <button
              onClick={switchToTerms}
              style={{ flex: 1, padding: '11px 0', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', border: 'none', cursor: 'pointer', background: 'transparent', borderBottom: rightTab === 'terms' ? '2px solid #2d6a4f' : '2px solid transparent', color: rightTab === 'terms' ? '#2d6a4f' : '#aaa', transition: 'all 0.15s' }}
            >📖 Key Terms</button>
          </div>

          {/* Tutor chat */}
          {rightTab === 'tutor' && (
            <>
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#bbb' }}>Ask anything about {mod?.title || 'this module'}</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatHistory.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>Got a question about the lesson?<br />Your AI tutor is here to help.</div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.6, background: msg.role === 'user' ? '#eaf5ef' : '#ffffff', border: `1px solid ${msg.role === 'user' ? '#a7d9bc' : '#e5e5e5'}`, color: msg.role === 'user' ? '#2d6a4f' : '#333', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', gap: '4px', padding: '8px 12px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4a9a70', animation: 'blink 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid #eeeeee', flexShrink: 0, background: '#ffffff' }}>
                <div style={{ display: 'flex', gap: '6px', background: '#fafafa', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 8px' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                    placeholder="Ask a question..."
                    disabled={chatLoading}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#111', fontSize: '12px', fontFamily: 'inherit' }}
                  />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading}
                    style={{ background: chatInput.trim() && !chatLoading ? '#2d6a4f' : '#e5e5e5', border: 'none', borderRadius: '5px', width: '26px', height: '26px', color: chatInput.trim() && !chatLoading ? '#fff' : '#aaa', fontSize: '13px', cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}
                  >↑</button>
                </div>
              </div>
            </>
          )}

          {/* Key Terms glossary */}
          {rightTab === 'terms' && (
            <>
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#bbb' }}>Plain-English definitions for this module</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {termsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4a9a70', animation: 'blink 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#bbb' }}>Extracting key terms...</div>
                  </div>
                ) : (termsByModule[currentModule] ?? []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', marginTop: '40px' }}>No terms found for this module.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(termsByModule[currentModule] ?? []).map((t, i) => (
                      <div key={i} style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#2d6a4f', marginBottom: '4px' }}>{t.term}</div>
                        <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{t.definition}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
      `}</style>
    </div>
  )
}
