// WHS / ÖGV Handicap Berechnungen

// MIT Platzvorgabe: Course Handicap = HCPI × (Slope / 113) + (CR – Par)
export function berechneSpielvorgabe(hcpi, slope, cr, par, mitPlatzvorgabe = true) {
  if (!mitPlatzvorgabe) return Math.round(hcpi)
  if (!slope || !cr || !par) return Math.round(hcpi)
  return Math.round(hcpi * (slope / 113) + (cr - par))
}

// Vorgabeschläge auf einem Loch
export function vorgabeAufLoch(spielvorgabe, lochHcp) {
  const basis = Math.floor(spielvorgabe / 18)
  const rest = spielvorgabe % 18
  return basis + (lochHcp <= rest ? 1 : 0)
}

// Stableford Punkte
export function stablefordPunkte(schlaege, par, spielvorgabe, lochHcp) {
  if (!schlaege || schlaege === 0) return null
  const vorgabe = vorgabeAufLoch(spielvorgabe, lochHcp)
  const netto = schlaege - vorgabe
  const diff = par - netto
  if (diff >= 3) return 5
  if (diff === 2) return 4
  if (diff === 1) return 3
  if (diff === 0) return 2
  if (diff === -1) return 1
  return 0
}

// Netto Score (für Strokeplay)
export function nettoScore(schlaege, spielvorgabe, lochHcp) {
  return schlaege - vorgabeAufLoch(spielvorgabe, lochHcp)
}