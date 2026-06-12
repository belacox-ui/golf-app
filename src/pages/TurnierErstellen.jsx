import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

export default function TurnierErstellen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [datum, setDatum] = useState('')
  const [platzId, setPlatzId] = useState('')
  const [format, setFormat] = useState('stableford')
  const [loyalGambling, setLoyalGambling] = useState(false)
  const [einsatz, setEinsatz] = useState('1')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  async function erstellen() {
    if (!name || !datum || !platzId) {
      setFehler('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    setLaden(true)
    setFehler('')
    try {
      const platz = COURSES.find(c => c.id === platzId)
      const ref = await addDoc(collection(db, 'turniere'), {
        name,
        datum,
        platzId,
        platzName: platz?.name,
        format,
        loyalGambling,
        einsatz: loyalGambling ? parseInt(einsatz) : 0,
        erstelltVon: auth.currentUser.uid,
        erstelltVonName: auth.currentUser.displayName || auth.currentUser.email,
        erstelltAm: serverTimestamp(),
        status: 'offen',
        spieler: [{
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || auth.currentUser.email,
          lgOptIn: false
        }]
      })
      navigate(`/turnier/${ref.id}`)
    } catch (e) {
      setFehler('Fehler beim Erstellen: ' + e.message)
    }
    setLaden(false)
  }

  return (
    <div className="page">
      <PageHeader titel="Turnier erstellen" zurueck="/turniere" />
      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'}}>

        <div className="input-group">
          <label className="input-label">Turniername *</label>
          <input className="input" placeholder="z.B. GreenCap Summer Open"
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Datum *</label>
          <input className="input" type="date"
            value={datum} onChange={e => setDatum(e.target.value)} />
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
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: loyalGambling ? 16 : 0}}>
            <div>
              <div style={{fontWeight: 600, fontSize: 15}}>Loyal & Gambling</div>
              <div style={{fontSize: 13, color: 'var(--text-muted)', marginTop: 2}}>
                Wettmodus aktivieren
              </div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={loyalGambling}
                onChange={e => setLoyalGambling(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          {loyalGambling && (
            <div className="input-group" style={{marginBottom: 0}}>
              <label className="input-label">Einsatz pro Spieler</label>
              <select className="input" value={einsatz} onChange={e => setEinsatz(e.target.value)}>
                <option value="1">1 € pro Spieler</option>
                <option value="2">2 € pro Spieler</option>
                <option value="5">5 € pro Spieler</option>
                <option value="10">10 € pro Spieler</option>
              </select>
            </div>
          )}
        </div>

        {fehler && <div className="fehler">{fehler}</div>}

        <button className="btn-primary" onClick={erstellen} disabled={laden}>
          {laden ? 'Wird erstellt...' : 'Turnier erstellen'}
        </button>
      </div>
    </div>
  )
}