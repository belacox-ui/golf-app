import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { PageHeader } from '../App'

export default function Freunde() {
  const [freunde, setFreunde] = useState([])
  const [laden, setLaden] = useState(true)
  const [neuerName, setNeuerName] = useState('')
  const [neuerWhi, setNeuerWhi] = useState('')
  const [neuerSpitz, setNeuerSpitz] = useState('')
  const [neuerEmail, setNeuerEmail] = useState('')
  const [emailSuche, setEmailSuche] = useState('')
  const [formOffen, setFormOffen] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'spieler', auth.currentUser.uid))
      if (snap.exists()) setFreunde(snap.data().freunde || [])
      setLaden(false)
    }
    load()
  }, [])

  async function speichern(neueListe) {
    await setDoc(doc(db, 'spieler', auth.currentUser.uid),
      { freunde: neueListe }, { merge: true })
    setFreunde(neueListe)
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 1500)
  }

  // E-Mail-Abgleich: prüft ob jemand mit dieser E-Mail bereits einen Account hat
  async function sucheNachEmail(email) {
    if (!email) return null
    const q = query(collection(db, 'spieler'), where('email', '==', email.toLowerCase().trim()))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const d = snap.docs[0].data()
      return {
        uid: d.uid,
        name: `${d.vorname || ''} ${d.nachname || ''}`.trim() || email,
        whi: d.whi || 0,
        email: d.email
      }
    }
    return null
  }

  async function hinzufuegen() {
    if (!neuerName) return

    let verknuepft = null
    if (neuerEmail) {
      verknuepft = await sucheNachEmail(neuerEmail)
    }

    const neu = {
      id: Date.now().toString(),
      name: verknuepft?.name || neuerName,
      spitzname: neuerSpitz,
      whi: verknuepft?.whi || parseFloat(neuerWhi) || 0,
      email: neuerEmail.toLowerCase().trim() || null,
      // Echte uid wenn Account gefunden, sonst null
      uid: verknuepft?.uid || null,
      hatAccount: !!verknuepft
    }

    speichern([...freunde, neu])
    setNeuerName('')
    setNeuerWhi('')
    setNeuerSpitz('')
    setNeuerEmail('')
    setFormOffen(false)
  }

  function entfernen(id) {
    speichern(freunde.filter(f => f.id !== id))
  }

  function aktualisieren(id, feld, wert) {
    const neu = freunde.map(f => f.id === id ? { ...f, [feld]: wert } : f)
    speichern(neu)
  }

  // Nachträgliche Verknüpfung — wenn Freund noch keine uid hat
  async function verknuepfen(freundId, email) {
    const gefunden = await sucheNachEmail(email)
    if (!gefunden) {
      alert('Kein App-Account mit dieser E-Mail gefunden.')
      return
    }
    const neu = freunde.map(f => f.id === freundId
      ? { ...f, uid: gefunden.uid, hatAccount: true, email, whi: gefunden.whi, name: f.spitzname || gefunden.name }
      : f
    )
    speichern(neu)
  }

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>

  return (
    <div className="page">
      <PageHeader titel="Freundesliste" zurueck="/profil" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {freunde.length === 0 && !formOffen && (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-icon">👥</div>
            <h3>Noch keine Freunde</h3>
            <p>Füge Freunde mit Name und WHI hinzu. Optional mit E-Mail für automatische Account-Verknüpfung.</p>
          </div>
        )}

        {freunde.map(f => (
          <div key={f.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: f.hatAccount ? 'var(--primary)' : '#9ca3af',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, flexShrink: 0
              }}>
                {f.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{f.spitzname || f.name}</div>
                {f.spitzname && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.name}</div>
                )}
                {f.hatAccount ? (
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ App-Account verknüpft</div>
                ) : (
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Kein App-Account</div>
                )}
              </div>
              <div style={{
                background: 'var(--primary)', color: 'white',
                borderRadius: 20, padding: '4px 12px',
                fontSize: 13, fontWeight: 700
              }}>
                WHI {f.whi}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input className="input" style={{ fontSize: 13, padding: '8px 10px' }}
                placeholder="Name" value={f.name}
                onChange={e => aktualisieren(f.id, 'name', e.target.value)} />
              <input className="input" style={{ fontSize: 13, padding: '8px 10px' }}
                placeholder="WHI" type="number" step="0.1" value={f.whi}
                onChange={e => aktualisieren(f.id, 'whi', parseFloat(e.target.value) || 0)} />
              <input className="input" style={{ fontSize: 13, padding: '8px 10px' }}
                placeholder="Spitzname" value={f.spitzname || ''}
                onChange={e => aktualisieren(f.id, 'spitzname', e.target.value)} />
              <button className="btn-secondary" style={{ fontSize: 13, padding: '8px' }}
                onClick={() => entfernen(f.id)}>
                🗑 Entfernen
              </button>
            </div>

            {/* Nachträgliche Verknüpfung wenn noch kein Account */}
            {!f.hatAccount && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ fontSize: 13, padding: '8px 10px', flex: 1 }}
                  placeholder="E-Mail für App-Verknüpfung"
                  value={f.email || ''}
                  onChange={e => aktualisieren(f.id, 'email', e.target.value)} />
                <button
                  onClick={() => verknuepfen(f.id, f.email)}
                  disabled={!f.email}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: 'var(--primary)', color: 'white',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    opacity: !f.email ? 0.4 : 1
                  }}>
                  Verknüpfen
                </button>
              </div>
            )}
          </div>
        ))}

        {formOffen && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Neuer Freund</div>
            <input className="input" placeholder="Name *"
              value={neuerName} onChange={e => setNeuerName(e.target.value)} />
            <input className="input" placeholder="Spitzname (optional)"
              value={neuerSpitz} onChange={e => setNeuerSpitz(e.target.value)} />
            <input className="input" placeholder="WHI (z.B. 18.4)"
              type="number" step="0.1" value={neuerWhi}
              onChange={e => setNeuerWhi(e.target.value)} />
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
                ✓ App-Verknüpfung (optional)
              </div>
              <input className="input" placeholder="E-Mail Adresse (falls App-Nutzer)"
                type="email" value={neuerEmail}
                onChange={e => setNeuerEmail(e.target.value)} />
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                Falls dein Freund die App bereits nutzt, wird sein Account automatisch verknüpft — er sieht dann gemeinsame Runden und Turniere in seiner eigenen App.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => setFormOffen(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={hinzufuegen} disabled={!neuerName}>
                Hinzufügen
              </button>
            </div>
          </div>
        )}

        {!formOffen && (
          <button className="btn-primary" onClick={() => setFormOffen(true)}>
            + Freund hinzufügen
          </button>
        )}

        {gespeichert && (
          <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
            ✓ Gespeichert
          </div>
        )}
      </div>
    </div>
  )
}