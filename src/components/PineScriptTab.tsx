'use client'

import { useState, useRef, useEffect } from 'react'

interface SavedScript {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

interface LocalFile {
  name: string
  modified: string
}

interface ScriptVersion {
  id: string
  script_id: string
  version_number: number
  code: string
  specialist: string | null
  notes: string | null
  created_at: string
}

interface PineScriptTabProps {
  onSendMessage: (text: string, onComplete?: (response: string) => void) => Promise<void>
  onSwitchToChat: () => void
  onScriptChange?: (name: string, code: string) => void
  isLoading: boolean
  pendingImprovedCode?: string | null
  onPendingCodeConsumed?: () => void
}

// ── Pine Script syntax highlighter ──────────────────────────────────────────
const KEYWORDS = new Set(['var','varip','if','else','for','to','by','while','switch','and','or','not','true','false','na','import','export','method','type','series','simple','const','input','return','break','continue'])
const TYPES = new Set(['float','int','bool','string','color','array','matrix','label','line','box','table'])
const BUILTINS = new Set(['strategy','indicator','library','plot','plotshape','plotchar','bgcolor','barcolor','fill','hline','alertcondition','alert','ta','math','str','request','ticker','syminfo','timeframe','close','open','high','low','volume','bar_index','barstate','last_bar_index','hl2','hlc3','ohlc4'])

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightPine(code: string): string {
  let result = ''
  let i = 0
  while (i < code.length) {
    // Line comment
    if (code[i] === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      const slice = end === -1 ? code.slice(i) : code.slice(i, end)
      result += `<span style="color:#6a9955">${esc(slice)}</span>`
      i = end === -1 ? code.length : end
      continue
    }
    // String
    if (code[i] === '"') {
      let j = i + 1
      while (j < code.length && code[j] !== '"') { if (code[j] === '\\') j++; j++ }
      result += `<span style="color:#ce9178">${esc(code.slice(i, j + 1))}</span>`
      i = j + 1
      continue
    }
    // Identifier / keyword
    if (/[a-zA-Z_@]/.test(code[i])) {
      let j = i
      while (j < code.length && /[a-zA-Z0-9_.]/.test(code[j])) j++
      const word = code.slice(i, j)
      const after = code.slice(j).trimStart()
      const isCall = after[0] === '('
      if (KEYWORDS.has(word)) {
        result += `<span style="color:#c586c0">${esc(word)}</span>`
      } else if (TYPES.has(word)) {
        result += `<span style="color:#4ec9b0">${esc(word)}</span>`
      } else if (BUILTINS.has(word) || isCall) {
        result += `<span style="color:#dcdcaa">${esc(word)}</span>`
      } else {
        result += esc(word)
      }
      i = j
      continue
    }
    // Number
    if (/[0-9]/.test(code[i])) {
      let j = i
      while (j < code.length && /[0-9.]/.test(code[j])) j++
      result += `<span style="color:#b5cea8">${esc(code.slice(i, j))}</span>`
      i = j
      continue
    }
    result += esc(code[i])
    i++
  }
  return result
}

// ── Extract pinescript code block from Claude's response ────────────────────
function extractPineCode(response: string): string | null {
  const match = response.match(/```(?:pinescript|pine|javascript)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

// ── Simple line-by-line diff ─────────────────────────────────────────────────
function computeDiff(origLines: string[], impLines: string[]): { orig: string; imp: string; changed: boolean }[] {
  const maxLen = Math.max(origLines.length, impLines.length)
  const result: { orig: string; imp: string; changed: boolean }[] = []
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? ''
    const m = impLines[i] ?? ''
    result.push({ orig: o, imp: m, changed: o.trim() !== m.trim() })
  }
  return result
}

// ── Specialist prompts ────────────────────────────────────────────────────────
function buildPrompt(specialist: string, scriptName: string, scriptCode: string): string {
  const code = `\n\n\`\`\`\n${scriptCode}\n\`\`\``

  const prompts: Record<string, string> = {
    'Full Council': `Analyze this Pine Script called "${scriptName}" using the full Investment Council.

Tell me in plain English:
1. What this script does overall
2. What Tudor Jones thinks — trend quality, momentum, signal timing
3. What Livermore thinks — price action, entries, pivot points
4. What the technical specialist thinks — indicator accuracy and logic
5. What the risk specialist thinks — stops, sizing, drawdown
6. What all specialists agree needs to be improved
7. The top 5 improvements to make

Script name: ${scriptName}${code}

Analysis only — no code yet. Plain English throughout.`,

    'Implement': `Based on your analysis, implement ALL the improvements you recommended for "${scriptName}".

Provide the COMPLETE improved Pine Script in a \`\`\`pinescript code block.
The code must be complete — no placeholders, no truncation, no "// rest of code here".

Current script:${code}`,

    'Tudor Jones Version': `Rewrite this Pine Script called "${scriptName}" the way Tudor Jones would build it.

First tell me in plain English what you are changing and why Tudor Jones would make these changes.

Then provide the COMPLETE improved script in a \`\`\`pinescript code block.

Tudor Jones principles to apply:
- Only trade in the direction of the trend
- Add momentum confirmation before entries
- Maximum 1-2% risk per trade
- Add market regime filter (avoid ranging/choppy markets)
- Clean, precise entries only — no noise

Script: ${scriptName}${code}`,

    'Livermore Version': `Rewrite this Pine Script called "${scriptName}" the way Jesse Livermore would build it.

First tell me in plain English what you are changing and why.

Then provide the COMPLETE improved script in a \`\`\`pinescript code block.

Livermore principles:
- Entries only at confirmed pivot points
- Volume must confirm the move
- Tight stops at key levels, no room to breathe
- Cut losses immediately, let winners run

Script: ${scriptName}${code}`,

    'Technician Review': `Review and improve this Pine Script called "${scriptName}" from a pure technical analysis standpoint.

Tell me in plain English:
- Are the indicators being used correctly?
- Any redundant or conflicting signals?
- What makes the signals stronger and more accurate?

Then provide the COMPLETE improved script in a \`\`\`pinescript code block.

Script: ${scriptName}${code}`,

    'Risk Check': `Review this Pine Script called "${scriptName}" specifically for risk management.

Tell me in plain English:
- Is there a proper stop loss on every trade?
- Is position sizing handled correctly?
- Is drawdown being controlled?
- What risk improvements are needed?

Then provide the COMPLETE risk-improved script in a \`\`\`pinescript code block.

Script: ${scriptName}${code}`,

    'Add Alerts': `Add proper TradingView alert conditions to this Pine Script called "${scriptName}".

Tell me what alerts you are adding and why.

Then provide the COMPLETE script with all alerts added in a \`\`\`pinescript code block.

Add alerts for: long entry, short entry, stop loss hit, target reached, and any key conditions in the script.

Script: ${scriptName}${code}`,

    'Optimize Settings': `Review and optimize all input parameters in this Pine Script called "${scriptName}".

Tell me what you are changing and why each change improves the script.

Then provide the COMPLETE optimized script in a \`\`\`pinescript code block.

Focus on: logical default values, sensible ranges, clear descriptions, grouped inputs for easier use.

Script: ${scriptName}${code}`,

    'Backtest Analysis': `Review this Pine Script called "${scriptName}" for backtesting quality and realistic logic.

Tell me in plain English:
- What the backtest settings are (commission, slippage, etc.)
- Whether entry/exit logic is backtest-realistic
- Any look-ahead bias or curve-fitting problems
- How to correctly read the strategy tester results
- What improvements make the backtesting more accurate

Then provide the COMPLETE improved script in a \`\`\`pinescript code block.

Script: ${scriptName}${code}`,
  }

  return prompts[specialist] || prompts['Full Council']
}

// ── Button style helper ────────────────────────────────────────────────────────
function btn(bg: string, color = '#ccc'): React.CSSProperties {
  return {
    background: bg,
    border: '1px solid transparent',
    borderRadius: '6px',
    padding: '5px 10px',
    color,
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PineScriptTab({ onSendMessage, onSwitchToChat, onScriptChange, isLoading, pendingImprovedCode, onPendingCodeConsumed }: PineScriptTabProps) {
  const [scriptName, setScriptName] = useState('My Script')
  const [scriptCode, setScriptCode] = useState('')
  const [improvedCode, setImprovedCode] = useState<string | null>(null)
  const [showSplitView, setShowSplitView] = useState(false)
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([])
  const [versions, setVersions] = useState<ScriptVersion[]>([])
  const [currentScriptId, setCurrentScriptId] = useState<string | null>(null)
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lineNumRef = useRef<HTMLDivElement>(null)

  function syncScroll() {
    if (lineNumRef.current && editorRef.current) {
      lineNumRef.current.scrollTop = editorRef.current.scrollTop
    }
  }

  async function loadLibrary() {
    setLoadingLibrary(true)
    try {
      const [scriptsRes, localRes] = await Promise.all([
        fetch('/api/pine/scripts'),
        fetch('/api/pine/local'),
      ])
      const scriptsData = await scriptsRes.json()
      const localData = await localRes.json()
      setSavedScripts(Array.isArray(scriptsData) ? scriptsData : [])
      setLocalFiles(Array.isArray(localData) ? localData : [])
    } catch { /* ignore */ }
    setLoadingLibrary(false)
  }

  async function loadLocalFile(fileName: string) {
    try {
      const res = await fetch(`/api/pine/local?name=${encodeURIComponent(fileName)}`)
      const data = await res.json()
      if (data.content) {
        const name = fileName.replace(/\.(txt|pine)$/, '')
        setScriptCode(data.content)
        setScriptName(name)
        setCurrentScriptId(null)
        setVersions([])
        setImprovedCode(null)
        setShowSplitView(false)
        setShowLibrary(false)
        onScriptChange?.(name, data.content)
      }
    } catch { /* ignore */ }
  }

  async function loadScript(scriptId: string) {
    try {
      const res = await fetch(`/api/pine/scripts/${scriptId}/versions`)
      const data = await res.json()
      if (data.versions?.length > 0) {
        const latest = data.versions[0]
        setScriptCode(latest.code)
        setScriptName(data.script.name)
        setCurrentScriptId(scriptId)
        setVersions(data.versions)
        setImprovedCode(null)
        setShowSplitView(false)
        setShowLibrary(false)
        setShowVersions(false)
        onScriptChange?.(data.script.name, latest.code)
      }
    } catch { /* ignore */ }
  }

  async function loadVersion(version: ScriptVersion) {
    setScriptCode(version.code)
    setImprovedCode(null)
    setShowSplitView(false)
    setShowVersions(false)
  }

  async function saveScript() {
    if (!scriptCode.trim()) {
      setSaveStatus('❌ No code to save')
      setTimeout(() => setSaveStatus(null), 3000)
      return
    }
    try {
      if (currentScriptId) {
        const res = await fetch(`/api/pine/scripts/${currentScriptId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: scriptCode, specialist: 'manual' }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setSaveStatus(`✅ Saved as version ${data.version_number}`)
        await loadLibrary()
      } else {
        const res = await fetch('/api/pine/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: scriptName, code: scriptCode }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setCurrentScriptId(data.script_id)
        setSaveStatus(`✅ Saved "${scriptName}" as version 1`)
        await loadLibrary()
      }
    } catch (e: any) {
      setSaveStatus(`❌ Save failed — make sure Supabase tables are created`)
    }
    setTimeout(() => setSaveStatus(null), 5000)
  }

  async function runSpecialist(specialist: string) {
    if (!scriptCode.trim()) {
      alert('Paste your Pine Script into the editor first')
      return
    }
    const prompt = buildPrompt(specialist, scriptName, scriptCode)
    onSwitchToChat()
    await onSendMessage(prompt, (response) => {
      const code = extractPineCode(response)
      if (code) {
        setImprovedCode(code)
        setShowSplitView(true)
      }
    })
  }

  async function acceptAllChanges() {
    if (!improvedCode) return
    const accepted = improvedCode
    setScriptCode(accepted)
    setImprovedCode(null)
    setShowSplitView(false)

    if (currentScriptId) {
      try {
        const res = await fetch(`/api/pine/scripts/${currentScriptId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: accepted, specialist: 'council' }),
        })
        const data = await res.json()
        setSaveStatus(`✅ Changes accepted and saved as version ${data.version_number}`)
        // Reload version history
        const vRes = await fetch(`/api/pine/scripts/${currentScriptId}/versions`)
        const vData = await vRes.json()
        setVersions(vData.versions || [])
      } catch {
        setSaveStatus('✅ Changes applied — click Save to store in your library')
      }
    } else {
      setSaveStatus('✅ Changes applied — click Save to store in your library')
    }
    setTimeout(() => setSaveStatus(null), 5000)
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(scriptCode)
      setCopyStatus('✅ Copied! Go to TradingView → Pine Script Editor → Select All → Paste')
    } catch {
      setCopyStatus('❌ Copy failed — try selecting and copying manually')
    }
    setTimeout(() => setCopyStatus(null), 6000)
  }

  useEffect(() => { loadLibrary() }, [])

  // When chat sends back an improved Pine Script, push it into the editor split view
  useEffect(() => {
    if (pendingImprovedCode) {
      setImprovedCode(pendingImprovedCode)
      setShowSplitView(true)
      onPendingCodeConsumed?.()
    }
  }, [pendingImprovedCode])

  const lineCount = Math.max(1, scriptCode.split('\n').length)
  const diff = showSplitView && improvedCode
    ? computeDiff(scriptCode.split('\n'), improvedCode.split('\n'))
    : []

  const disabled = isLoading || !scriptCode.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0a0a0a' }}>

      {/* ── Script name + controls ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#0a0a0a' }}>
        <input
          value={scriptName}
          onChange={e => {
            setScriptName(e.target.value)
            if (scriptCode) onScriptChange?.(e.target.value, scriptCode)
          }}
          placeholder="Script name..."
          style={{ background: '#111', border: '1px solid #262626', borderRadius: '6px', padding: '5px 10px', color: '#e5e5e5', fontSize: '13px', fontWeight: 600, width: '180px', outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={saveScript} style={btn('#2d6a4f', '#fff')}>💾 Save</button>
        <button
          onClick={() => { setShowLibrary(v => !v); if (!showLibrary) loadLibrary() }}
          style={btn('#111')}
        >📂 Load Script ▾</button>
        {currentScriptId && (
          <button onClick={() => setShowVersions(v => !v)} style={btn('#111')}>🕐 Version History ▾</button>
        )}
        <div style={{ flex: 1 }} />
        {saveStatus && (
          <span style={{ fontSize: '12px', color: saveStatus.startsWith('✅') ? '#2d6a4f' : '#c0392b', fontWeight: 600 }}>
            {saveStatus}
          </span>
        )}
        <button onClick={copyToClipboard} disabled={!scriptCode.trim()} style={{ ...btn('#1a472a', '#7ec8a0'), opacity: scriptCode.trim() ? 1 : 0.4 }}>
          📋 Copy to TradingView
        </button>
      </div>

      {/* ── Copy status banner ── */}
      {copyStatus && (
        <div style={{ padding: '8px 16px', background: '#0d1f16', color: '#7ec8a0', fontSize: '13px', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid #1a472a' }}>
          {copyStatus}
        </div>
      )}

      {/* ── Library panel ── */}
      {showLibrary && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
          {loadingLibrary ? (
            <div style={{ color: '#444', fontSize: '12px' }}>Loading...</div>
          ) : (
            <>
              {/* Local files from ~/pine-scripts */}
              {localFiles.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.06em' }}>
                    📁 FROM ~/pine-scripts FOLDER
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {localFiles.map(f => (
                      <button key={f.name} onClick={() => loadLocalFile(f.name)} style={{
                        background: '#111', border: '1px solid #262626',
                        borderRadius: '6px', padding: '8px 14px', color: '#ccc', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}>
                        <div style={{ fontWeight: 600, color: '#e5e5e5' }}>{f.name}</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>
                          {new Date(f.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Supabase saved scripts */}
              <div>
                <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.06em' }}>
                  💾 SAVED IN LIBRARY
                </div>
                {savedScripts.length === 0 ? (
                  <div style={{ color: '#333', fontSize: '12px' }}>No saved scripts yet. Load a file, then click Save to add it to your library.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {savedScripts.map(s => (
                      <button key={s.id} onClick={() => loadScript(s.id)} style={{
                        background: s.id === currentScriptId ? '#0d1f16' : '#111',
                        border: `1px solid ${s.id === currentScriptId ? '#2d6a4f' : '#262626'}`,
                        borderRadius: '6px', padding: '8px 14px', color: '#ccc', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}>
                        <div style={{ fontWeight: 600, color: '#e5e5e5' }}>{s.name}</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>
                          {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Version history panel ── */}
      {showVersions && versions.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', background: '#080808' }}>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.06em' }}>VERSION HISTORY — click any version to load it</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {versions.map(v => (
              <button key={v.id} onClick={() => loadVersion(v)} style={{
                background: '#111', border: '1px solid #262626', borderRadius: '6px',
                padding: '8px 14px', color: '#ccc', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <div style={{ fontWeight: 600, color: '#e5e5e5' }}>Version {v.version_number}</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>
                  {v.specialist || 'manual'} · {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Specialist toolbar ── */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', background: '#080808' }}>
        <button
          onClick={() => runSpecialist('Full Council')}
          disabled={disabled}
          style={{ ...btn('#1a472a', '#7ec8a0'), opacity: disabled ? 0.4 : 1, fontWeight: 700 }}
        >⚡ Analyze Full Council</button>
        <button
          onClick={() => runSpecialist('Implement')}
          disabled={disabled}
          style={{ ...btn('#1a3a2a', '#7ec8a0'), opacity: disabled ? 0.4 : 1, fontWeight: 700 }}
        >🔧 Implement Improvements</button>

        <div style={{ width: '1px', height: '20px', background: '#1a1a1a' }} />

        {[
          { label: 'Tudor Jones', key: 'Tudor Jones Version' },
          { label: 'Livermore', key: 'Livermore Version' },
          { label: 'Technician', key: 'Technician Review' },
          { label: 'Risk Check', key: 'Risk Check' },
          { label: 'Add Alerts', key: 'Add Alerts' },
          { label: 'Optimize', key: 'Optimize Settings' },
          { label: 'Backtest', key: 'Backtest Analysis' },
        ].map(({ label, key }) => (
          <button
            key={key}
            onClick={() => runSpecialist(key)}
            disabled={disabled}
            style={{ ...btn('#111'), opacity: disabled ? 0.4 : 1 }}
          >{label}</button>
        ))}
      </div>

      {/* ── Split view accept/reject bar ── */}
      {showSplitView && improvedCode && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a3a2a', background: '#080f0a', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#7ec8a0' }}>
            ✦ Council improved version is ready — review the highlighted changes and accept or reject.
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={acceptAllChanges} style={{ ...btn('#2d6a4f', '#fff'), fontWeight: 700 }}>✅ Accept All Changes</button>
          <button onClick={() => { setShowSplitView(false); setImprovedCode(null) }} style={btn('#2a1010', '#ff8080')}>✕ Reject</button>
        </div>
      )}

      {/* ── Editor area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '1px', background: '#1a1a1a' }}>

        {/* Left: editable editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ fontSize: '10px', color: '#333', padding: '5px 16px', borderBottom: '1px solid #111', fontWeight: 600, letterSpacing: '0.06em', flexShrink: 0 }}>
            {showSplitView ? 'ORIGINAL' : 'EDITOR'} · {lineCount} LINES
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Line numbers */}
            <div
              ref={lineNumRef}
              style={{ width: '48px', overflowY: 'hidden', padding: '12px 0', background: '#070707', userSelect: 'none', flexShrink: 0 }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  style={{ height: '20px', lineHeight: '20px', textAlign: 'right', paddingRight: '12px', fontSize: '12px', color: '#2a2a2a', fontFamily: 'Monaco, Menlo, "Courier New", monospace' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Textarea */}
            <textarea
              ref={editorRef}
              value={scriptCode}
              onChange={e => {
                setScriptCode(e.target.value)
                onScriptChange?.(scriptName, e.target.value)
              }}
              onScroll={syncScroll}
              placeholder={`Paste your Pine Script here...\n\n// Example:\n//@version=5\nindicator("My Script", overlay=true)\n\nema20 = ta.ema(close, 20)\nplot(ema20, color=color.blue)`}
              spellCheck={false}
              style={{
                flex: 1,
                background: 'transparent',
                color: '#d4d4d4',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                fontSize: '13px',
                lineHeight: '20px',
                padding: '12px 16px 12px 8px',
                tabSize: 4,
                overflowY: 'auto',
              }}
            />
          </div>
        </div>

        {/* Right: improved version (split view) */}
        {showSplitView && improvedCode && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: '#2d6a4f', padding: '5px 16px', borderBottom: '1px solid #111', fontWeight: 600, letterSpacing: '0.06em', flexShrink: 0 }}>
              ✦ COUNCIL IMPROVED · {improvedCode.split('\n').length} LINES · GREEN = CHANGED
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Line numbers */}
              <div style={{ width: '48px', padding: '12px 0', background: '#070707', userSelect: 'none', flexShrink: 0, overflowY: 'hidden' }}>
                {diff.map((_, i) => (
                  <div key={i} style={{ height: '20px', lineHeight: '20px', textAlign: 'right', paddingRight: '12px', fontSize: '12px', color: '#2a2a2a', fontFamily: 'Monaco, Menlo, "Courier New", monospace' }}>
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Diff display */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 12px 8px' }}>
                {diff.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      height: '20px',
                      lineHeight: '20px',
                      background: line.changed ? 'rgba(45,106,79,0.12)' : 'transparent',
                      borderLeft: line.changed ? '2px solid #2d6a4f' : '2px solid transparent',
                      paddingLeft: '8px',
                      fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                      fontSize: '13px',
                      color: line.changed ? '#a8d5b5' : '#d4d4d4',
                      whiteSpace: 'pre',
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightPine(line.imp || ' ') }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
