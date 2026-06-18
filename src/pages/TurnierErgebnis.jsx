import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { PageHeader } from '../App'
import { COURSES } from '../data/courses'

function platzvorgabe(whi, slope, cr, par) {
  if (!whi) return 0
  return Math.round(whi * (slope / 113) + (cr - par))
}

function vorgabeAufLoch(pv, lochHcp) {
  if (pv <= 0) return 0
  const basis = Math.floor(pv / 18)
  const rest = pv % 18
  return basis + (lochHcp <= rest ? 1 : 0)
}

function stablefordPunkte(schlaege, par, vorgabe) {
  if (!schlaege) return null
  const netto = schlaege - vorgabe
  const diff = par - netto
  if (diff <= -2) return 0
  if (diff === -1) return 1
  if (diff === 0) return 2
  if (diff === 1) return 3
  if (diff === 2) return 4
  return 5
}

function berechneLG(spieler, scores, platz, turnier) {
  const lgSpieler = spieler.filter(s => s.lgOptIn)
  if (lgSpieler.length < 2) return null

  const n = lgSpieler.length
  const einsatz = turnier.einsatz || 1
  const istStableford = turnier.format === 'stableford'

  const ergebnisse = lgSpieler.map(s => {
    const pv = turnier.mitPlatzvorgabe && platz
      ? platzvorgabe(s.hcp, platz.sr_herren, platz.cr_herren, platz.par)
      : Math.round(s.hcp || 0)

    let totalPunkte = 0
    if (istStableford) {
      totalPunkte = platz.holes.reduce((sum, loch) => {
        const sc = scores[s.uid] && scores[s.uid][loch.nr]
        const lv = vorgabeAufLoch(pv, loch.hcp)
        return sum + (stablefordPunkte(sc, loch.par, lv) || 0)
      }, 0)
    } else {
      totalPunkte = platz.holes.reduce((sum, loch) => {
        const sc = scores[s.uid] && scores[s.uid][loch.nr]
        const lv = vorgabeAufLoch(pv, loch.hcp)
        return sum + (sc ? sc - lv : 0)
      }, 0)
    }
    return { ...s, totalPunkte }
  })

  const summe = ergebnisse.reduce((s, e) => s + e.totalPunkte, 0)
  const cut = summe / ergebnisse.length

  const abrechnung = ergebnisse.map(e => {
    const differenz = istStableford
      ? e.totalPunkte - cut
      : cut - e.totalPunkte

    const brutto = Math.abs(differenz) * einsatz * n

    if (differenz > 0) {
      return {
        ...e, differenz,
        zahlt: 0,
        bekommt: Math.round(brutto * 0.5 * 100) / 100,
        charity: Math.round(brutto * 0.5 * 100) / 100
      }
    } else if (differenz < 0) {
      return {
        ...e, differenz,
        zahlt: Math.round(brutto * 100) / 100,
        bekommt: 0,
        charity: 0
      }
    } else {
      return { ...e, differenz, zahlt: 0, bekommt: 0, charity: 0 }
    }
  })

  const gesamtCharity = abrechnung.reduce((s, e) => s + e.charity, 0)
  const gesamtKasse = abrechnung.reduce((s, e) => s + e.zahlt, 0)

  return {
    abrechnung,
    cut: Math.round(cut * 10) / 10,
    gesamtCharity,
    gesamtKasse,
    n
  }
}

