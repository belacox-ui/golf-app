import { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

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
        await createUserWithEmailAndPassword(auth, email, passwort)
      } else {
        await signInWithEmailAndPassword(auth, email, passwort)
      }
    } catch (e) {
      setFehler('Fehler: ' + e.message)
    }
    setLaden(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">⛳</div>
      <h1>Golf App</h1>
      <p className="login-sub">Deine Runden. Deine Rangliste.</p>

      <div className="login-card">
        <h2>{istRegistrierung ? 'Registrieren' : 'Anmelden'}</h2>

        {istRegistrierung && (
          <input
            className="input"
            placeholder="Dein Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        )}

        <input
          className="input"
          placeholder="E-Mail"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          className="input"
          placeholder="Passwort"
          type="password"
          value={passwort}
          onChange={e => setPasswort(e.target.value)}
        />

        {fehler && <p className="fehler">{fehler}</p>}

        <button className="btn-primary" onClick={absenden} disabled={laden}>
          {laden ? 'Bitte warten...' : istRegistrierung ? 'Konto erstellen' : 'Anmelden'}
        </button>

        <button className="btn-ghost" onClick={() => setIstRegistrierung(!istRegistrierung)}>
          {istRegistrierung ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
        </button>
      </div>
    </div>
  )
}