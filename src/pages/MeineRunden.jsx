import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'

const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }

export default function MeineRunden() {
  const navigate = useNavigate()
  const [runden, setRunden] = useState([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const q = query(
        collection(db, 'runden'),
        where('erstelltVon', '==', auth.currentUser.uid),
        orderBy('erstelltAm', 'desc')
      )
      const snap = await getDocs(q)
      setRunden(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.istFlight))
    } catch (e) {
      console.log(e)
    }
    setLaden(false)
  }

  const abschliessen = async (e, rundeId) => {
    e.stopPropagation()
    if (!confirm('Runde als abgeschlossen markieren?')) return
    await updateDoc(doc(db, 'runden', rundeId), { status: 'abgeschlossen' })
    load()
  }

  const wiederOeffnen = async (e, rundeId) => {
    e.stopPropagation()
    await updateDoc(doc(db, 'runden', rundeId), { status: 'aktiv' })
    load()
  }

  if (laden) return (
    <div className="page">
      <PageHeader titel="Meine Runden" zurueck="/" />
      <div className="empty-state"><p>Lädt...</p></div>
    </div>
  )

  const aktive = runden.filter(r => r.status === 'aktiv')
  const abgeschlossen = runden.filter(r => r.status !== 'aktiv')

  if (runden.length === 0) return (
    <div className="page">
      <PageHeader titel="Meine Runden" zurueck="/" />
      <div className="empty-state">
        <div className="empty-icon">🏌️</div>
        <h3>Noch keine Runden</h3>
        <p>Starte deine erste Runde über den Home Screen.</p>
      </div>
    </div>
  )

  return (
    <div className="page">
      <PageHeader titel="Meine Runden" zurueck="/" />
      <div className="page-content">

        {/* Aktive Runden — hervorgehoben */}
        {aktive.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              ● Laufende Runden
            </div>
            {aktive.map(r => (
              <div key={r.id} style={{
                background: 'white', borderRadius: 16, padding: 16, marginBottom: 12,
                border: '2px solid #22c55e', boxShadow: '0 2px 8px rgba(34,197,94,0.12)'
              }}>
                <div onClick={() => navigate(`/runde/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 12 }}>
                  <div style={{ fontSize: 24 }}>🏌️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.platzName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {r.datum} · {formatLabel[r.format]} · {r.spieler?.length || 1} Spieler
                    </div>
                  </div>
                  <span className="badge badge-green">● Aktiv</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/runde/${r.id}/scoring`)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    ▶ Fortsetzen
                  </button>
                  <button
                    onClick={(e) => abschliessen(e, r.id)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '2px solid var(--border)', background: 'white', color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                  >
                    ✓ Abschließen
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Abgeschlossene Runden */}
        {abgeschlossen.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: aktive.length > 0 ? 20 : 0, marginBottom: 10 }}>
              Abgeschlossene Runden
            </div>
            <div className="card-list">
              {abgeschlossen.map(r => (
                <div key={r.id} className="list-item" onClick={() => navigate(`/runde/${r.id}`)} style={{ position: 'relative' }}>
                  <div className="list-icon">🏌️</div>
                  <div className="list-body">
                    <div className="list-title">{r.platzName}</div>
                    <div className="list-sub">
                      {r.datum} · {formatLabel[r.format]} · {r.spieler?.length || 1} Spieler
                    </div>
                  </div>
                  <button
                    onClick={(e) => wiederOeffnen(e, r.id)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
                  >
                    ↻ Öffnen
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}