export default function TurnierErgebnis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [turnier, setTurnier] = useState(null)
  const [laden, setLaden] = useState(true)
  const [abgeschlossen, setAbgeschlossen] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'turniere', id))
      if (snap.exists()) setTurnier({ id: snap.id, ...snap.data() })
      setLaden(false)
    }
    load()
  }, [id])

  if (laden) {
    return (
      <div className="page">
        <div className="empty-state"><p>Laedt...</p></div>
      </div>
    )
  }

  if (!turnier) {
    return (
      <div className="page">
        <div className="empty-state"><h3>Nicht gefunden</h3></div>
      </div>
    )
  }

  const platz = COURSES.find(c => c.id === turnier.platzId)
  const scores = turnier.scores || {}
  const istStableford = turnier.format === 'stableford'

  const rangliste = (turnier.spieler || []).map(s => {
    const pv = turnier.mitPlatzvorgabe && platz
      ? platzvorgabe(s.hcp, platz.sr_herren, platz.cr_herren, platz.par)
      : Math.round(s.hcp || 0)

    const brutto = platz ? platz.holes.reduce((sum, loch) => {
      const sc = scores[s.uid] && scores[s.uid][loch.nr]
      return sum + (sc || 0)
    }, 0) : 0

    if (istStableford) {
      const punkte = platz ? platz.holes.reduce((sum, loch) => {
        const sc = scores[s.uid] && scores[s.uid][loch.nr]
        const lv = vorgabeAufLoch(pv, loch.hcp)
        return sum + (stablefordPunkte(sc, loch.par, lv) || 0)
      }, 0) : 0
      return { ...s, punkte, brutto, pv }
    } else {
      const netto = platz ? platz.holes.reduce((sum, loch) => {
        const sc = scores[s.uid] && scores[s.uid][loch.nr]
        const lv = vorgabeAufLoch(pv, loch.hcp)
        return sum + (sc ? sc - lv : 0)
      }, 0) : 0
      return { ...s, punkte: netto, brutto, pv }
    }
  }).sort((a, b) => istStableford ? b.punkte - a.punkte : a.punkte - b.punkte)

  const lg = turnier.loyalGambling && platz
    ? berechneLG(turnier.spieler || [], scores, platz, turnier)
    : null

  async function turniereAbschliessen() {
    await updateDoc(doc(db, 'turniere', id), { status: 'abgeschlossen' })
    setAbgeschlossen(true)
    setTurnier({ ...turnier, status: 'abgeschlossen' })
  }

  return (
    <div className="page">
      <PageHeader titel="Ergebnis" zurueck={`/turnier/${id}`} />

      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px'}}>

        <div style={{textAlign: 'center', padding: '8px 0'}}>
          <div style={{fontSize: 20, fontWeight: 800}}>{turnier.name}</div>
          <div style={{fontSize: 14, color: 'var(--text-muted)', marginTop: 4}}>
            {turnier.datum} · {platz ? platz.name : ''}
          </div>
        </div>

        <div className="card">
          <div style={{fontWeight: 700, fontSize: 16, marginBottom: 12}}>
            Rangliste
          </div>
          {rangliste.map((s, i) => (
            <div key={s.uid} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < rangliste.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : 'var(--border-light)',
                color: i < 3 ? 'white' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, flexShrink: 0
              }}>
                {i + 1}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0
              }}>
                {s.name ? s.name[0].toUpperCase() : '?'}
              </div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 600, fontSize: 15}}>{s.name}</div>
                <div style={{fontSize: 12, color: 'var(--text-muted)'}}>
                  WHI {s.hcp} · PV {s.pv} · Brutto {s.brutto}
                </div>
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: i === 0 ? '#f59e0b' : 'var(--primary)'
              }}>
                {istStableford
                  ? s.punkte + ' Pkt'
                  : (s.punkte > 0 ? '+' : '') + s.punkte}
              </div>
            </div>
          ))}
        </div>

        {lg && (
          <div className="card">
            <div style={{fontWeight: 700, fontSize: 16, marginBottom: 4}}>
              Loyal & Gambling Abrechnung
            </div>
            <div style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 12}}>
              Cut: {lg.cut} · {lg.n} Teilnehmer · {turnier.einsatz} EUR pro Punkt
            </div>

            {lg.abrechnung.map((e, i) => (
              <div key={e.uid} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0',
                borderBottom: i < lg.abrechnung.length - 1 ? '1px solid var(--border-light)' : 'none'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: e.bekommt > 0 ? 'var(--success)' : 'var(--danger)',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0
                }}>
                  {e.name ? e.name[0].toUpperCase() : '?'}
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, fontSize: 14}}>{e.name}</div>
                  <div style={{fontSize: 12, color: 'var(--text-muted)'}}>
                    {e.totalPunkte} Pkt · {e.differenz > 0 ? '+' : ''}{Math.round(e.differenz * 10) / 10} zum Cut
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  {e.bekommt > 0 ? (
                    <div style={{color: 'var(--success)', fontWeight: 700, fontSize: 16}}>
                      +{e.bekommt.toFixed(2)} EUR
                    </div>
                  ) : e.zahlt > 0 ? (
                    <div style={{color: 'var(--danger)', fontWeight: 700, fontSize: 16}}>
                      -{e.zahlt.toFixed(2)} EUR
                    </div>
                  ) : (
                    <div style={{color: 'var(--text-muted)', fontWeight: 600, fontSize: 14}}>
                      0.00 EUR
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 12, padding: '12px',
              background: '#f0fdf4', borderRadius: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{fontSize: 13, fontWeight: 600, color: 'var(--success)'}}>
                  Charity
                </div>
                <div style={{fontSize: 12, color: 'var(--text-muted)'}}>50% der Gewinne</div>
              </div>
              <div style={{fontSize: 20, fontWeight: 800, color: 'var(--success)'}}>
                {lg.gesamtCharity.toFixed(2)} EUR
              </div>
            </div>

            <div style={{
              marginTop: 8, padding: '12px',
              background: '#fef3c7', borderRadius: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{fontSize: 13, fontWeight: 600, color: '#92400e'}}>
                Gesamtkasse
              </div>
              <div style={{fontSize: 20, fontWeight: 800, color: '#92400e'}}>
                {lg.gesamtKasse.toFixed(2)} EUR
              </div>
            </div>
          </div>
        )}

        {turnier.status === 'offen' && (
          <button className="btn-primary" onClick={turniereAbschliessen}
            style={{background: abgeschlossen ? 'var(--success)' : 'var(--primary)'}}>
            {abgeschlossen ? 'Turnier abgeschlossen' : 'Turnier abschliessen'}
          </button>
        )}

        <button className="btn-secondary" onClick={() => navigate('/turnier/' + id)}>
          Zurueck zum Turnier
        </button>

      </div>
    </div>
  )
}