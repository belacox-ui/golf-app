import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

function platzvorgabe(whi, slope, cr, par) {
  if (!whi) return 0
  return Math.round(whi * (slope / 113) + (cr - par))
}

function vorgabeAufLoch(pv, lochHcp) {
  if (pv <= 0) return 0
  const basis = Math.floor(pv / 18)
  const rest = pv % 18
  return basis + (lochHcp <= rest ? 1 : 0)
}

function stablefordPunkte(schlaege, par, vorgabe) {
  if (!schlaege) return null
  const netto = schlaege - vorgabe
  const diff = par - netto
  if (diff <= -2) return 0
  if (diff === -1) return 1
  if (diff === 0) return 2
  if (diff === 1) return 3
  if (diff === 2) return 4
  return 5
}

function scoreLabel(n, par) {
  const diff = n - par
  if (n === 1) return 'In One'
  if (diff <= -2) return 'Eagle+'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return '2 Bogey'
  if (diff === 3) return '3 Bogey'
  if (diff === 4) return '4 Bogey'
  return `+${diff}`
}

function getScoreKlasse(schlaege, par) {
  if (!schlaege) return 'none'
  const diff = schlaege - par
  if (diff <= -2) return 'eagle'
  if (diff === -1) return 'birdie'
  if (diff === 0) return 'par'
  if (diff === 1) return 'bogey'
  if (diff === 2) return 'double'
  return 'triple'
}

const SCORE_STYLE = {
  eagle:  { bg: '#f59e0b', color: 'white' },
  birdie: { bg: '#ef4444', color: 'white' },
  par:    { bg: '#3b82f6', color: 'white' },
  bogey:  { bg: '#22c55e', color: 'white' },
  double: { bg: '#6b7280', color: 'white' },
  triple: { bg: '#1f2937', color: 'white' },
  none:   { bg: 'var(--border-light)', color: 'var(--text-muted)' }
}

