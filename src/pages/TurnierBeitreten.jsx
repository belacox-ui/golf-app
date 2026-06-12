import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { PageHeader } from '../App'

export default function TurnierBeitreten() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [laden, setLaden] = useState(true)
  const [lgOptIn, setLgOptIn] = useState(false)
  const [beigetreten, setBeigetreten] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'turniere', id))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setTurnier(data)
        const bereitsda = data.spieler?.some(s => s.uid === auth.currentUser?.uid)
        if (bereitsda) setBeigetreten(true)
      }
      setLaden(false)
    }
    load()
  }, [id])

  async function beitreten() {
    setFehler('')
    try {
      await updateDoc(doc(db, 'turniere', id), {
        spieler: arrayUnion({
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || auth.currentUser.email,
          lgOptIn: turnier.loyalGambling ? lgOptIn : false
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

  return (
    <div className="page">
      <PageHeader titel="Turnier beitreten" zurueck="/" />
      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'}}>

        <div className="card">
          <div style={{fontSize: 22, fontWeight: 800, marginBottom: 4}}>{turnier.name}</div>
          <div style={{color: 'var(--text-muted)', fontSize: 14, marginBottom: 12}}>
            {turnier.datum} · {formatLabel[turnier.format]}
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
            {turnier.loyalGambling && (
              <div className="card">
                <div style={{fontWeight: 600, fontSize: 15, marginBottom: 4}}>
                  🎲 Loyal & Gambling
                </div>
                <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 16}}>
                  Einsatz: {turnier.einsatz} € pro Spieler. Wer unter dem Cut liegt zahlt,
                  wer darüber liegt bekommt 50% — 50% gehen an Charity.
                </div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <span style={{fontWeight: 500}}>Ich nehme am Wettmodus teil</span>
                  <label className="toggle">
                    <input type="checkbox" checked={lgOptIn} onChange={e => setLgOptIn(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            )}

            <div className="card">
              <div style={{fontSize: 14, color: 'var(--text-muted)', marginBottom: 8}}>
                Du trittst bei als:
              </div>
              <div style={{fontWeight: 600, fontSize: 16}}>
                {auth.currentUser?.displayName || auth.currentUser?.email}
              </div>
            </div>

            {fehler && <div className="fehler">{fehler}</div>}

            <button className="btn-primary" onClick={beitreten}>
              Dem Turnier beitreten
            </button>
          </>
        )}
      </div>
    </div>
  )
}