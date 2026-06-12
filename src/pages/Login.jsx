import { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [name, setName] = useState('')
  const [istRegistrierung, setIstRegistrierung] = useState(false)
  const [fehler, setFehler] = useState('')
  const [laden, setLaden] = useState(false)

  async function absenden() {
    setFehler('')
    setLaden(true)
    try {
      if (istRegistrierung) {
        const result = await createUserWithEmailAndPassword(auth, email, passwort)
        await updateProfile(result.user, { displayName: name })
      } else {
        await signInWithEmailAndPassword(auth, email, passwort)
      }
    } catch (e) {
      const meldungen = {
        'auth/invalid-email': 'Ungültige E-Mail Adresse.',
        'auth/wrong-password': 'Falsches Passwort.',
        'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
        'auth/email-already-in-use': 'Diese E-Mail ist bereits registriert.',
        'auth/weak-password': 'Passwort muss mindestens 6 Zeichen haben.',
      }
      setFehler(meldungen[e.code] || 'Fehler: ' + e.message)
    }
    setLaden(false)
  }

  return (
    <div className="login-wrap">
      <img src="/logo.jpg" alt="GreenCap Logo" className="login-logo" />

      <div className="login-card">
        <h2>{istRegistrierung ? 'Konto erstellen' : 'Anmelden'}</h2>

        {istRegistrierung && (
          <div className="input-group">
            <label className="input-label">Name</label>
            <input className="input" placeholder="Dein Name" value={name}
              onChange={e => setName(e.target.value)} />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">E-Mail</label>
          <input className="input" placeholder="name@email.com" type="email"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Passwort</label>
          <input className="input" placeholder="••••••••" type="password"
            value={passwort} onChange={e => setPasswort(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && absenden()} />
        </div>

        {fehler && <div className="fehler">{fehler}</div>}

        <button className="btn-primary" onClick={absenden} disabled={laden}>
          {laden ? 'Bitte warten...' : istRegistrierung ? 'Konto erstellen' : 'Anmelden'}
        </button>

        <button className="btn-ghost" onClick={() => { setIstRegistrierung(!istRegistrierung); setFehler('') }}>
          {istRegistrierung ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
        </button>
      </div>
    </div>
  )
}