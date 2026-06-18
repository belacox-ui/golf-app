import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { updateProfile, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { PageHeader } from '../App'

export default function Profil({ nutzer }) {
  const navigate = useNavigate()
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [spitzname, setSpitzname] = useState('')
  const [whi, setWhi] = useState('')
  const [telefon, setTelefon] = useState('')
  const [gespeichert, setGespeichert] = useState(false)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function laden() {
      const snap = await getDoc(doc(db, 'spieler', nutzer.uid))
      if (snap.exists()) {
        const d = snap.data()
        setVorname(d.vorname || '')
        setNachname(d.nachname || '')
        setSpitzname(d.spitzname || '')
        setWhi(d.whi || '')
        setTelefon(d.telefon || '')
      }
      setLaden(false)
    }
    laden()
  }, [nutzer.uid])

  async function speichern() {
    const anzeigeName = `${vorname} ${nachname}`.trim() || nutzer.email
    await updateProfile(auth.currentUser, { displayName: anzeigeName })
    await setDoc(doc(db, 'spieler', nutzer.uid), {
      vorname, nachname, spitzname,
      whi: parseFloat(whi) || 0,
      telefon,
      email: nutzer.email,
      uid: nutzer.uid,
      aktualisiert: new Date()
    }, { merge: true })
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 2000)
  }

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>

  return (
    <div className="page">
      <PageHeader titel="Profil" zurueck="/" />

      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>

        {/* AVATAR */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0'}}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 700, marginBottom: 8
          }}>
            {vorname?.[0]?.toUpperCase() || nutzer.email?.[0]?.toUpperCase()}
          </div>
          <div style={{fontSize: 13, color: 'var(--text-muted)'}}>{nutzer.email}</div>
        </div>

        {/* KONTO */}
        <div style={{fontSize: 12, fontWeight: 700, color: 'var(--primary)',
          textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0'}}>
          Konto
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden'}}>
          <div className="profil-zeile" onClick={() => {}}>
            <span>{nutzer.email}</span>
            <span className="list-arrow">›</span>
          </div>
          <div className="profil-zeile" onClick={() => navigate('/profil/passwort')}>
            <span>Passwort ändern</span>
            <span className="list-arrow">›</span>
          </div>
          {telefon && (
            <div className="profil-zeile">
              <span>{telefon}</span>
              <span className="list-arrow">›</span>
            </div>
          )}
        </div>

        {/* GOLFER INFO */}
        <div style={{fontSize: 12, fontWeight: 700, color: 'var(--primary)',
          textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0'}}>
          Golfer Informationen
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Vorname</label>
            <input className="input" value={vorname} onChange={e => setVorname(e.target.value)}
              placeholder="Vorname" />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Nachname</label>
            <input className="input" value={nachname} onChange={e => setNachname(e.target.value)}
              placeholder="Nachname" />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Spitzname (optional)</label>
            <input className="input" value={spitzname} onChange={e => setSpitzname(e.target.value)}
              placeholder="z.B. Bela" />
          </div>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">Telefon (optional)</label>
            <input className="input" value={telefon} onChange={e => setTelefon(e.target.value)}
              placeholder="z.B. 0676 1234567" type="tel" />
          </div>
        </div>

        {/* WHI */}
        <div style={{fontSize: 12, fontWeight: 700, color: 'var(--primary)',
          textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0'}}>
          Handicap
        </div>

        <div className="card" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <div className="input-group" style={{marginBottom: 0}}>
            <label className="input-label">World Handicap Index (WHI)</label>
            <input className="input" value={whi} onChange={e => setWhi(e.target.value)}
              placeholder="z.B. 23.8" type="number" step="0.1" min="0" max="54" />
          </div>
          <div style={{fontSize: 12, color: 'var(--text-muted)'}}>
            Den aktuellen WHI findest du auf der ÖGV Website oder in deiner Clubapp.
          </div>
        </div>

        <button className="btn-primary" onClick={speichern}>
          {gespeichert ? '✓ Gespeichert' : 'Profil speichern'}
        </button>

        {/* FREUNDE */}
        <div style={{fontSize: 12, fontWeight: 700, color: 'var(--primary)',
          textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0'}}>
          Freunde
        </div>

        <div className="list-item" onClick={() => navigate('/freunde')}>
          <div className="list-icon">👥</div>
          <div className="list-body">
            <div className="list-title">Freundesliste verwalten</div>
            <div className="list-sub">Freunde mit Name und WHI anlegen</div>
          </div>
          <span className="list-arrow">›</span>
        </div>

        <button className="btn-secondary" onClick={() => signOut(auth)}
          style={{marginTop: 8}}>
          Abmelden
        </button>

      </div>
    </div>
  )
}