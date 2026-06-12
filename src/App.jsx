import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import Login from './pages/Login'
import TurnierErstellen from './pages/TurnierErstellen'
import TurnierDetail from './pages/TurnierDetail'
import './App.css'
import { db } from './firebase'

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
  const anzeigeName = nutzer?.displayName || nutzer?.email?.split('@')[0] || '?'
  const initial = anzeigeName[0]?.toUpperCase() || '?'

  return (
    <div className="page">
      <div className="home-hero">
        <div className="home-hero-top">
          <img src="/logo.jpg" alt="Logo" className="home-hero-logo" />
          <div className="home-hcp">HCP –</div>
        </div>
        <div className="home-avatar-circle">{initial}</div>
        <div className="home-name">{anzeigeName}</div>
        <div className="home-sub">Loyal & Gambling Society of Green Cap Golfers</div>
      </div>
      <div style={{padding: '16px'}}>
        <button className="btn-primary" onClick={() => navigate('/runde')}>
          Runde starten
        </button>
      </div>
      <div className="menu-list">
        <div className="menu-item" onClick={() => navigate('/turniere')}>
          <span className="menu-icon">🏆</span>
          <span className="menu-label">Turniere</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/rangliste')}>
          <span className="menu-icon">📊</span>
          <span className="menu-label">Rangliste</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/runden')}>
          <span className="menu-icon">🏌️</span>
          <span className="menu-label">Meine Runden</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/statistiken')}>
          <span className="menu-icon">📈</span>
          <span className="menu-label">Statistiken</span>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => navigate('/plaetze')}>
          <span className="menu-icon">📍</span>
          <span className="menu-label">Plätze</span>
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

  useEffect(() => {
    async function laden() {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')
      const q = query(collection(db, 'turniere'), orderBy('erstelltAm', 'desc'))
      const snap = await getDocs(q)
      setTurniere(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLaden(false)
    }
    laden()
  }, [])

  const formatLabel = { stableford: 'Stableford', strokeplay: 'Strokeplay', scramble: 'Scramble' }

  return (
    <div className="page">
      <PageHeader titel="Turniere" zurueck="/" />
      {laden ? (
        <div className="empty-state"><p>Lädt...</p></div>
      ) : turniere.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>Noch keine Turniere</h3>
          <p>Erstelle ein Turnier und lade deine Freunde ein.</p>
        </div>
      ) : (
        <div className="card-list">
          {turniere.map(t => (
            <div key={t.id} className="list-item" onClick={() => navigate(`/turnier/${t.id}`)}>
              <div className="list-icon">🏆</div>
              <div className="list-body">
                <div className="list-title">{t.name}</div>
                <div className="list-sub">{t.datum} · {formatLabel[t.format]} · {t.spieler?.length || 0} Spieler</div>
              </div>
              <span className={`badge ${t.status === 'offen' ? 'badge-green' : 'badge-amber'}`}>{t.status}</span>
            </div>
          ))}
        </div>
      )}
      <button className="fab" onClick={() => navigate('/turnier-erstellen')}>+</button>
    </div>
  )
}

function Rangliste() {
  return (
    <div className="page">
      <PageHeader titel="Rangliste" zurueck="/" />
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>Noch keine Einträge</h3>
        <p>Spiele eine Runde um in der Rangliste zu erscheinen.</p>
      </div>
    </div>
  )
}

function MeineRunden() {
  return (
    <div className="page">
      <PageHeader titel="Meine Runden" zurueck="/" />
      <div className="empty-state">
        <div className="empty-icon">🏌️</div>
        <h3>Noch keine Runden</h3>
        <p>Starte deine erste Runde über den Home Screen.</p>
      </div>
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
      <PageHeader titel="Plätze" zurueck="/" />
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

function Profil({ nutzer }) {
  const [name, setName] = useState(nutzer?.displayName || '')
  const [gespeichert, setGespeichert] = useState(false)

  async function nameSpeichern() {
    await updateProfile(auth.currentUser, { displayName: name })
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 2000)
  }

  return (
    <div className="page">
      <PageHeader titel="Profil" zurueck="/" />
      <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
        <div className="card">
          <div className="input-group">
            <label className="input-label">Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Dein Name" />
          </div>
          <div style={{color: 'var(--text-muted)', fontSize: 13, marginBottom: 12}}>
            {nutzer?.email}
          </div>
          <button className="btn-primary" onClick={nameSpeichern}>
            {gespeichert ? '✓ Gespeichert' : 'Name speichern'}
          </button>
        </div>
        <button className="btn-secondary" onClick={() => signOut(auth)}>Abmelden</button>
      </div>
    </div>
  )
}

export default function App() {
  const [nutzer, setNutzer] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setNutzer(u))
  }, [])

  if (nutzer === undefined) return null
  if (!nutzer) return <Login />

  return (
    <BrowserRouter>
      <nav className="bottom-nav">
        <NavLink to="/"><span className="nav-icon">🏠</span>Home</NavLink>
        <NavLink to="/turniere"><span className="nav-icon">🏆</span>Turniere</NavLink>
        <NavLink to="/rangliste"><span className="nav-icon">📊</span>Rangliste</NavLink>
        <NavLink to="/profil"><span className="nav-icon">👤</span>Profil</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home nutzer={nutzer} />} />
        <Route path="/turniere" element={<Turniere />} />
        <Route path="/turnier-erstellen" element={<TurnierErstellen />} />
        <Route path="/rangliste" element={<Rangliste />} />
        <Route path="/runden" element={<MeineRunden />} />
        <Route path="/statistiken" element={<Statistiken />} />
        <Route path="/plaetze" element={<Plaetze />} />
        <Route path="/profil" element={<Profil nutzer={nutzer} />} />
        <Route path="/turnier/:id" element={<TurnierDetail />} />
      </Routes>
    </BrowserRouter>
  )
}