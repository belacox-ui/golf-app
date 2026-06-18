import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'
import { berechneSpielvorgabe, stablefordPunkte, vorgabeAufLoch } from '../utils/handicap'

function lochFarbe(diff) {
  if (diff === null) return '#f3f4f6'
  if (diff <= -2) return '#f59e0b'
  if (diff === -1) return '#22c55e'
  if (diff === 0) return '#6b7280'
  if (diff === 1) return '#ef4444'
  return '#991b1b'
}

function SpielerScorecard({ spieler, scores, holes, format, slope, cr, par, mitPlatzvorgabe }) {
  const [offen, setOffen] = useState(false)
  const hcp = spieler.hcp || 0
  const spielvorgabe = berechneSpielvorgabe(hcp, slope, cr, par, mitPlatzvorgabe)

  let brutto = 0, punkte = 0
  holes.forEach((h, i) => {
    const sl = scores[spieler.id]?.[i] || 0
    if (sl > 0) {
      brutto += sl
      punkte += stablefordPunkte(sl, h.par, spielvorgabe, h.hcp) || 0
    }
  })
  const parGesamt = holes.reduce((s, h) => s + h.par, 0)
  const zumPar = brutto - parGesamt

  const LochKachel = ({ h, i, lochNr }) => {
    const sl = scores[spieler.id]?.[i] || 0
    const diff = sl > 0 ? sl - h.par : null
    const pkt = sl > 0 ? stablefordPunkte(sl, h.par, spielvorgabe, h.hcp) : null
    const vorgabe = vorgabeAufLoch(spielvorgabe, h.hcp)

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#111827', fontWeight: 700 }}>{lochNr}</div>
        <div style={{ fontSize: 11, color: '#374151' }}>P{h.par}</div>
        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>
          {h.hcp}{vorgabe > 0 ? <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{'+'.repeat(vorgabe)}</span> : ''}
        </div>
        <div style={{
          width: '100%', aspectRatio: '1',
          borderRadius: diff !== null && diff <= -1 ? '50%' : 4,
          background: lochFarbe(diff),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          color: diff !== null ? 'white' : '#9ca3af',
          border: diff === 1 ? '2px solid #ef4444' : 'none',
          boxSizing: 'border-box'
        }}>
          {sl || '—'}
        </div>
        {format === 'stableford' && (
          <div style={{
            fontSize: 11, fontWeight: 700, marginTop: 2,
            color: pkt === null ? '#d1d5db' : pkt >= 4 ? '#22c55e' : pkt >= 3 ? '#374151' : pkt >= 2 ? '#ef4444' : '#991b1b'
          }}>
            {pkt !== null ? `${pkt}p` : '·'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 12 }}>
      <div onClick={() => setOffen(!offen)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
          {spieler.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{spieler.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            WHI {hcp} · Spielvorgabe {spielvorgabe}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 8 }}>
          {format === 'stableford' ? (
            <>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{punkte} <span style={{ fontSize: 13, fontWeight: 500 }}>Pkt</span></div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Brutto {brutto || '—'}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 20 }}>
                {brutto === 0 ? '—' : zumPar === 0 ? 'E' : zumPar > 0 ? `+${zumPar}` : zumPar}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{brutto || '—'} Schläge</div>
            </>
          )}
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: 18, transform: offen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </div>

      {offen && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, marginBottom: 4 }}>
            {holes.slice(0, 9).map((h, i) => <LochKachel key={i} h={h} i={i} lochNr={i + 1} />)}
          </div>
          <div style={{ fontSize: 11, color: '#374151', textAlign: 'right', marginBottom: 10 }}>
            OUT: <strong>{holes.slice(0, 9).reduce((s, _, i) => s + (scores[spieler.id]?.[i] || 0), 0) || '—'}</strong>
            {format === 'stableford' && <> · <strong>{holes.slice(0, 9).reduce((s, h, i) => { const sl = scores[spieler.id]?.[i] || 0; return s + (sl > 0 ? stablefordPunkte(sl, h.par, spielvorgabe, h.hcp) || 0 : 0) }, 0)}p</strong></>}
          </div>

          {holes.length > 9 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, marginBottom: 4 }}>
                {holes.slice(9, 18).map((h, i) => <LochKachel key={i} h={h} i={i + 9} lochNr={i + 10} />)}
              </div>
              <div style={{ fontSize: 11, color: '#374151', textAlign: 'right' }}>
                IN: <strong>{holes.slice(9, 18).reduce((s, _, i) => s + (scores[spieler.id]?.[i + 9] || 0), 0) || '—'}</strong>
                {format === 'stableford' && <> · <strong>{holes.slice(9, 18).reduce((s, h, i) => { const sl = scores[spieler.id]?.[i + 9] || 0; return s + (sl > 0 ? stablefordPunkte(sl, h.par, spielvorgabe, h.hcp) || 0 : 0) }, 0)}p</strong></>}
                {' · '}GES: <strong>{brutto || '—'}</strong>
                {format === 'stableford' && <> · <strong>{punkte}p</strong></>}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[['#f59e0b', 'Eagle'], ['#22c55e', 'Birdie'], ['#6b7280', 'Par'], ['#ef4444', 'Bogey'], ['#991b1b', '+2']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 10, color: '#6b7280' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RundeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [runde, setRunde] = useState(null)
  const [platz, setPlatz] = useState(null)
  const [laden, setLaden] = useState(true)
  const ichId = auth.currentUser?.uid

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'runden', id))
      if (!snap.exists()) return navigate('/meine-runden')
      const data = { id: snap.id, ...snap.data() }
      setRunde(data)
      setPlatz(COURSES.find(c => c.id === data.platzId) || null)
      setLaden(false)
    }
    load()
  }, [id])

  if (laden || !runde) return <div className="page"><div className="empty-state"><p>Lädt...</p></div></div>

  const spieler = runde.spieler || []
  const scores = runde.scores || {}
  const holes = platz?.holes || []
  const istEigner = runde.erstelltVon === ichId
  const istAktiv = runde.status === 'aktiv'
  const slope = platz?.sr_herren || 113
  const cr = platz?.cr_herren || platz?.par || 72
  const par = platz?.par || 72
  const mitPlatzvorgabe = runde.mitPlatzvorgabe !== false

  const rangliste = spieler.map(s => {
    const sv = berechneSpielvorgabe(s.hcp || 0, slope, cr, par, mitPlatzvorgabe)
    let punkte = 0, brutto = 0
    holes.forEach((h, i) => {
      const sl = scores[s.id]?.[i] || 0
      if (sl > 0) { brutto += sl; punkte += stablefordPunkte(sl, h.par, sv, h.hcp) || 0 }
    })
    return { ...s, punkte, brutto }
  }).sort((a, b) => runde.format === 'stableford' ? b.punkte - a.punkte : a.brutto - b.brutto)

  return (
    <div className="page">
      <PageHeader titel={runde.platzName || 'Runde'} zurueck="/meine-runden" />
      <div className="page-content">

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span className={`badge ${istAktiv ? 'badge-green' : 'badge-gray'}`}>{istAktiv ? '● Aktiv' : '✓ Abgeschlossen'}</span>
          <span className="badge badge-gray">📅 {runde.datum}</span>
          <span className="badge badge-blue">{runde.format === 'stableford' ? 'Stableford' : runde.format === 'strokeplay' ? 'Strokeplay' : 'Match Play'}</span>
          <span className="badge badge-gray">{mitPlatzvorgabe ? '⛳ Mit Platzvorgabe' : '📋 Ohne Platzvorgabe'}</span>
        </div>

        {rangliste.length > 1 && (
          <div style={{ background: 'white', borderRadius: 16, padding: '12px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Rangliste</div>
            {rangliste.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: i < rangliste.length - 1 ? 8 : 0, marginBottom: i < rangliste.length - 1 ? 8 : 0, borderBottom: i < rangliste.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#f59e0b' : '#e5e7eb', color: i === 0 ? 'white' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>
                  {runde.format === 'stableford' ? `${s.punkte} Pkt` : s.brutto || '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Scorecards — tippen zum aufklappen
        </div>

        {spieler.map(s => (
          <SpielerScorecard
            key={s.id}
            spieler={s}
            scores={scores}
            holes={holes}
            format={runde.format}
            slope={slope}
            cr={cr}
            par={par}
            mitPlatzvorgabe={mitPlatzvorgabe}
          />
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, paddingBottom: 20 }}>
          {istAktiv && (
            <button className="btn btn-primary" onClick={() => navigate(`/runde/${id}/scoring`)}>
              🏌️ Scoring fortsetzen
            </button>
          )}
          {istEigner && istAktiv && (
            <button className="btn btn-outline" onClick={() => navigate(`/runde/${id}/bearbeiten`)}>
              ✏️ Runde bearbeiten
            </button>
          )}
          {istEigner && istAktiv && (
            <button
              onClick={async () => {
                if (!confirm('Runde als abgeschlossen markieren?')) return
                await updateDoc(doc(db, 'runden', id), { status: 'abgeschlossen' })
                setRunde({ ...runde, status: 'abgeschlossen' })
              }}
              style={{ padding: '12px', borderRadius: 12, border: '2px solid #22c55e', background: 'white', color: '#22c55e', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              ✓ Runde abschließen
            </button>
          )}
          {istEigner && !istAktiv && (
            <button
              onClick={async () => {
                await updateDoc(doc(db, 'runden', id), { status: 'aktiv' })
                setRunde({ ...runde, status: 'aktiv' })
              }}
              style={{ padding: '12px', borderRadius: 12, border: '2px solid var(--border)', background: 'white', color: 'var(--text)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              ↻ Runde wieder öffnen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}