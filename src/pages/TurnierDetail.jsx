import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'

export default function TurnierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'turniere', id))
      if (snap.exists()) setTurnier({ id: snap.id, ...snap.data() })
      setLaden(false)
    }
    load()
  }, [id])

  async function lgOptInToggle() {
    const uid = auth.currentUser?.uid
    const neueSpieler = turnier.spieler.map(s =>
      s.uid === uid ? { ...s, lgOptIn: !s.lgOptIn } : s
    )
    await updateDoc(doc(db, 'turniere', id), { spieler: neueSpieler })
    setTurnier({ ...turnier, spieler: neueSpieler })
  }

  async function spielerEntfernen(uid) {
    if (!window.confirm('Spieler wirklich entfernen?')) return
    const neueSpieler = turnier.spieler.filter(s => s.uid !== uid)
    await updateDoc(doc(db, 'turniere', id), { spieler: neueSpieler })
    setTurnier({ ...turnier, spieler: neueSpieler })
  }

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Turnier nicht gefunden</h3></div></div>

  const uid = auth.currentUser?.uid
  const istErsteller = turnier.erstelltVon === uid
  const ichBin = turnier.spieler?.find(s => s.uid === uid)
  const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }

  return (
    <div className="page">
      <PageHeader titel={turnier.name} zurueck="/turniere" />

      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>

        {/* TURNIER INFO */}
        <div className="card">
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>DATUM</div>
              <div style={{fontWeight: 600}}>{turnier.datum || turnier.tage?.[0]?.datum}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>FORMAT</div>
              <div style={{fontWeight: 600}}>{formatLabel[turnier.format]}</div>
            </div>
            <div>
              <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 2}}>PLATZ</div>
              <div style={{fontWeight: 600, fontSize: 13}}>{turnier.platzName || turnier.tage?.[0]?.platzId}</div>
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
                🎲 Loyal & Gambling — {turnier.einsatz} € pro Punkt
              </div>
            </div>
          )}

          {turnier.openWette && (
            <div style={{marginTop: 8, padding: '10px 12px', background: '#dbeafe', borderRadius: 8}}>
              <div style={{fontWeight: 600, fontSize: 13, color: '#1d4ed8'}}>
                🎰 Open Wette — {turnier.openWetteEinsatz} € pro Tag
                {turnier.oesterreicher && turnier.oesterreicher !== 'n.a.' &&
                  ` · Österreicher: ${turnier.oesterreicher}`}
              </div>
            </div>
          )}
        </div>

        {/* MEIN L&G STATUS */}
        {turnier.loyalGambling && ichBin && turnier.status === 'offen' && (
          <div className="card">
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <div style={{fontWeight: 600, fontSize: 15}}>Mein L&G Status</div>
                <div style={{fontSize: 13, color: ichBin.lgOptIn ? 'var(--success)' : 'var(--text-muted)', marginTop: 2}}>
                  {ichBin.lgOptIn ? '✓ Ich nehme am Wettmodus teil' : 'Ich nehme nicht teil'}
                </div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={ichBin.lgOptIn || false}
                  onChange={lgOptInToggle} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        )}

        {/* SPIELER */}
        <div className="card">
          <div style={{fontWeight: 600, marginBottom: 12}}>
            Spieler ({turnier.spieler?.length || 0})
          </div>
          {turnier.spieler?.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0',
              borderBottom: i < turnier.spieler.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: s.istGast ? 'var(--text-muted)' : 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0
              }}>
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500, fontSize: 14}}>
                  {s.name}
                  {s.istGast && <span style={{fontSize: 11, color: 'var(--text-muted)', marginLeft: 6}}>Gast</span>}
                </div>
                <div style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6}}>
                  {s.hcp > 0 && <span>HCP {s.hcp}</span>}
                  {turnier.loyalGambling && (
                    <span style={{color: s.lgOptIn ? 'var(--success)' : 'var(--text-muted)'}}>
                      {s.lgOptIn ? '✓ L&G' : 'Kein L&G'}
                    </span>
                  )}
                </div>
              </div>
              <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                {s.uid === turnier.erstelltVon && (
                  <span className="badge badge-blue">Ersteller</span>
                )}
                {istErsteller && s.uid !== uid && (
                  <button onClick={() => spielerEntfernen(s.uid)}
                    style={{background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-light)', fontSize: 18}}>×</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AKTIONEN */}
        {istErsteller && turnier.status === 'offen' && (
          <button className="btn-primary" onClick={() => navigate(`/turnier/${id}/scoring`)}>
            🏌️ Scoring starten
          </button>
        )}

        {istErsteller && (
          <button className="btn-secondary" onClick={() => navigate(`/turnier/${id}/bearbeiten`)}>
            ✏️ Turnier bearbeiten
          </button>
        )}
{istErsteller && turnier.status === 'offen' && (
          <button
            onClick={async () => {
              if (!confirm('Turnier als abgeschlossen markieren?')) return
              await updateDoc(doc(db, 'turniere', id), { status: 'abgeschlossen' })
              setTurnier({ ...turnier, status: 'abgeschlossen' })
            }}
            style={{ padding: '12px', borderRadius: 12, border: '2px solid #22c55e', background: 'white', color: '#22c55e', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            ✓ Turnier abschließen
          </button>
        )}

        {istErsteller && turnier.status === 'abgeschlossen' && (
          <button
            onClick={async () => {
              await updateDoc(doc(db, 'turniere', id), { status: 'offen' })
              setTurnier({ ...turnier, status: 'offen' })
            }}
            style={{ padding: '12px', borderRadius: 12, border: '2px solid var(--border)', background: 'white', color: 'var(--text)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
          >
            ↻ Turnier wieder öffnen
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