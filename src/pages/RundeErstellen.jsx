import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

export default function RundeErstellen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Optionale Turnier-Kontext Parameter (via URL: ?turnierId=X&spieltagId=Y)
  const turnierId = searchParams.get('turnierId') || null
  const spieltagId = searchParams.get('spieltagId') || null
  const istFlight = !!turnierId

  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [platzId, setPlatzId] = useState(searchParams.get('platzId') || '')
  const [format, setFormat] = useState(searchParams.get('format') || 'stableford')
  const [mitPlatzvorgabe, setMitPlatzvorgabe] = useState(true)
  const [sichtbarkeit, setSichtbarkeit] = useState('privat')
  const [spieler, setSpieler] = useState([])
  const [freunde, setFreunde] = useState([])
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [gastName, setGastName] = useState('')
  const [gastWhi, setGastWhi] = useState('')
  const [gastFormOffen, setGastFormOffen] = useState(false)

useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'spieler', auth.currentUser.uid))
      if (snap.exists()) {
        const d = snap.data()
        setFreunde(d.freunde || [])
        const name = `${d.vorname || ''} ${d.nachname || ''}`.trim() || auth.currentUser.email
        
        // Bei Flight: leere Liste, Ersteller muss sich selbst manuell hinzufügen
        // Bei privater Runde: Ersteller automatisch dabei
        if (!turnierId) {
          setSpieler([{
            id: auth.currentUser.uid,
            name,
            hcp: d.whi || 0,
            istGast: false,
            istIch: true
          }])
        } else {
          setSpieler([]) // Flight: leer starten
        }
      } else {
        if (!turnierId) {
          setSpieler([{
            id: auth.currentUser.uid,
            name: auth.currentUser.displayName || auth.currentUser.email,
            hcp: 0,
            istGast: false,
            istIch: true
          }])
        } else {
          setSpieler([])
        }
      }
    }
    load()
  }, [])

  function freundHinzufuegen(freund) {
    if (spieler.length >= 4) return
    if (spieler.some(s => s.name === (freund.spitzname || freund.name))) return
    setSpieler([...spieler, {
      id: freund.uid || ('freund_' + freund.id), // echte uid wenn verfügbar
      name: freund.spitzname || freund.name,
      hcp: freund.whi || 0,
      istGast: false,
      istFreund: true,
      hatAccount: freund.hatAccount || false
    }])
  }

  function gastHinzufuegen() {
    if (!gastName || spieler.length >= 4) return
    setSpieler([...spieler, {
      id: 'gast_' + Date.now(),
      name: gastName,
      hcp: parseFloat(gastWhi) || 0,
      istGast: true
    }])
    setGastName('')
    setGastWhi('')
    setGastFormOffen(false)
  }

  function spielerEntfernen(spielerId) {
    setSpieler(spieler.filter(s => s.id !== spielerId))
  }

  async function rundeStarten() {
    if (spieler.length === 0) { setFehler('Bitte mindestens einen Spieler hinzufügen.'); return }
    if (!platzId) { setFehler('Bitte einen Platz auswählen.'); return }
    setLaden(true)
    setFehler('')
    try {
      const platz = COURSES.find(c => c.id === platzId)

      // Alle Spieler-IDs für schnelle Abfrage (Schritt 4: "wo bin ich Teilnehmer")
      const teilnehmerIds = spieler.map(s => s.id).filter(id => !id.startsWith('gast_'))

      const ref = await addDoc(collection(db, 'runden'), {
        datum,
        platzId,
        platzName: platz?.name,
        format,
        mitPlatzvorgabe,
        sichtbarkeit,
        erstelltVon: auth.currentUser.uid,
        erstelltAm: serverTimestamp(),
        status: 'aktiv',
        spieler,
        scores: {},
        // Turnier-Kontext (null wenn private Runde)
        turnierId,
        spieltagId,
        istFlight,
        turnierName: searchParams.get('turnierName') || null,
        // Für spätere Abfrage "Runden wo ich Teilnehmer bin"
        teilnehmerIds
      })

      // Bei Flight → zurück zum Turnier, sonst zum Scoring
      if (istFlight) {
        navigate(`/turnier/${turnierId}`)
      } else {
        navigate(`/runde/${ref.id}/scoring`)
      }
    } catch (e) {
      setFehler('Fehler: ' + e.message)
    }
    setLaden(false)
  }

  const verfuegbareFreunde = freunde.filter(f =>
    !spieler.some(s => s.name === (f.spitzname || f.name))
  )

  return (
    <div className="page">
      <PageHeader
        titel={istFlight ? 'Flight anlegen' : 'Runde starten'}
        zurueck={istFlight ? `/turnier/${turnierId}` : '/'}
      />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Turnier-Kontext Banner */}
        {istFlight && (
          <div style={{
            background: '#dbeafe', borderRadius: 12, padding: '10px 14px',
            fontSize: 13, color: '#1d4ed8', fontWeight: 600
          }}>
            🏆 Flight für Turnier — Scores fließen ins Leaderboard ein
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Datum</label>
          <input className="input" type="date" value={datum}
            onChange={e => setDatum(e.target.value)} />
        </div>

        {/* Platz nur wählbar wenn keine Vorgabe vom Turnier */}
        <div className="input-group">
          <label className="input-label">Golfplatz *</label>
          <select className="input" value={platzId} onChange={e => setPlatzId(e.target.value)}
            disabled={!!searchParams.get('platzId')}>
            <option value="">Platz auswählen...</option>
            {COURSES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Format nur wählbar wenn keine Vorgabe vom Turnier */}
        {!istFlight && (
          <div className="input-group">
            <label className="input-label">Spielformat</label>
            <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
              <option value="stableford">Stableford</option>
              <option value="strokeplay">Strokeplay</option>
              <option value="scramble">Scramble</option>
            </select>
          </div>
        )}

        {!istFlight && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Mit Platzvorgabe</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {mitPlatzvorgabe ? 'WHI x Slope/CR berechnet' : 'Nur WHI als Vorgabe'}
                </div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={mitPlatzvorgabe}
                  onChange={e => setMitPlatzvorgabe(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        )}

        {!istFlight && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Sichtbarkeit</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className={`sicht-btn ${sichtbarkeit === 'privat' ? 'aktiv' : ''}`}
                onClick={() => setSichtbarkeit('privat')}>
                <div style={{ fontSize: 20 }}>🔒</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Privat</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nur du</div>
              </div>
              <div className={`sicht-btn ${sichtbarkeit === 'oeffentlich' ? 'aktiv' : ''}`}
                onClick={() => setSichtbarkeit('oeffentlich')}>
                <div style={{ fontSize: 20 }}>🌐</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Öffentlich</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Alle sehen es</div>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {istFlight ? 'Spieler im Flight' : 'Spieler'} ({spieler.length}/4)
          </div>

          {spieler.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid var(--border-light)'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: s.istIch ? 'var(--primary)' : s.istGast ? '#9ca3af' : 'var(--primary)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0
              }}>
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>
                  {s.name} {s.istIch ? '(ich)' : ''}
                  {s.hatAccount && !s.istIch && (
                    <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 6 }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>WHI {s.hcp}</div>
              </div>
              {!s.istIch && (
                <button onClick={() => spielerEntfernen(s.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-light)', fontSize: 20
                  }}>×</button>
              )}
            </div>
          ))}

          {spieler.length < 4 && (
            <>
              {verfuegbareFreunde.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', marginBottom: 6,
                    textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em'
                  }}>
                    Freunde hinzufügen
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {verfuegbareFreunde.map(f => (
                      <button key={f.id} onClick={() => freundHinzufuegen(f)}
                        style={{
                          padding: '6px 12px', borderRadius: 20,
                          border: `1.5px solid ${f.hatAccount ? 'var(--primary)' : '#9ca3af'}`,
                          background: 'white',
                          color: f.hatAccount ? 'var(--primary)' : '#6b7280',
                          fontSize: 13, fontWeight: 500, cursor: 'pointer'
                        }}>
                        + {f.spitzname || f.name}
                        {f.hatAccount && <span style={{ fontSize: 10, marginLeft: 4 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!gastFormOffen ? (
                <button className="btn-secondary" style={{ fontSize: 13, padding: '8px' }}
                  onClick={() => setGastFormOffen(true)}>
                  + Gast hinzufügen
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="input" placeholder="Name *" value={gastName}
                    onChange={e => setGastName(e.target.value)} />
                  <input className="input" placeholder="WHI (optional)" type="number"
                    step="0.1" value={gastWhi} onChange={e => setGastWhi(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" onClick={() => setGastFormOffen(false)}>
                      Abbrechen
                    </button>
                    <button className="btn-primary" onClick={gastHinzufuegen} disabled={!gastName}>
                      Hinzufügen
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {fehler && <div className="fehler">{fehler}</div>}

        <button className="btn-primary" onClick={rundeStarten} disabled={laden || !platzId}>
          {laden ? 'Wird gestartet...' : istFlight ? '🏌️ Flight starten' : 'Runde starten'}
        </button>

      </div>
    </div>
  )
}