import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

const OESTERREICHER = [
  { value: '', label: 'Spieler auswählen...' },
  { value: 'n.a.', label: 'N/A — kein Österreicher qualifiziert' },
  { value: 'Straka', label: 'Sepp Straka' },
  { value: 'Wiesberger', label: 'Bernd Wiesberger' },
  { value: 'Schwab', label: 'Matthias Schwab' },
  { value: 'Kiefer', label: 'Lukas Kiefer' },
  { value: 'custom', label: 'Anderer Spieler...' },
]

export default function TurnierBearbeiten() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [laden, setLaden] = useState(true)
  const [speichern, setSpeichern] = useState(false)
  const [fehler, setFehler] = useState('')

  const [name, setName] = useState('')
  const [datum, setDatum] = useState('')
  const [platzId, setPlatzId] = useState('')
  const [format, setFormat] = useState('stableford')
  const [sichtbarkeit, setSichtbarkeit] = useState('oeffentlich')
  const [mitPlatzvorgabe, setMitPlatzvorgabe] = useState(true)
  const [einsatz, setEinsatz] = useState('1')
  const [oesterreicher, setOesterreicher] = useState('')
  const [oesterreicherCustom, setOesterreicherCustom] = useState('')
  const [openWetteEinsatz, setOpenWetteEinsatz] = useState('10')
  const [tage, setTage] = useState([])

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'turniere', id))
      if (snap.exists()) {
        const d = { id: snap.id, ...snap.data() }
        setTurnier(d)
        setName(d.name || '')
        setDatum(d.datum || '')
        setPlatzId(d.platzId || '')
        setFormat(d.format || 'stableford')
        setSichtbarkeit(d.sichtbarkeit || 'oeffentlich')
        setMitPlatzvorgabe(d.mitPlatzvorgabe !== false)
        setEinsatz(String(d.einsatz || 1))
        setOesterreicher(d.oesterreicher || '')
        setOpenWetteEinsatz(String(d.openWetteEinsatz || 10))
        setTage(d.tage || [])
      }
      setLaden(false)
    }
    load()
  }, [id])

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Nicht gefunden</h3></div></div>
  if (turnier.erstelltVon !== auth.currentUser?.uid) {
    return <div className="page"><div className="empty-state"><h3>Keine Berechtigung</h3></div></div>
  }

  const istOpenReise = turnier.typ === 'open_reise'
  const hatLG = turnier.typ === 'turnier_lg' || turnier.typ === 'open_reise'

  function tagAktualisieren(index, feld, wert) {
    const neu = [...tage]
    neu[index][feld] = wert
    setTage(neu)
  }

  function tagHinzufuegen() {
    setTage([...tage, { datum: '', platzId: '', format: 'stableford' }])
  }

  function tagEntfernen(index) {
    setTage(tage.filter((_, i) => i !== index))
  }

  async function aktualisieren() {
    if (!name) { setFehler('Bitte einen Namen eingeben.'); return }
    setSpeichern(true)
    setFehler('')
    try {
      const platz = COURSES.find(c => c.id === platzId)
      const oesterreicherFinal = oesterreicher === 'custom' ? oesterreicherCustom : oesterreicher
      const data = {
        name,
        sichtbarkeit,
        mitPlatzvorgabe,
        einsatz: parseInt(einsatz) || 1,
      }
      if (!istOpenReise) {
        data.datum = datum
        data.platzId = platzId
        data.platzName = platz?.name || turnier.platzName
        data.format = format
      } else {
        data.tage = tage
        data.oesterreicher = oesterreicherFinal
        data.openWetteEinsatz = parseInt(openWetteEinsatz) || 10
      }
      await updateDoc(doc(db, 'turniere', id), data)
      navigate(`/turnier/${id}`)
    } catch (e) {
      setFehler('Fehler: ' + e.message)
    }
    setSpeichern(false)
  }

  return (
    <div className="page">
      <PageHeader titel="Turnier bearbeiten" zurueck={`/turnier/${id}`} />
      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'}}>

        <div className="input-group">
          <label className="input-label">Turniername *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="z.B. GreenCap Summer Open" />
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          <div style={{fontWeight: 600, fontSize: 15}}>Sichtbarkeit</div>
          <div style={{display: 'flex', gap: 8}}>
            <div className={`sicht-btn ${sichtbarkeit === 'oeffentlich' ? 'aktiv' : ''}`}
              onClick={() => setSichtbarkeit('oeffentlich')}>
              <div style={{fontSize: 20}}>🌐</div>
              <div style={{fontWeight: 600, fontSize: 13}}>Öffentlich</div>
              <div style={{fontSize: 11, color: 'var(--text-muted)'}}>Alle User sehen es</div>
            </div>
            <div className={`sicht-btn ${sichtbarkeit === 'privat' ? 'aktiv' : ''}`}
              onClick={() => setSichtbarkeit('privat')}>
              <div style={{fontSize: 20}}>🔒</div>
              <div style={{fontWeight: 600, fontSize: 13}}>Privat</div>
              <div style={{fontSize: 11, color: 'var(--text-muted)'}}>Nur per Link</div>
            </div>
          </div>
        </div>

        {!istOpenReise && (
          <>
            <div className="input-group">
              <label className="input-label">Datum</label>
              <input className="input" type="date" value={datum}
                onChange={e => setDatum(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Golfplatz</label>
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
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  <div style={{fontWeight: 600, fontSize: 15}}>Mit Platzvorgabe</div>
                  <div style={{fontSize: 13, color: 'var(--text-muted)', marginTop: 2}}>
                    {mitPlatzvorgabe ? 'WHI × Slope/CR' : 'Nur WHI'}
                  </div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={mitPlatzvorgabe}
                    onChange={e => setMitPlatzvorgabe(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </>
        )}

        {istOpenReise && (
          <>
            <div style={{fontWeight: 600, fontSize: 15}}>Spieltage</div>
            {tage.map((tag, i) => (
              <div key={i} className="card" style={{gap: 10, display: 'flex', flexDirection: 'column'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{fontWeight: 600}}>Tag {i + 1}</div>
                  {tage.length > 1 && (
                    <button className="btn-ghost"
                      style={{width: 'auto', color: 'var(--danger)', fontSize: 13}}
                      onClick={() => tagEntfernen(i)}>Entfernen</button>
                  )}
                </div>
                <input className="input" type="date" value={tag.datum}
                  onChange={e => tagAktualisieren(i, 'datum', e.target.value)} />
                <select className="input" value={tag.platzId}
                  onChange={e => tagAktualisieren(i, 'platzId', e.target.value)}>
                  <option value="">Platz auswählen...</option>
                  {COURSES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ))}
            <button className="btn-secondary" onClick={tagHinzufuegen}>
              + Tag hinzufügen
            </button>

            <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div style={{fontWeight: 600, fontSize: 15}}>🎰 Open Wette</div>
              <div className="input-group" style={{marginBottom: 0}}>
                <label className="input-label">Österreichischer Spieler</label>
                <select className="input" value={oesterreicher}
                  onChange={e => setOesterreicher(e.target.value)}>
                  {OESTERREICHER.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {oesterreicher === 'custom' && (
                  <input className="input" style={{marginTop: 8}}
                    placeholder="Name des Spielers"
                    value={oesterreicherCustom}
                    onChange={e => setOesterreicherCustom(e.target.value)} />
                )}
              </div>
              <div className="input-group" style={{marginBottom: 0}}>
                <label className="input-label">Wett-Einsatz pro Tag & Spieler</label>
                <select className="input" value={openWetteEinsatz}
                  onChange={e => setOpenWetteEinsatz(e.target.value)}>
                  <option value="5">5 € pro Spieler</option>
                  <option value="10">10 € pro Spieler</option>
                  <option value="20">20 € pro Spieler</option>
                </select>
              </div>
            </div>
          </>
        )}

        {hatLG && (
          <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            <div style={{fontWeight: 600, fontSize: 15}}>🎲 Loyal & Gambling</div>
            <div className="input-group" style={{marginBottom: 0}}>
              <label className="input-label">Einsatz pro Punkt</label>
              <select className="input" value={einsatz} onChange={e => setEinsatz(e.target.value)}>
                <option value="1">1 € pro Punkt</option>
                <option value="2">2 € pro Punkt</option>
                <option value="5">5 € pro Punkt</option>
              </select>
            </div>
          </div>
        )}

        {fehler && <div className="fehler">{fehler}</div>}

        <button className="btn-primary" onClick={aktualisieren} disabled={speichern}>
          {speichern ? 'Wird gespeichert...' : '✓ Änderungen speichern'}
        </button>

        <button className="btn-secondary" onClick={() => navigate(`/turnier/${id}`)}>
          Abbrechen
        </button>

      </div>
    </div>
  )
}