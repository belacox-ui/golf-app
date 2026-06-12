import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

export default function LiveScoring() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [scores, setScores] = useState({})
  const [aktivesLoch, setAktivesLoch] = useState(1)
  const [laden, setLaden] = useState(true)
  const [gespeichert, setGespeichert] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'turniere', id), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setTurnier(data)
        setScores(data.scores || {})
      }
      setLaden(false)
    })
    return unsub
  }, [id])

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Nicht gefunden</h3></div></div>

  const platz = COURSES.find(c => c.id === turnier.platzId)
  const loch = platz?.holes[aktivesLoch - 1]
  const uid = auth.currentUser?.uid

  function getScore(spielerUid, lochNr) {
    return scores?.[spielerUid]?.[lochNr] || ''
  }

  async function scoreSetzen(spielerUid, lochNr, wert) {
    const neueScores = {
      ...scores,
      [spielerUid]: {
        ...(scores[spielerUid] || {}),
        [lochNr]: wert === '' ? null : parseInt(wert)
      }
    }
    setScores(neueScores)
    await updateDoc(doc(db, 'turniere', id), { scores: neueScores })
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 1000)
  }

  function stablefordPunkte(schlaege, par, hcp, spielerHcp) {
    if (!schlaege || !par) return null
    const vorgabe = spielerHcp ? Math.round(spielerHcp * hcp / 18) : 0
    const netto = schlaege - vorgabe
    const diff = par - netto
    if (diff <= -2) return 0
    if (diff === -1) return 1
    if (diff === 0) return 2
    if (diff === 1) return 3
    if (diff === 2) return 4
    return 5
  }

  function scoreKlasse(schlaege, par) {
    if (!schlaege || !par) return ''
    const diff = schlaege - par
    if (diff <= -2) return 'score-eagle'
    if (diff === -1) return 'score-birdie'
    if (diff === 0) return 'score-par'
    if (diff === 1) return 'score-bogey'
    return 'score-double'
  }

  return (
    <div className="page">
      <PageHeader titel={`Loch ${aktivesLoch} / 18`} zurueck={`/turnier/${id}`} />

      {loch && (
        <div className="scoring-loch-info">
          <div className="scoring-loch-nr">{aktivesLoch}</div>
          <div className="scoring-loch-details">
            <div className="scoring-par">Par {loch.par}</div>
            <div className="scoring-meta">HCP {loch.hcp} · {loch.distanz}m</div>
          </div>
          {gespeichert && <div className="scoring-saved">✓</div>}
        </div>
      )}

      <div style={{padding: '0 16px'}}>
        {turnier.spieler?.map(spieler => {
          const s = getScore(spieler.uid, aktivesLoch)
          const punkte = loch ? stablefordPunkte(s, loch.par, loch.hcp, spieler.hcp) : null
          const klasse = loch ? scoreKlasse(s, loch.par) : ''

          return (
            <div key={spieler.uid} className="scoring-row">
              <div className="scoring-spieler">
                <div className="scoring-avatar">{spieler.name?.[0]?.toUpperCase()}</div>
                <div className="scoring-name">{spieler.name}</div>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                {turnier.format === 'stableford' && punkte !== null && (
                  <div className={`scoring-punkte ${klasse}`}>{punkte} Pkt</div>
                )}
                <div className="scoring-input-wrap">
                  <button className="scoring-btn" onClick={() => {
                    const neu = Math.max(1, (parseInt(s) || 0) - 1)
                    scoreSetzen(spieler.uid, aktivesLoch, neu)
                  }}>−</button>
                  <div className={`scoring-zahl ${klasse}`}>{s || '—'}</div>
                  <button className="scoring-btn" onClick={() => {
                    const neu = (parseInt(s) || 0) + 1
                    scoreSetzen(spieler.uid, aktivesLoch, neu)
                  }}>+</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="scoring-nav">
        <button className="scoring-nav-btn" onClick={() => setAktivesLoch(Math.max(1, aktivesLoch - 1))}
          disabled={aktivesLoch === 1}>‹ Zurück</button>
        <div className="scoring-dots">
          {Array.from({length: 18}, (_, i) => (
            <div key={i} className={`scoring-dot ${i + 1 === aktivesLoch ? 'active' : ''} ${
              turnier.spieler?.some(s => getScore(s.uid, i + 1)) ? 'done' : ''
            }`} onClick={() => setAktivesLoch(i + 1)} />
          ))}
        </div>
        <button className="scoring-nav-btn"
          onClick={() => aktivesLoch === 18 ? navigate(`/turnier/${id}/ergebnis`) : setAktivesLoch(aktivesLoch + 1)}>
          {aktivesLoch === 18 ? 'Fertig ✓' : 'Weiter ›'}
        </button>
      </div>
    </div>
  )
}