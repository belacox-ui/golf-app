import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

export default function RundeBearbeiten() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [datum, setDatum] = useState('')
  const [platzId, setPlatzId] = useState('')
  const [format, setFormat] = useState('stableford')
  const [mitPlatzvorgabe, setMitPlatzvorgabe] = useState(true)
  const [sichtbarkeit, setSichtbarkeit] = useState('privat')
  const [spieler, setSpieler] = useState([])
  const [freunde, setFreunde] = useState([])
  const [laden, setLaden] = useState(false)
  const [seiteLaden, setSeiteLaden] = useState(true)
  const [fehler, setFehler] = useState('')
  const [gastName, setGastName] = useState('')
  const [gastWhi, setGastWhi] = useState('')
  const [gastFormOffen, setGastFormOffen] = useState(false)

  useEffect(() => {
    async function load() {
      // Runde laden
      const rundeSnap = await getDoc(doc(db, 'runden', id))
      if (!rundeSnap.exists()) { navigate('/meine-runden'); return }
      const r = rundeSnap.data()

      // Berechtigung prüfen
      if (r.erstelltVon !== auth.currentUser.uid) {
        setFehler('Du darfst diese Runde nicht bearbeiten.')
        setSeiteLaden(false)
        return
      }

      setDatum(r.datum || '')
      setPlatzId(r.platzId || '')
      setFormat(r.format || 'stableford')
      setMitPlatzvorgabe(r.mitPlatzvorgabe !== false)
      setSichtbarkeit(r.sichtbarkeit || 'privat')
      setSpieler(r.spieler || [])

      // Freundesliste für "Spieler hinzufügen" laden
      const spielerSnap = await getDoc(doc(db, 'spieler', auth.currentUser.uid))
      if (spielerSnap.exists()) {
        setFreunde(spielerSnap.data().freunde || [])
      }

      setSeiteLaden(false)
    }
    load()
  }, [id])

  function freundHinzufuegen(freund) {
    if (spieler.length >= 4) return
    if (spieler.some(s => s.name === (freund.spitzname || freund.name))) return
    setSpieler([...spieler, {
      id: 'freund_' + freund.id,
      name: freund.spitzname || freund.name,
      hcp: freund.whi || 0,
      istGast: false,
      istFreund: true
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

  function spielerEntfernen(id) {
    setSpieler(spieler.filter(s => s.id !== id))
  }

  async function speichern() {
    if (!platzId) { setFehler('Bitte einen Platz auswählen.'); return }
    setLaden(true)
    setFehler('')
    try {
      const platz = COURSES.find(c => c.id === platzId)
      await updateDoc(doc(db, 'runden', id), {
        datum,
        platzId,
        platzName: platz?.name,
        format,
        mitPlatzvorgabe,
        sichtbarkeit,
        spieler
      })
      navigate(`/runde/${id}`)
    } catch (e) {
      setFehler('Fehler: ' + e.message)
    }
    setLaden(false)
  }

  if (seiteLaden) return (
    <div className="page">
      <PageHeader titel="Runde bearbeiten" zurueck={`/runde/${id}`} />
      <div className="empty-state"><p>Lädt...</p></div>
    </div>
  )

  if (fehler && spieler.length === 0) return (
    <div className="page">
      <PageHeader titel="Runde bearbeiten" zurueck={`/runde/${id}`} />
      <div className="fehler" style={{ margin: 16 }}>{fehler}</div>
    </div>
  )

  const verfuegbareFreunde = freunde.filter(f =>
    !spieler.some(s => s.name === (f.spitzname || f.name))
  )

  return (
    <div className="page">
      <PageHeader titel="Runde bearbeiten" zurueck={`/runde/${id}`} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div className="input-group">
          <label className="input-label">Datum</label>
          <input className="input" type="date" value={datum}
            onChange={e => setDatum(e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Golfplatz *</label>
          <select className="input" value={platzId} onChange={e => setPlatzId(e.target.value)}>
            <option value="">Platz auswählen...</option>
            {COURSES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Spielformat</label>
          <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
            <option value="stableford">Stableford</option>
            <option value="strokeplay">Strokeplay</option>
            <option value="scramble">Scramble</option>
          </select>
        </div>

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

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            Spieler ({spieler.length}/4)
          </div>

          {spieler.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid var(--border-light)'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: s.istIch ? 'var(--primary)' : s.istGast ? 'var(--text-muted)' : 'var(--primary-light)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0
              }}>
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{s.name} {s.istIch ? '(ich)' : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>WHI {s.hcp}</div>
              </div>
              {!s.istIch && (
                <button onClick={() => spielerEntfernen(s.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-light)', fontSize: 20
                  }}>x</button>
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
                          border: '1.5px solid var(--primary)',
                          background: 'white', color: 'var(--primary)',
                          fontSize: 13, fontWeight: 500, cursor: 'pointer'
                        }}>
                        + {f.spitzname || f.name}
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

        <button className="btn-primary" onClick={speichern} disabled={laden || !platzId}>
          {laden ? 'Wird gespeichert...' : '✓ Änderungen speichern'}
        </button>

        <button className="btn-secondary" onClick={() => navigate(`/runde/${id}`)}>
          Abbrechen
        </button>

      </div>
    </div>
  )
}