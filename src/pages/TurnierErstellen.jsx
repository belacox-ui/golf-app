import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

const TURNIERTYPEN = [
  { id: 'standard', label: 'Standard Turnier', icon: '🏆', beschreibung: 'Rangliste, Einladungen, Brutto/Netto Wertung' },
  { id: 'turnier_lg', label: 'Turnier + L&G', icon: '🎲', beschreibung: 'Turnier mit Loyal & Gambling Wertung' },
  { id: 'open_reise', label: 'Open Reise', icon: '✈️', beschreibung: 'Mehrtägiges Turnier mit L&G und Open Wette' }
]

const OESTERREICHER = [
  { value: '', label: 'Spieler auswählen...' },
  { value: 'n.a.', label: 'N/A — kein Österreicher qualifiziert' },
  { value: 'Straka', label: 'Sepp Straka' },
  { value: 'Wiesberger', label: 'Bernd Wiesberger' },
  { value: 'Schwab', label: 'Matthias Schwab' },
  { value: 'Kiefer', label: 'Lukas Kiefer' },
  { value: 'custom', label: 'Anderer Spieler...' },
]

export default function TurnierErstellen() {
  const navigate = useNavigate()
  const [schritt, setSchritt] = useState(1)
  const [typ, setTyp] = useState('')
  const [name, setName] = useState('')
  const [format, setFormat] = useState('stableford')
  const [mitPlatzvorgabe, setMitPlatzvorgabe] = useState(true)
  const [sichtbarkeit, setSichtbarkeit] = useState('oeffentlich')
  const [einsatz, setEinsatz] = useState('1')
  const [openWetteEinsatz, setOpenWetteEinsatz] = useState('10')
  const [oesterreicher, setOesterreicher] = useState('')
  const [oesterreicherCustom, setOesterreicherCustom] = useState('')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  // Alle Turniertypen haben Spieltage — mindestens einer
  const [spieltage, setSpieltage] = useState([{ datum: '', platzId: '' }])

  const hatLG = typ === 'turnier_lg' || typ === 'open_reise'
  const istOpenReise = typ === 'open_reise'
  const mehrtagig = spieltage.length > 1

  function spieltagHinzufuegen() {
    setSpieltage([...spieltage, { datum: '', platzId: '' }])
  }

  function spieltagAktualisieren(index, feld, wert) {
    const neu = [...spieltage]
    neu[index][feld] = wert
    setSpieltage(neu)
  }

  function spieltagEntfernen(index) {
    if (spieltage.length <= 1) return
    setSpieltage(spieltage.filter((_, i) => i !== index))
  }

  async function erstellen() {
    if (!name) { setFehler('Bitte einen Namen eingeben.'); return }
    if (spieltage.some(t => !t.datum || !t.platzId)) {
      setFehler('Bitte alle Spieltage mit Datum und Platz ausfüllen.'); return
    }
    if (istOpenReise && !oesterreicher) {
      setFehler('Bitte einen österreichischen Spieler auswählen.'); return
    }

    setLaden(true)
    setFehler('')

    try {
      const oesterreicherFinal = oesterreicher === 'custom' ? oesterreicherCustom : oesterreicher

      // Spieltage mit Platznamen anreichern
      const spieltageMitName = spieltage.map(t => ({
        ...t,
        platzName: COURSES.find(c => c.id === t.platzId)?.name || ''
      }))

      const data = {
        name,
        typ,
        format: istOpenReise ? 'stableford' : format,
        mitPlatzvorgabe,
        sichtbarkeit,
        loyalGambling: hatLG,
        einsatz: hatLG ? parseInt(einsatz) : 0,
        openWette: istOpenReise,
        openWetteEinsatz: istOpenReise ? parseInt(openWetteEinsatz) : 0,
        oesterreicher: oesterreicherFinal || null,
        erstelltVon: auth.currentUser.uid,
        erstelltVonName: auth.currentUser.displayName || auth.currentUser.email,
        erstelltAm: serverTimestamp(),
        status: 'offen',
        // Spieltage als Organisationsebene — Flights/Runden hängen dran
        spieltage: spieltageMitName,
        // Kein scores-Objekt mehr — Scores leben in der runden Collection
        spieler: [{
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || auth.currentUser.email,
          hcp: 0,
          lgOptIn: false,
          istGast: false
        }]
      }

      const ref = await addDoc(collection(db, 'turniere'), data)
      navigate(`/turnier/${ref.id}`)
    } catch (e) {
      setFehler('Fehler: ' + e.message)
    }
    setLaden(false)
  }

  return (
    <div className="page">
      <PageHeader titel="Turnier erstellen" zurueck="/turniere" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* SCHRITT 1 — Turniertyp */}
        {schritt === 1 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              Welche Art von Turnier?
            </div>
            {TURNIERTYPEN.map(t => (
              <div key={t.id}
                className={`typ-karte ${typ === t.id ? 'aktiv' : ''}`}
                onClick={() => setTyp(t.id)}>
                <div className="typ-icon">{t.icon}</div>
                <div className="typ-body">
                  <div className="typ-label">{t.label}</div>
                  <div className="typ-beschreibung">{t.beschreibung}</div>
                </div>
                <div className={`typ-check ${typ === t.id ? 'aktiv' : ''}`}>
                  {typ === t.id ? '✓' : ''}
                </div>
              </div>
            ))}
            <button className="btn-primary" disabled={!typ} onClick={() => setSchritt(2)}>
              Weiter →
            </button>
          </>
        )}

        {/* SCHRITT 2 — Details */}
        {schritt === 2 && (
          <>
            {/* Name */}
            <div className="input-group">
              <label className="input-label">Turniername *</label>
              <input className="input" placeholder="z.B. GreenCap Summer Open"
                value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* Sichtbarkeit */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Sichtbarkeit</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className={`sicht-btn ${sichtbarkeit === 'oeffentlich' ? 'aktiv' : ''}`}
                  onClick={() => setSichtbarkeit('oeffentlich')}>
                  <div style={{ fontSize: 20 }}>🌐</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Öffentlich</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Alle User sehen es</div>
                </div>
                <div className={`sicht-btn ${sichtbarkeit === 'privat' ? 'aktiv' : ''}`}
                  onClick={() => setSichtbarkeit('privat')}>
                  <div style={{ fontSize: 20 }}>🔒</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Privat</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nur per Link</div>
                </div>
              </div>
            </div>

            {/* Format + Platzvorgabe */}
            {!istOpenReise && (
              <>
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
                        {mitPlatzvorgabe ? 'WHI × Slope/CR berechnet' : 'Nur WHI als Vorgabe'}
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

            {/* Spieltage — für ALLE Turniertypen */}
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              Spieltage {spieltage.length > 1 ? `(${spieltage.length} Tage)` : ''}
            </div>

            {spieltage.map((tag, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {spieltage.length > 1 ? `Tag ${i + 1}` : 'Datum & Platz'}
                  </div>
                  {spieltage.length > 1 && (
                    <button
                      onClick={() => spieltagEntfernen(i)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      Entfernen
                    </button>
                  )}
                </div>
                <input className="input" type="date" value={tag.datum}
                  onChange={e => spieltagAktualisieren(i, 'datum', e.target.value)} />
                <select className="input" value={tag.platzId}
                  onChange={e => spieltagAktualisieren(i, 'platzId', e.target.value)}>
                  <option value="">Platz auswählen...</option>
                  {COURSES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ))}

            <button className="btn-secondary" onClick={spieltagHinzufuegen}>
              + Weiteren Spieltag hinzufügen
            </button>

            {/* L&G Einstellungen */}
            {hatLG && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>🎲 Loyal & Gambling</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Cut = Tagesdurchschnitt aller Opt-in Spieler. Differenz × Einsatz × Anzahl Spieler. 50% Auszahlung, 50% Charity.
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Einsatz pro Punkt</label>
                  <select className="input" value={einsatz} onChange={e => setEinsatz(e.target.value)}>
                    <option value="1">1 € pro Punkt</option>
                    <option value="2">2 € pro Punkt</option>
                    <option value="5">5 € pro Punkt</option>
                  </select>
                </div>
              </div>
            )}

            {/* Open Wette */}
            {istOpenReise && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>🎰 Open Wette</div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Österreichischer Spieler</label>
                  <select className="input" value={oesterreicher}
                    onChange={e => setOesterreicher(e.target.value)}>
                    {OESTERREICHER.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {oesterreicher === 'custom' && (
                    <input className="input" style={{ marginTop: 8 }}
                      placeholder="Name des Spielers"
                      value={oesterreicherCustom}
                      onChange={e => setOesterreicherCustom(e.target.value)} />
                  )}
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Wett-Einsatz pro Tag & Spieler</label>
                  <select className="input" value={openWetteEinsatz}
                    onChange={e => setOpenWetteEinsatz(e.target.value)}>
                    <option value="5">5 € pro Spieler</option>
                    <option value="10">10 € pro Spieler</option>
                    <option value="20">20 € pro Spieler</option>
                  </select>
                </div>
              </div>
            )}

            {fehler && <div className="fehler">{fehler}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ width: 'auto', padding: '13px 20px' }}
                onClick={() => setSchritt(1)}>← Zurück</button>
              <button className="btn-primary" onClick={erstellen} disabled={laden}>
                {laden ? 'Wird erstellt...' : 'Turnier erstellen'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}