import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import Login from './pages/Login'
import TurnierErstellen from './pages/TurnierErstellen'
import TurnierDetail from './pages/TurnierDetail'
import TurnierBeitreten from './pages/TurnierBeitreten'
import TurnierBearbeiten from './pages/TurnierBearbeiten'
import TurnierErgebnis from './pages/TurnierErgebnis'
import LiveScoring from './pages/LiveScoring'
import Profil from './pages/Profil'
import Freunde from './pages/Freunde'
import RundeErstellen from './pages/RundeErstellen'
import MeineRunden from './pages/MeineRunden'
import RundeScoring from './pages/RundeScoring'
import RundeDetail from './pages/RundeDetail'
import RundeBearbeiten from './pages/RundeBearbeiten'
import './App.css'

export function PageHeader({ titel, zurueck }) {
  const navigate = useNavigate()
  return (
    <div className="page-header">
      <button className="page-header-back" onClick={() => navigate(zurueck || '/')}>
        <span>‹</span>
      </button>
      <h1>{titel}</h1>
      <div style={{width: 40}} />
    </div>
  )
}

function Home({ nutzer }) {
  const navigate = useNavigate()
  const [whi, setWhi] = useState('—')
  const anzeigeName = nutzer?.displayName || nutzer?.email?.split('@')[0] || '?'
  const initial = anzeigeName[0]?.toUpperCase() || '?'

  useEffect(() => {
    async function load() {
      const { doc, getDoc } = await import('firebase/firestore')
      const snap = await getDoc(doc(db, 'spieler', nutzer.uid))
      if (snap.exists()) setWhi(snap.data().whi || '—')
    }
    load()
  }, [nutzer.uid])

  return (
    <div className="page">
      <div className="home-hero">
        <div className="home-hero-top">
          <img src="/logo.jpg" alt="Logo" className="home-hero-logo" />
          <div className="home-hcp">WHI {whi}</div>
        </div>
        <div className="home-avatar-circle">{initial}</div>
        <div className="home-name">{anzeigeName}</div>
        <div className="home-sub">Loyal & Gambling Society of Green Cap Golfers</div>
      </div>
      <div style={{padding: '16px 16px 8px'}}>
        <button className="btn-primary" onClick={() => navigate('/runde/neu')}>
          Runde starten
        </button>
      </div>
      <div className="menu-list">
        <div className="menu-item" onClick={() => navigate('/turniere')}>
          <span className="menu-icon">🏆</span>
          <span className="menu-label">Turniere</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/meine-runden')}>
          <span className="menu-icon">🏌️</span>
          <span className="menu-label">Meine Runden</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/plaetze')}>
          <span className="menu-icon">📍</span>
          <span className="menu-label">Plaetze</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/statistiken')}>
          <span className="menu-icon">📈</span>
          <span className="menu-label">Statistiken</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/profil')}>
          <span className="menu-icon">👤</span>
          <span className="menu-label">Profil & Einstellungen</span>
          <span className="menu-arrow">›</span>
        </div>
      </div>
    </div>
  )
}