export default function LiveScoring() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [laden, setLaden] = useState(true)
  const [ansicht, setAnsicht] = useState('uebersicht')
  const [aktivesLoch, setAktivesLoch] = useState(1)
  const [scores, setScores] = useState({})
  const [gastFormOffen, setGastFormOffen] = useState(false)
  const [gastName, setGastName] = useState('')
  const [gastWhi, setGastWhi] = useState('')

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

  async function scoreSetzen(spielerUid, lochNr, wert) {
    const neueScores = {
      ...scores,
      [spielerUid]: { ...(scores[spielerUid] || {}), [lochNr]: wert || null }
    }
    setScores(neueScores)
    await updateDoc(doc(db, 'turniere', id), { scores: neueScores })
  }

  async function gastHinzufuegen() {
    if (!gastName) return
    const gastId = 'gast_' + Date.now()
    const neueSpieler = [...(turnier.spieler || []), {
      uid: gastId, name: gastName,
      hcp: parseFloat(gastWhi) || 0,
      lgOptIn: false, istGast: true
    }]
    await updateDoc(doc(db, 'turniere', id), { spieler: neueSpieler })
    setGastName(''); setGastWhi(''); setGastFormOffen(false)
  }

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Nicht gefunden</h3></div></div>

  const platz = COURSES.find(c => c.id === turnier.platzId)
  const istStableford = turnier.format === 'stableford'

  function getSpielerPV(spieler) {
    if (turnier.mitPlatzvorgabe && platz) {
      return platzvorgabe(spieler.hcp, platz.sr_herren, platz.cr_herren, platz.par)
    }
    return Math.round(spieler.hcp || 0)
  }

  // SCORE OPTIONEN — immer 1 bis 24
  const scoreOptionen = Array.from({ length: 24 }, (_, i) => i + 1)

  // =====================
  // LOCHÜBERSICHT
  // =====================
  if (ansicht === 'uebersicht') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="page-header-back" onClick={() => navigate(`/turnier/${id}`)}>‹</button>
          <h1>{turnier.name}</h1>
          <button style={{background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--primary)', fontWeight: 600, width: 40}}
            onClick={() => setAnsicht('scorecard')}>Card</button>
        </div>

        {platz && (
          <div style={{padding: '8px 16px', background: 'var(--border-light)',
            fontSize: 13, color: 'var(--text-muted)', textAlign: 'center'}}>
            {platz.name} · Par {platz.par} · CR {platz.cr_herren} / Slope {platz.sr_herren}
          </div>
        )}

        <div style={{padding: '12px 16px 0'}}>
          {!gastFormOffen ? (
            <button className="btn-secondary"
              style={{fontSize: 13, padding: '8px 14px', width: 'auto'}}
              onClick={() => setGastFormOffen(true)}>+ Gast hinzufügen</button>
          ) : (
            <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <div style={{fontWeight: 600}}>Gast hinzufügen</div>
              <input className="input" placeholder="Name *" value={gastName}
                onChange={e => setGastName(e.target.value)} />
              <input className="input" placeholder="WHI (z.B. 18.4)" type="number"
                step="0.1" value={gastWhi} onChange={e => setGastWhi(e.target.value)} />
              <div style={{display: 'flex', gap: 8}}>
                <button className="btn-secondary" onClick={() => setGastFormOffen(false)}>Abbrechen</button>
                <button className="btn-primary" onClick={gastHinzufuegen} disabled={!gastName}>Hinzufügen</button>
              </div>
            </div>
          )}
        </div>

        <div style={{padding: '12px 16px'}}>
          {platz ? platz.holes.map(loch => {
            const alleScores = turnier.spieler?.map(s => scores[s.uid]?.[loch.nr])
            const alleEingetragen = alleScores?.every(s => s)
            const einerEingetragen = alleScores?.some(s => s)

            return (
              <div key={loch.nr} className="scoring-loch-zeile"
                onClick={() => { setAktivesLoch(loch.nr); setAnsicht('loch') }}>
                <div className={`scoring-loch-nr-klein ${alleEingetragen ? 'done' : einerEingetragen ? 'partial' : ''}`}>
                  {loch.nr}
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 14, fontWeight: 600, color: 'var(--primary)'}}>
                    Par {loch.par}, {loch.distanz}m, {loch.hcp}H
                  </div>
                  <div style={{display: 'flex', gap: 6, marginTop: 4}}>
                    {turnier.spieler?.map(s => {
                      const sc = scores[s.uid]?.[loch.nr]
                      const klasse = getScoreKlasse(sc, loch.par)
                      const stil = SCORE_STYLE[klasse]
                      return (
                        <div key={s.uid} style={{
                          width: 24, height: 24, borderRadius: 4,
                          background: stil.bg, color: stil.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700
                        }}>
                          {sc || '—'}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <span style={{color: 'var(--text-light)'}}>›</span>
              </div>
            )
          }) : <div className="empty-state"><p>Platzdaten nicht gefunden</p></div>}
        </div>

        {platz && (
          <div className="card" style={{margin: '0 16px 100px'}}>
            <div style={{fontWeight: 600, marginBottom: 10}}>Gesamtstand</div>
            {turnier.spieler?.map(s => {
              const pv = getSpielerPV(s)
              const total = platz.holes.reduce((sum, loch) => {
                const sc = scores[s.uid]?.[loch.nr]
                const lv = vorgabeAufLoch(pv, loch.hcp)
                return sum + (stablefordPunkte(sc, loch.par, lv) || 0)
              }, 0)
              const gespielt = platz.holes.filter(l => scores[s.uid]?.[l.nr]).length
              return (
                <div key={s.uid} style={{display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid var(--border-light)'}}>
                  <div style={{width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700}}>
                    {s.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 500, fontSize: 14}}>{s.name}</div>
                    <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{gespielt}/18 Löcher</div>
                  </div>
                  <div style={{fontSize: 22, fontWeight: 800, color: 'var(--primary)'}}>
                    {total} Pkt
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // =====================
  // SCORECARD
  // =====================
  if (ansicht === 'scorecard') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="page-header-back" onClick={() => setAnsicht('uebersicht')}>‹</button>
          <h1>Scorecard</h1>
          <div style={{width: 40}} />
        </div>
        <div style={{overflowX: 'auto', padding: '16px'}}>
          <table className="score-table" style={{minWidth: 600}}>
            <thead>
              <tr>
                <th>Spieler</th>
                {platz?.holes.map(l => <th key={l.nr}>{l.nr}</th>)}
                <th>OUT</th>
                <th>IN</th>
                <th>TOT</th>
              </tr>
              <tr style={{background: 'var(--border-light)'}}>
                <td style={{fontSize: 11, color: 'var(--text-muted)', padding: '4px 6px'}}>Par</td>
                {platz?.holes.map(l => (
                  <td key={l.nr} style={{fontSize: 11, color: 'var(--text-muted)'}}>{l.par}</td>
                ))}
                <td style={{fontSize: 11, fontWeight: 700}}>
                  {platz?.holes.slice(0,9).reduce((s,l) => s+l.par, 0)}
                </td>
                <td style={{fontSize: 11, fontWeight: 700}}>
                  {platz?.holes.slice(9,18).reduce((s,l) => s+l.par, 0)}
                </td>
                <td style={{fontSize: 11, fontWeight: 700}}>{platz?.par}</td>
              </tr>
            </thead>
            <tbody>
              {turnier.spieler?.map(s => {
                const out = platz?.holes.slice(0,9).reduce((sum,l) => sum+(scores[s.uid]?.[l.nr]||0), 0)
                const inn = platz?.holes.slice(9,18).reduce((sum,l) => sum+(scores[s.uid]?.[l.nr]||0), 0)
                return (
                  <tr key={s.uid}>
                    <td style={{fontWeight: 600, fontSize: 12, textAlign: 'left', padding: '6px 8px'}}>
                      {s.name}
                      <div style={{fontSize: 10, color: 'var(--text-muted)'}}>HCP {s.hcp}</div>
                    </td>
                    {platz?.holes.map(loch => {
                      const sc = scores[s.uid]?.[loch.nr]
                      const klasse = getScoreKlasse(sc, loch.par)
                      const stil = SCORE_STYLE[klasse]
                      return (
                        <td key={loch.nr}
                          onClick={() => { setAktivesLoch(loch.nr); setAnsicht('loch') }}
                          style={{cursor: 'pointer'}}>
                          {sc ? (
                            <div style={{
                              width: 24, height: 24, borderRadius: 4,
                              background: stil.bg, color: stil.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, margin: '0 auto'
                            }}>{sc}</div>
                          ) : '—'}
                        </td>
                      )
                    })}
                    <td style={{fontWeight: 700}}>{out || '—'}</td>
                    <td style={{fontWeight: 700}}>{inn || '—'}</td>
                    <td style={{fontWeight: 700}}>{(out||0)+(inn||0) || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap'}}>
            {[['eagle','Eagle+'],['birdie','Birdie'],['par','Par'],['bogey','Bogey'],['double','Double'],['triple','Triple+']].map(([k,l]) => (
              <div key={k} style={{display: 'flex', alignItems: 'center', gap: 4}}>
                <div style={{width: 16, height: 16, borderRadius: 3, background: SCORE_STYLE[k].bg}} />
                <span style={{fontSize: 11, color: 'var(--text-muted)'}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // =====================
  // LOCH SCORE EINGABE
  // =====================
  const loch = platz?.holes[aktivesLoch - 1]

  return (
    <div className="page">
      <div className="page-header">
        <button className="page-header-back" onClick={() => setAnsicht('uebersicht')}>‹</button>
        <h1>Loch {aktivesLoch}</h1>
        <div style={{width: 40}} />
      </div>

      {loch && (
        <div className="scoring-loch-info">
          <div className="scoring-loch-nr">{aktivesLoch}</div>
          <div className="scoring-loch-details">
            <div className="scoring-par">Par {loch.par}</div>
            <div className="scoring-meta">HCP {loch.hcp} · {loch.distanz}m</div>
          </div>
        </div>
      )}

      <div style={{padding: '12px 16px', paddingBottom: 140}}>
        {turnier.spieler?.map(spieler => {
          const pv = getSpielerPV(spieler)
          const lochVorgabe = loch ? vorgabeAufLoch(pv, loch.hcp) : 0
          const aktuellerScore = scores[spieler.uid]?.[aktivesLoch] || 0
          const punkte = loch && istStableford
            ? stablefordPunkte(aktuellerScore, loch.par, lochVorgabe)
            : null

          return (
            <div key={spieler.uid} className="scoring-spieler-block">
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}}>
                <div style={{width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700}}>
                  {spieler.name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, fontSize: 15}}>{spieler.name}</div>
                  <div style={{fontSize: 12, color: 'var(--text-muted)'}}>
                    Vorgabe: {lochVorgabe} · PV: {pv}
                  </div>
                </div>
                {aktuellerScore > 0 && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 8,
                    fontWeight: 700, fontSize: 14,
                    background: SCORE_STYLE[getScoreKlasse(aktuellerScore, loch?.par)].bg,
                    color: 'white'
                  }}>
                    {aktuellerScore}
                    {punkte !== null ? ` · ${punkte} Pkt` : ''}
                  </div>
                )}
              </div>

              {/* SCORE LISTE 1-24 */}
              <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
                {scoreOptionen.map(n => {
                  const klasse = getScoreKlasse(n, loch?.par)
                  const stil = SCORE_STYLE[klasse]
                  const istAktiv = aktuellerScore === n
                  return (
                    <div key={n}
                      onClick={() => scoreSetzen(spieler.uid, aktivesLoch, n)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '10px 14px', borderRadius: 10,
                        background: istAktiv ? stil.bg : 'var(--border-light)',
                        cursor: 'pointer',
                        border: istAktiv ? 'none' : '1px solid var(--border)',
                        transition: 'all 0.1s',
                      }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, width: 60,
                        color: istAktiv ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)'
                      }}>
                        {loch ? scoreLabel(n, loch.par) : ''}
                      </div>
                      <div style={{
                        fontSize: 28, fontWeight: 800, lineHeight: 1,
                        color: istAktiv ? 'white' : 'var(--text)'
                      }}>
                        {n}
                      </div>
                      {istStableford && loch && (
                        <div style={{
                          marginLeft: 'auto', fontSize: 13, fontWeight: 600,
                          color: istAktiv ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)'
                        }}>
                          {stablefordPunkte(n, loch.par, lochVorgabe)} Pkt
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* NUR BEI STABLEFORD: Nicht gespielt */}
                {istStableford && (
                  <div onClick={() => scoreSetzen(spieler.uid, aktivesLoch, 0)}
                    style={{
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      textAlign: 'center', fontSize: 13,
                      color: aktuellerScore === 0 ? 'var(--danger)' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      background: 'var(--border-light)',
                      marginTop: 4
                    }}>
                    Nicht gespielt / Ball aufheben
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="scoring-loch-nav">
        <button className="scoring-nav-btn"
          onClick={() => aktivesLoch === 1
            ? setAnsicht('uebersicht')
            : setAktivesLoch(aktivesLoch - 1)}>
          {aktivesLoch === 1 ? '≡ Übersicht' : `‹ Loch ${aktivesLoch - 1}`}
        </button>
        <button className="scoring-nav-btn"
          onClick={() => aktivesLoch === 18
            ? navigate(`/turnier/${id}/ergebnis`)
            : setAktivesLoch(aktivesLoch + 1)}>
          {aktivesLoch === 18 ? '✓ Fertig' : `Loch ${aktivesLoch + 1} ›`}
        </button>
      </div>
    </div>
  )
}