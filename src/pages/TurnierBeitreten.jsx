import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { PageHeader } from '../App'

export default function TurnierBeitreten() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [profil, setProfil] = useState(null)
  const [laden, setLaden] = useState(true)
  const [lgOptIn, setLgOptIn] = useState(false)
  const [beigetreten, setBeigetreten] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    async function load() {
      const [turnierSnap, profilSnap] = await Promise.all([
        getDoc(doc(db, 'turniere', id)),
        getDoc(doc(db, 'spieler', auth.currentUser?.uid))
      ])
      if (turnierSnap.exists()) {
        const data = { id: turnierSnap.id, ...turnierSnap.data() }
        setTurnier(data)
        const bereitsda = data.spieler?.some(s => s.uid === auth.currentUser?.uid)
        if (bereitsda) setBeigetreten(true)
      }
      if (profilSnap.exists()) setProfil(profilSnap.data())
      setLaden(false)
    }
    load()
  }, [id])

  async function beitreten() {
    setFehler('')
    try {
      const anzeigeName = profil
        ? `${profil.vorname || ''} ${profil.nachname || ''}`.trim() || auth.currentUser.email
        : auth.currentUser.displayName || auth.currentUser.email

      await updateDoc(doc(db, 'turniere', id), {
        spieler: arrayUnion({
          uid: auth.currentUser.uid,
          name: anzeigeName,
          hcp: profil?.whi || 0,
          lgOptIn: turnier.loyalGambling ? lgOptIn : false,
          istGast: false
        })
      })
      navigate(`/turnier/${id}`)
    } catch (e) {
      setFehler('Fehler: ' + e.message)
    }
  }

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Turnier nicht gefunden</h3></div></div>

  const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }
  const anzeigeName = profil
    ? `${profil.vorname || ''} ${profil.nachname || ''}`.trim() || auth.currentUser.email
    : auth.currentUser.displayName || auth.currentUser.email

  return (
    <div className="page">
      <PageHeader titel="Turnier beitreten" zurueck="/" />
      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'}}>

        <div className="card">
          <div style={{fontSize: 22, fontWeight: 800, marginBottom: 4}}>{turnier.name}</div>
          <div style={{color: 'var(--text-muted)', fontSize: 14, marginBottom: 8}}>
            {turnier.datum || turnier.tage?.[0]?.datum} · {formatLabel[turnier.format]}
          </div>
          <div style={{fontSize: 14}}>{turnier.platzName}</div>
        </div>

        {beigetreten ? (
          <div className="card" style={{textAlign: 'center', padding: 24}}>
            <div style={{fontSize: 32, marginBottom: 8}}>✓</div>
            <div style={{fontWeight: 600, marginBottom: 4}}>Du bist bereits dabei!</div>
            <div style={{fontSize: 14, color: 'var(--text-muted)', marginBottom: 16}}>
              Du hast dich bereits für dieses Turnier angemeldet.
            </div>
            <button className="btn-primary" onClick={() => navigate(`/turnier/${id}`)}>
              Zum Turnier
            </button>
          </div>
        ) : (
          <>
            {/* SPIELER INFO */}
            <div className="card">
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>
                DU TRITTST BEI ALS
              </div>
              <div style={{fontWeight: 600, fontSize: 16, marginBottom: 4}}>{anzeigeName}</div>
              {profil?.whi ? (
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <span style={{fontSize: 14, color: 'var(--text-muted)'}}>WHI:</span>
                  <span style={{
                    background: 'var(--primary)', color: 'white',
                    borderRadius: 20, padding: '2px 10px',
                    fontSize: 14, fontWeight: 700
                  }}>{profil.whi}</span>
                </div>
              ) : (
                <div style={{fontSize: 13, color: 'var(--danger)'}}>
                  ⚠️ Kein WHI im Profil — bitte zuerst im Profil eintragen!
                </div>
              )}
            </div>

            {/* L&G OPT-IN */}
            {turnier.loyalGambling && (
              <div className="card">
                <div style={{fontWeight: 600, fontSize: 15, marginBottom: 4}}>
                  🎲 Loyal & Gambling
                </div>
                <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 16}}>
                  {turnier.einsatz} € pro Punkt × Anzahl Mitspieler.
                  50% Auszahlung, 50% Charity.
                </div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <span style={{fontWeight: 500}}>Ich nehme am Wettmodus teil</span>
                  <label className="toggle">
                    <input type="checkbox" checked={lgOptIn}
                      onChange={e => setLgOptIn(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            )}

            {fehler && <div className="fehler">{fehler}</div>}

            {!profil?.whi && (
              <button className="btn-secondary" onClick={() => navigate('/profil')}>
                → Zum Profil — WHI eintragen
              </button>
            )}

            <button className="btn-primary" onClick={beitreten}>
              Dem Turnier beitreten
            </button>
          </>
        )}
      </div>
    </div>
  )
}