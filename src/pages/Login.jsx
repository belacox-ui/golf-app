import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [name, setName] = useState('')
  const [istRegistrierung, setIstRegistrierung] = useState(false)
  const [istReset, setIstReset] = useState(false)
  const [fehler, setFehler] = useState('')
  const [erfolg, setErfolg] = useState('')
  const [laden, setLaden] = useState(false)

  const meldungen = {
    'auth/invalid-email': 'Ungültige E-Mail Adresse.',
    'auth/wrong-password': 'Falsches Passwort.',
    'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
    'auth/email-already-in-use': 'Diese E-Mail ist bereits registriert.',
    'auth/weak-password': 'Passwort muss mindestens 6 Zeichen haben.',
    'auth/invalid-credential': 'E-Mail oder Passwort falsch.',
    'auth/missing-email': 'Bitte E-Mail Adresse eingeben.',
  }

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
      setFehler(meldungen[e.code] || 'Fehler: ' + e.message)
    }
    setLaden(false)
  }

  async function passwortZuruecksetzen() {
    setFehler('')
    setErfolg('')
    if (!email) {
      setFehler('Bitte gib zuerst deine E-Mail Adresse ein.')
      return
    }
    setLaden(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setErfolg('E-Mail zum Zurücksetzen wurde an ' + email + ' gesendet. Bitte Posteingang (auch Spam) prüfen.')
    } catch (e) {
      setFehler(meldungen[e.code] || 'Fehler: ' + e.message)
    }
    setLaden(false)
  }

  if (istReset) {
    return (
      <div className="login-wrap">
        <img src="/logo.jpg" alt="GreenCap Logo" className="login-logo" />
        <div className="login-card">
          <h2>Passwort zurücksetzen</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Gib deine E-Mail Adresse ein — wir senden dir einen Link zum Zurücksetzen.
          </p>

          <div className="input-group">
            <label className="input-label">E-Mail</label>
            <input className="input" placeholder="name@email.com" type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && passwortZuruecksetzen()} />
          </div>

          {fehler && <div className="fehler">{fehler}</div>}
          {erfolg && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
              ✓ {erfolg}
            </div>
          )}

          <button className="btn-primary" onClick={passwortZuruecksetzen} disabled={laden}>
            {laden ? 'Bitte warten...' : 'Link senden'}
          </button>

          <button className="btn-ghost" onClick={() => { setIstReset(false); setFehler(''); setErfolg('') }}>
            ‹ Zurück zur Anmeldung
          </button>
        </div>
      </div>
    )
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

        {!istRegistrierung && (
          <div style={{ textAlign: 'right', marginBottom: 12, marginTop: -4 }}>
            <button
              onClick={() => { setIstReset(true); setFehler(''); setErfolg('') }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Passwort vergessen?
            </button>
          </div>
        )}

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