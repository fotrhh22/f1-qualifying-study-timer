/** Official 2026 FIA entry names, keyed by the short team names used by the app. */
export const TEAM_FULL_NAME: Record<string, string> = {
  McLaren: 'McLaren Mastercard F1 Team',
  Mercedes: 'Mercedes-AMG PETRONAS F1 Team',
  'Red Bull': 'Oracle Red Bull Racing',
  Ferrari: 'Scuderia Ferrari HP',
  Williams: 'Atlassian Williams F1 Team',
  'Racing Bulls': 'Visa Cash App Racing Bulls F1 Team',
  'Aston Martin': 'Aston Martin Aramco F1 Team',
  Haas: 'TGR Haas F1 Team',
  Audi: 'Audi Revolut F1 Team',
  Alpine: 'BWT Alpine F1 Team',
  Cadillac: 'Cadillac Formula 1 Team',
}

export function getFullTeamName(teamName: string): string {
  return TEAM_FULL_NAME[teamName] ?? teamName
}
