import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { COURSES } from '../data/courses'
import { berechneSpielvorgabe, stablefordPunkte } from '../utils/handicap'

function scoreFarbe(diff) {
  if (diff <= -2) return '#f59e0b'
  if (diff === -1) return '#22c55e'
  if (diff === 0) return '#6b7280'
  if (diff === 1) return '#ef4444'
  return '#991b1b'
}

function scoreLabel(diff, punkte, format) {
  if (format === 'stableford') return `${punkte} Pkt`
  if (diff <= -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Doppelbogey'
  return `+${diff}`
}

const ITEM_H = 64

function ScrollPicker({ value, onChange }) {
  const werte = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const labels = ['—', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = value * ITEM_H
  }, [value])

  const handleScroll = () => {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(werte.length - 1, idx))
    if (werte[clamped] !== value) onChange(werte[clamped])
  }

  return (
    <div style={{ position: 'relative', width: 120, height: ITEM_H * 3, margin: '0 auto' }}>
      <div style={{
        position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
        background: 'rgba(0,0,0,0.06)', borderRadius: 12,
        borderTop: '2px solid var(--primary)', borderBottom: '2px solid var(--primary)',
        pointerEvents: 'none', zIndex: 2
      }} />
      <div ref={ref} onScroll={handleScroll} style={{
        height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        <div style={{ height: ITEM_H }} />
        {werte.map((w, i) => (
          <div key={w} style={{
            height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
            scrollSnapAlign: 'center',
            fontSize: w === value ? 48 : 28,
            fontWeight: w === value ? 800 : 400,
            color: w === value ? 'var(--primary)' : '#ccc',
            transition: 'all 0.15s', cursor: 'pointer', userSelect: 'none'
          }} onClick={() => { onChange(w); if (ref.current) ref.current.scrollTop = i * ITEM_H }}>
            {labels[i]}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  )
}

export default function RundeScoring() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [runde, setRunde] = useState(null)
  const [platz, setPlatz] = useState(null)
  const [loch, setLoch] = useState(0)
  const [spielerIdx, setSpielerIdx] = useState(0)
  const [scores, setScores] = useState({})
  const [aktScore, setAktScore] = useState(0)
  const [laden, setLaden] = useState(true)
  const [bestaetigung, setBestaetigung] = useState(false)

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'runden', id))
      if (!snap.exists()) return navigate('/')
      const data = { id: snap.id, ...snap.data() }
      setRunde(data)
      const geladeneScores = data.scores || {}
      setScores(geladeneScores)
      const kurs = COURSES.find(c => c.id === data.platzId)
      setPlatz(kurs || null)

      const sp = data.spieler || []
      const holes = kurs?.holes || []
      let startLoch = 0
      for (let i = 0; i < holes.length; i++) {
        const alleFertig = sp.every(s => (geladeneScores[s.id]?.[i] || 0) > 0)
        if (!alleFertig) { startLoch = i; break }
        if (i === holes.length - 1) startLoch = i
      }
      setLoch(startLoch)
      const ersteSp = sp[0]
      setAktScore(geladeneScores[ersteSp?.id]?.[startLoch] || 0)
      setLaden(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!runde?.spieler) return
    const sp = runde.spieler[spielerIdx]
    setAktScore(scores[sp?.id]?.[loch] || 0)
  }, [loch, spielerIdx])

  if (laden || !runde) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Lädt...</p>
    </div>
  )

  const spieler = runde.spieler || []
  const holes = platz?.holes || []
  const anzahl = holes.length || 18
  const lochD = holes[loch]
  const par = lochD?.par || 4
  const lochHcp = lochD?.hcp || loch + 1
  const sp = spieler[spielerIdx]
  const hcp = sp?.hcp || 0

  const spielvorgabe = berechneSpielvorgabe(
    hcp,
    platz?.sr_herren || 113,
    platz?.cr_herren || platz?.par || 72,
    platz?.par || 72,
    runde.mitPlatzvorgabe !== false
  )

  const diff = aktScore > 0 ? aktScore - par : null
  const punkte = aktScore > 0 ? stablefordPunkte(aktScore, par, spielvorgabe, lochHcp) : null
  const istLetzte = spielerIdx === spieler.length - 1 && loch === anzahl - 1

  // Direkte Loch-Navigation über Pfeile — unabhängig vom Spieler-Fortschritt
  const gehZuLoch = (neuesLoch) => {
    if (neuesLoch < 0 || neuesLoch >= anzahl) return
    setLoch(neuesLoch)
    setAktScore(scores[sp?.id]?.[neuesLoch] || 0)
  }

  const speichern = async () => {
    const neueScores = {
      ...scores,
      [sp.id]: { ...(scores[sp.id] || {}), [loch]: aktScore }
    }
    setScores(neueScores)
    setBestaetigung(true)

    await updateDoc(doc(db, 'runden', id), { scores: neueScores })

    setTimeout(() => {
      setBestaetigung(false)
      if (spielerIdx < spieler.length - 1) {
        const next = spieler[spielerIdx + 1]
        setAktScore(neueScores[next.id]?.[loch] || 0)
        setSpielerIdx(spielerIdx + 1)
      } else if (loch < anzahl - 1) {
        const first = spieler[0]
        setAktScore(neueScores[first.id]?.[loch + 1] || 0)
        setSpielerIdx(0)
        setLoch(loch + 1)
      } else {
        navigate(`/runde/${id}`)
      }
    }, 550)
  }

  const zurueck = () => {
    if (spielerIdx > 0) {
      const prev = spieler[spielerIdx - 1]
      setAktScore(scores[prev.id]?.[loch] || 0)
      setSpielerIdx(spielerIdx - 1)
    } else if (loch > 0) {
      const last = spieler[spieler.length - 1]
      setAktScore(scores[last.id]?.[loch - 1] || 0)
      setSpielerIdx(spieler.length - 1)
      setLoch(loch - 1)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* Bestätigungs-Overlay */}
      {bestaetigung && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: '24px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: 'white'
            }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Gespeichert</div>
          </div>
        </div>
      )}

      {/* Header mit Loch-Pfeilen */}
      <div style={{ background: 'var(--primary)', color: 'white', padding: '16px 20px 12px' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Spieler {spielerIdx + 1}/{spieler.length} · Loch {loch + 1}/{anzahl}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <button onClick={() => gehZuLoch(loch - 1)} disabled={loch === 0}
            style={{
              background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
              width: 34, height: 34, borderRadius: '50%', fontSize: 18, cursor: 'pointer',
              opacity: loch === 0 ? 0.3 : 1, flexShrink: 0
            }}>‹</button>

          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Loch {loch + 1}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Par {par} · HCP {lochHcp}{lochD?.distanz ? ` · ${lochD.distanz}m` : ''}
            </div>
          </div>

          <button onClick={() => gehZuLoch(loch + 1)} disabled={loch === anzahl - 1}
            style={{
              background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
              width: 34, height: 34, borderRadius: '50%', fontSize: 18, cursor: 'pointer',
              opacity: loch === anzahl - 1 ? 0.3 : 1, flexShrink: 0
            }}>›</button>
        </div>

        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {Array.from({ length: anzahl }).map((_, i) => {
            const fertig = spieler.every(s => (scores[s.id]?.[i] || 0) > 0)
            return <div key={i} onClick={() => gehZuLoch(i)} style={{
              width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
              background: i === loch ? 'white' : fertig ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'
            }} />
          })}
        </div>
      </div>

      {/* Spieler Card */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {sp?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{sp?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              WHI {hcp} · Spielvorgabe {spielvorgabe}
            </div>
          </div>
        </div>
      </div>

      {/* Score Rad */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Schläge</div>
        <ScrollPicker value={aktScore} onChange={setAktScore} />
        {diff !== null && (
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: scoreFarbe(diff) }}>
            {scoreLabel(diff, punkte, runde.format)}
          </div>
        )}
        {spieler.filter((_, i) => i < spielerIdx).map(s => {
          const sc = scores[s.id]?.[loch] || 0
          return sc > 0 ? (
            <div key={s.id} style={{ marginTop: 8, background: 'white', borderRadius: 10, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300, opacity: 0.6 }}>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontWeight: 700 }}>{sc} Schläge</span>
            </div>
          ) : null
        })}
      </div>

      {/* Buttons */}
      <div style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '12px 20px 90px 20px', display: 'flex', gap: 12 }}>
        <button onClick={() => navigate(`/runde/${id}`)}
  style={{ flex: 1, padding: 14, borderRadius: 12, border: '2px solid var(--border)', background: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
  ‹ Übersicht
</button>
        <button onClick={speichern}
          style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {istLetzte ? '✓ Speichern & Abschließen' : '✓ Speichern'}
        </button>
      </div>
    </div>
  )
}