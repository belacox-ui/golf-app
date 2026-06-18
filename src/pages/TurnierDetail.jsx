import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

export default function TurnierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [flights, setFlights] = useState([]) // alle Runden mit turnierId = id
  const [laden, setLaden] = useState(true)
  const [freunde, setFreunde] = useState([])
  const [gastName, setGastName] = useState('')
  const [gastWhi, setGastWhi] = useState('')
  const [gastFormOffen, setGastFormOffen] = useState(false)

  useEffect(() => {
    async function load() {
      // Turnier laden
      const snap = await getDoc(doc(db, 'turniere', id))
      if (!snap.exists()) { setLaden(false); return }
      const t = { id: snap.id, ...snap.data() }
      setTurnier(t)

      // Alle Flights (Runden) zu diesem Turnier laden
      const flightQuery = query(
        collection(db, 'runden'),
        where('turnierId', '==', id)
      )
      const flightSnap = await getDocs(flightQuery)
      setFlights(flightSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // Freundesliste laden
      const spielerSnap = await getDoc(doc(db, 'spieler', auth.currentUser.uid))
      if (spielerSnap.exists()) setFreunde(spielerSnap.data().freunde || [])

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

  async function spielerHinzufuegen(freund) {
    if (turnier.spieler?.some(s => s.uid === (freund.uid || 'freund_' + freund.id))) return
    const neuerSpieler = {
      uid: freund.uid || ('freund_' + freund.id),
      name: freund.spitzname || freund.name,
      hcp: freund.whi || 0,
      lgOptIn: false,
      istGast: false,
      hatAccount: freund.hatAccount || false
    }
    const neueSpieler = [...(turnier.spieler || []), neuerSpieler]
    await updateDoc(doc(db, 'turniere', id), { spieler: neueSpieler })
    setTurnier({ ...turnier, spieler: neueSpieler })
  }

  async function gastSpielerHinzufuegen() {
    if (!gastName) return
    const neuerSpieler = {
      uid: 'gast_' + Date.now(),
      name: gastName,
      hcp: parseFloat(gastWhi) || 0,
      lgOptIn: false,
      istGast: true
    }
    const neueSpieler = [...(turnier.spieler || []), neuerSpieler]
    await updateDoc(doc(db, 'turniere', id), { spieler: neueSpieler })
    setTurnier({ ...turnier, spieler: neueSpieler })
    setGastName('')
    setGastWhi('')
    setGastFormOffen(false)
  }

  async function spielerEntfernen(spielerUid) {
    if (!window.confirm('Spieler wirklich entfernen?')) return
    const neueSpieler = turnier.spieler.filter(s => s.uid !== spielerUid)
    await updateDoc(doc(db, 'turniere', id), { spieler: neueSpieler })
    setTurnier({ ...turnier, spieler: neueSpieler })
  }

  if (laden) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>
  if (!turnier) return <div className="page"><div className="empty-state"><h3>Turnier nicht gefunden</h3></div></div>

  const uid = auth.currentUser?.uid
  const istErsteller = turnier.erstelltVon === uid
  const ichBin = turnier.spieler?.find(s => s.uid === uid)
  const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }
  const spieltage = turnier.spieltage || []

  // Flights pro Spieltag gruppieren
  const flightsProSpieltag = (spieltagIdx) =>
    flights.filter(f => f.spieltagId === String(spieltagIdx))

  const verfuegbareFreunde = freunde.filter(f =>
    !turnier.spieler?.some(s => s.uid === (f.uid || 'freund_' + f.id))
  )

  return (
    <div className="page">
      <PageHeader titel={turnier.name} zurueck="/turniere" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* STATUS + FORMAT */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge ${turnier.status === 'offen' ? 'badge-green' : 'badge-gray'}`}>
            {turnier.status === 'offen' ? '● Offen' : '✓ Abgeschlossen'}
          </span>
          <span className="badge badge-blue">{formatLabel[turnier.format] || turnier.format}</span>
          {turnier.loyalGambling && <span className="badge badge-amber">🎲 L&G {turnier.einsatz}€</span>}
          {turnier.openWette && <span className="badge badge-blue">🎰 Open Wette</span>}
        </div>

        {/* L&G INFO */}
        {turnier.loyalGambling && (
          <div style={{ background: '#fef3c7', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#92400e' }}>
              🎲 Loyal & Gambling — {turnier.einsatz}€ pro Punkt · 50% Auszahlung, 50% Charity
            </div>
          </div>
        )}

        {turnier.openWette && turnier.oesterreicher && turnier.oesterreicher !== 'n.a.' && (
          <div style={{ background: '#dbeafe', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1d4ed8' }}>
              🎰 Open Wette — {turnier.openWetteEinsatz}€/Tag · Österreicher: {turnier.oesterreicher}
            </div>
          </div>
        )}

        {/* MEIN L&G OPT-IN */}
        {turnier.loyalGambling && ichBin && turnier.status === 'offen' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Mein L&G Status</div>
                <div style={{ fontSize: 13, color: ichBin.lgOptIn ? '#22c55e' : 'var(--text-muted)', marginTop: 2 }}>
                  {ichBin.lgOptIn ? '✓ Ich nehme am Wettmodus teil' : 'Ich nehme nicht teil'}
                </div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={ichBin.lgOptIn || false} onChange={lgOptInToggle} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        )}

        {/* SPIELTAGE + FLIGHTS */}
        <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>Spieltage & Flights</div>

        {spieltage.length === 0 && (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Keine Spieltage definiert — bitte Turnier bearbeiten.
          </div>
        )}

        {spieltage.map((tag, idx) => {
          const tagFlights = flightsProSpieltag(idx)
          const platz = COURSES.find(c => c.id === tag.platzId)
          return (
            <div key={idx} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* Spieltag Header */}
              <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {spieltage.length > 1 ? `Tag ${idx + 1} — ` : ''}{tag.datum}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {tag.platzName || platz?.name || tag.platzId}
                </div>
              </div>

              {/* Flights dieses Spieltags */}
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tagFlights.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Noch keine Flights angelegt</div>
                )}
                {tagFlights.map(f => {
                  const fertigeLocher = f.spieler?.reduce((sum, s) => {
                    return sum + Object.values(f.scores?.[s.id] || {}).filter(v => v > 0).length
                  }, 0)
                  const gesamtLoecher = (f.spieler?.length || 0) * 18
                  return (
                    <div key={f.id}
                      onClick={() => navigate(`/runde/${f.id}`)}
                      style={{
                        background: '#f9fafb', borderRadius: 10, padding: '10px 14px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10
                      }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          Flight — {f.spieler?.map(s => s.name.split(' ')[0]).join(', ')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {f.spieler?.length} Spieler ·
                          {f.status === 'abgeschlossen' ? ' ✓ Fertig' : ` ${Math.round((fertigeLocher / gesamtLoecher) * 100) || 0}% gespielt`}
                        </div>
                      </div>
                      <span className={`badge ${f.status === 'abgeschlossen' ? 'badge-gray' : 'badge-green'}`}>
                        {f.status === 'abgeschlossen' ? 'Fertig' : 'Aktiv'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>›</span>
                    </div>
                  )
                })}

                {/* Flight anlegen Button */}
                {istErsteller && turnier.status === 'offen' && (
                  <button
                    onClick={() => navigate(`/runde/neu?turnierId=${id}&spieltagId=${idx}&platzId=${tag.platzId}&format=${turnier.format}&turnierName=${encodeURIComponent(turnier.name)}`)}
                    style={{
                      padding: '10px', borderRadius: 10, border: '2px dashed var(--primary)',
                      background: 'white', color: 'var(--primary)', fontWeight: 600,
                      fontSize: 14, cursor: 'pointer', textAlign: 'center'
                    }}>
                    + Flight anlegen
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* SPIELER */}
        <div style={{ fontWeight: 700, fontSize: 16, marginTop: 4 }}>
          Teilnehmer ({turnier.spieler?.length || 0})
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
          {turnier.spieler?.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              borderBottom: i < turnier.spieler.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: s.istGast ? '#9ca3af' : 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0
              }}>
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {s.name}
                  {s.hatAccount && <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 6 }}>✓</span>}
                  {s.istGast && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>Gast</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                  {s.hcp > 0 && <span>HCP {s.hcp}</span>}
                  {turnier.loyalGambling && (
                    <span style={{ color: s.lgOptIn ? '#22c55e' : '#9ca3af' }}>
                      {s.lgOptIn ? '✓ L&G' : 'Kein L&G'}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {s.uid === turnier.erstelltVon && <span className="badge badge-blue">Ersteller</span>}
                {istErsteller && s.uid !== uid && (
                  <button onClick={() => spielerEntfernen(s.uid)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>×</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Freunde + Gäste direkt hinzufügen */}
        {istErsteller && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Teilnehmer hinzufügen</div>

            {verfuegbareFreunde.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {verfuegbareFreunde.map(f => (
                  <button key={f.id} onClick={() => spielerHinzufuegen(f)}
                    style={{
                      padding: '6px 12px', borderRadius: 20,
                      border: `1.5px solid ${f.hatAccount ? 'var(--primary)' : '#9ca3af'}`,
                      background: 'white', color: f.hatAccount ? 'var(--primary)' : '#6b7280',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer'
                    }}>
                    + {f.spitzname || f.name}
                    {f.hatAccount && <span style={{ fontSize: 10, marginLeft: 4 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            {!gastFormOffen ? (
              <button className="btn-secondary" style={{ fontSize: 13, padding: '8px' }}
                onClick={() => setGastFormOffen(true)}>
                + Gast hinzufügen
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="input" placeholder="Name *" value={gastName}
                  onChange={e => setGastName(e.target.value)} />
                <input className="input" placeholder="WHI (optional)" type="number"
                  step="0.1" value={gastWhi} onChange={e => setGastWhi(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" onClick={() => setGastFormOffen(false)}>Abbrechen</button>
                  <button className="btn-primary" onClick={gastSpielerHinzufuegen} disabled={!gastName}>Hinzufügen</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AKTIONEN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, paddingBottom: 20 }}>
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
              style={{ padding: '12px', borderRadius: 12, border: '2px solid #22c55e', background: 'white', color: '#22c55e', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              ✓ Turnier abschließen
            </button>
          )}

          {istErsteller && turnier.status === 'abgeschlossen' && (
            <button
              onClick={async () => {
                await updateDoc(doc(db, 'turniere', id), { status: 'offen' })
                setTurnier({ ...turnier, status: 'offen' })
              }}
              style={{ padding: '12px', borderRadius: 12, border: '2px solid var(--border)', background: 'white', color: 'var(--text)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
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
    </div>
  )
}