import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Login from './pages/Login'
import './App.css'

function Home() {
  return <div className="page"><h1>Golf App</h1><p>Willkommen!</p></div>
}
function Turniere() {
  return <div className="page"><h1>Turniere</h1></div>
}
function Rangliste() {
  return <div className="page"><h1>Rangliste</h1></div>
}
function Profil() {
  return <div className="page"><h1>Profil</h1></div>
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
        <NavLink to="/">Home</NavLink>
        <NavLink to="/turniere">Turniere</NavLink>
        <NavLink to="/rangliste">Rangliste</NavLink>
        <NavLink to="/profil">Profil</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/turniere" element={<Turniere />} />
        <Route path="/rangliste" element={<Rangliste />} />
        <Route path="/profil" element={<Profil />} />
      </Routes>
    </BrowserRouter>
  )
}