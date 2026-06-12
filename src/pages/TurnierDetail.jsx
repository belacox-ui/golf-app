import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { PageHeader } from '../App'

export default function TurnierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function laden() {
      const snap = await getDoc(doc(db, 'turniere', id))
      if (snap.exists()) setTurnier({ id: snap.id, ...snap.data() })
      setLaden(false)
    }
    laden()
  }, [id])

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Turnier nicht gefunden</h3></div></div>

  const istErsteller = turnier.erstelltVon === auth.currentUser?.uid
  const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }

  return (
    <div className="page">
      <PageHeader titel={turnier.name} zurueck="/turniere" />

      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>

        <div className="card">
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>DATUM</div>
              <div style={{fontWeight: 600}}>{turnier.datum}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>FORMAT</div>
              <div style={{fontWeight: 600}}>{formatLabel[turnier.format]}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>PLATZ</div>
              <div style={{fontWeight: 600, fontSize: 13}}>{turnier.platzName}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>STATUS</div>
              <span className={`badge ${turnier.status === 'offen' ? 'badge-green' : 'badge-amber'}`}>
                {turnier.status}
              </span>
            </div>
          </div>

          {turnier.loyalGambling && (
            <div style={{marginTop: 12, padding: '10px 12px', background: '#fef3c7', borderRadius: 8}}>
              <div style={{fontWeight: 600, fontSize: 13, color: '#92400e'}}>
                🎲 Loyal & Gambling aktiv — {turnier.einsatz} € pro Spieler
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{fontWeight: 600, marginBottom: 12}}>
            Spieler ({turnier.spieler?.length || 0})
          </div>
          {turnier.spieler?.map((s, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: i < turnier.spieler.length - 1 ? '1px solid var(--border-light)' : 'none'}}>
              <div style={{width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0}}>
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500, fontSize: 14}}>{s.name}</div>
                {turnier.loyalGambling && (
                  <div style={{fontSize: 12, color: s.lgOptIn ? 'var(--success)' : 'var(--text-muted)'}}>
                    {s.lgOptIn ? '✓ L&G dabei' : 'Kein L&G'}
                  </div>
                )}
              </div>
              {s.uid === turnier.erstelltVon && (
                <span className="badge badge-blue">Ersteller</span>
              )}
            </div>
          ))}
        </div>

        {istErsteller && turnier.status === 'offen' && (
          <button className="btn-primary" onClick={() => navigate(`/turnier/${id}/scoring`)}>
            🏌️ Scoring starten
          </button>
        )}

        <button className="btn-secondary" onClick={() => {
          const url = `${window.location.origin}/turnier/${id}/beitreten`
          navigator.clipboard.writeText(url)
          alert('Einladungslink kopiert!')
        }}>
          📋 Einladungslink kopieren
        </button>

      </div>
    </div>
  )
}