function Turniere() {
  const navigate = useNavigate()
  const [turniere, setTurniere] = useState([])
  const [laden, setLaden] = useState(true)
  const [filter, setFilter] = useState('alle')

  useEffect(() => {
    async function load() {
      const q = query(collection(db, 'turniere'), orderBy('erstelltAm', 'desc'))
      const snap = await getDocs(q)
      setTurniere(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLaden(false)
    }
    load()
  }, [])

  const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }
  const uid = auth.currentUser?.uid
  const typIcon = { standard: '🏌️', turnier: '🏆', turnier_lg: '🎲', open_reise: '✈️' }

  const gefilterteTurniere = turniere.filter(t => {
    const ichBin = t.spieler?.some(s => s.uid === uid)
    if (filter === 'meine') return ichBin
    if (filter === 'offen') return t.sichtbarkeit === 'oeffentlich' && !ichBin && t.status === 'offen'
    return t.sichtbarkeit === 'oeffentlich' || ichBin
  })

  return (
    <div className="page">
      <PageHeader titel="Turniere" zurueck="/" />
      <div className="filter-tabs">
        <button className={`filter-tab ${filter === 'alle' ? 'aktiv' : ''}`}
          onClick={() => setFilter('alle')}>Alle</button>
        <button className={`filter-tab ${filter === 'meine' ? 'aktiv' : ''}`}
          onClick={() => setFilter('meine')}>Meine</button>
        <button className={`filter-tab ${filter === 'offen' ? 'aktiv' : ''}`}
          onClick={() => setFilter('offen')}>Beitreten</button>
      </div>
      {laden ? (
        <div className="empty-state"><p>Laedt...</p></div>
      ) : gefilterteTurniere.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>{filter === 'offen' ? 'Keine offenen Turniere' : 'Noch keine Turniere'}</h3>
          <p>{filter === 'offen'
            ? 'Aktuell gibt es keine Turniere denen du beitreten kannst.'
            : 'Erstelle ein Turnier und lade deine Freunde ein.'}</p>
        </div>
      ) : (
        <div className="card-list">
          {gefilterteTurniere.map(t => {
            const ichBin = t.spieler?.some(s => s.uid === uid)
            return (
              <div key={t.id} className="list-item" onClick={() => navigate(`/turnier/${t.id}`)}>
                <div className="list-icon">{typIcon[t.typ] || '🏆'}</div>
                <div className="list-body">
                  <div className="list-title">{t.name}</div>
                  <div className="list-sub">
                    {t.datum || t.tage?.[0]?.datum} · {formatLabel[t.format]} · {t.spieler?.length || 0} Spieler
                  </div>
                  <div style={{marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    {t.sichtbarkeit === 'oeffentlich' && <span className="badge badge-blue">Oeffentlich</span>}
                    {t.loyalGambling && <span className="badge badge-amber">L&G</span>}
                    {ichBin && <span className="badge badge-green">Dabei</span>}
                  </div>
                </div>
                <span className={`badge ${t.status === 'offen' ? 'badge-green' : 'badge-amber'}`}>
                  {t.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <button className="fab" onClick={() => navigate('/turnier-erstellen')}>+</button>
    </div>
  )
}

function Statistiken() {
  return (
    <div className="page">
      <PageHeader titel="Statistiken" zurueck="/" />
      <div className="empty-state">
        <div className="empty-icon">📈</div>
        <h3>Noch keine Daten</h3>
        <p>Nach deiner ersten Runde erscheinen hier deine Statistiken.</p>
      </div>
    </div>
  )
}

function Plaetze() {
  const navigate = useNavigate()
  const plaetze = [
    { id: 'colony-west', name: 'Colony Club Gutenhof', sub: 'West Kurs · Par 73', icon: '⛳' },
    { id: 'colony-ost', name: 'Colony Club Gutenhof', sub: 'Ost Kurs · Par 73', icon: '⛳' },
    { id: 'haugschlag-waldviertel', name: 'Golfresort Haugschlag', sub: 'Waldviertel · Par 72', icon: '⛳' },
    { id: 'haugschlag-haugschlag', name: 'Golfresort Haugschlag', sub: 'Haugschlag · Par 72', icon: '⛳' },
  ]
  return (
    <div className="page">
      <PageHeader titel="Plaetze" zurueck="/" />
      <div className="card-list">
        {plaetze.map(p => (
          <div key={p.id} className="list-item" onClick={() => navigate(`/platz/${p.id}`)}>
            <div className="list-icon">{p.icon}</div>
            <div className="list-body">
              <div className="list-title">{p.name}</div>
              <div className="list-sub">{p.sub}</div>
            </div>
            <span className="list-arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [nutzer, setNutzer] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setNutzer(u)
      if (u) {
        const ziel = sessionStorage.getItem('nachLogin')
        if (ziel) {
          sessionStorage.removeItem('nachLogin')
          window.location.href = ziel
        }
      }
    })
  }, [])

  if (nutzer === undefined) return null

  if (!nutzer) {
    const ziel = window.location.pathname
    if (ziel !== '/' && ziel !== '') sessionStorage.setItem('nachLogin', ziel)
    return <Login />
  }

  return (
    <BrowserRouter>
      <nav className="bottom-nav">
        <NavLink to="/"><span className="nav-icon">🏠</span>Home</NavLink>
        <NavLink to="/turniere"><span className="nav-icon">🏆</span>Turniere</NavLink>
        <NavLink to="/meine-runden"><span className="nav-icon">🏌️</span>Runden</NavLink>
        <NavLink to="/profil"><span className="nav-icon">👤</span>Profil</NavLink>
      </nav>
     <Routes>
        <Route path="/" element={<Home nutzer={nutzer} />} />
        <Route path="/turniere" element={<Turniere />} />
        <Route path="/turnier-erstellen" element={<TurnierErstellen />} />
        <Route path="/turnier/:id" element={<TurnierDetail />} />
        <Route path="/turnier/:id/beitreten" element={<TurnierBeitreten />} />
        <Route path="/turnier/:id/bearbeiten" element={<TurnierBearbeiten />} />
        <Route path="/turnier/:id/scoring" element={<LiveScoring />} />
        <Route path="/turnier/:id/ergebnis" element={<TurnierErgebnis />} />
        <Route path="/meine-runden" element={<MeineRunden />} />
        <Route path="/runde/neu" element={<RundeErstellen />} />
        <Route path="/runde/:id" element={<RundeDetail />} />
        <Route path="/runde/:id/scoring" element={<RundeScoring />} />
        <Route path="/runde/:id/bearbeiten" element={<RundeBearbeiten />} />
        <Route path="/statistiken" element={<Statistiken />} />
        <Route path="/plaetze" element={<Plaetze />} />
        <Route path="/profil" element={<Profil nutzer={nutzer} />} />
        <Route path="/freunde" element={<Freunde />} />
        </Routes>
    </BrowserRouter>
  )
}