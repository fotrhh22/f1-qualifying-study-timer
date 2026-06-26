import { DriverData } from '@/engine/types'

// 2026 F1 그리드 22명 (실제 시즌 기준)
// basePace: 팀 경쟁력 + 드라이버 개인 기량 반영 (90~99)
// 세션 시작 시 ±2 범위로 랜덤 변동

export const DRIVERS: DriverData[] = [
  // ── McLaren ──────────────────────────────────
  {
    id: 'NOR',
    name: 'Lando Norris',
    shortName: 'Norris',
    team: 'McLaren',
    teamColor: '#FF8000',
    basePace: 98,
    number: 1,
  },
  {
    id: 'PIA',
    name: 'Oscar Piastri',
    shortName: 'Piastri',
    team: 'McLaren',
    teamColor: '#FF8000',
    basePace: 97,
    number: 81,
  },

  // ── Ferrari ──────────────────────────────────
  {
    id: 'LEC',
    name: 'Charles Leclerc',
    shortName: 'Leclerc',
    team: 'Ferrari',
    teamColor: '#E8002D',
    basePace: 97,
    number: 16,
  },
  {
    id: 'HAM',
    name: 'Lewis Hamilton',
    shortName: 'Hamilton',
    team: 'Ferrari',
    teamColor: '#E8002D',
    basePace: 96,
    number: 44,
  },

  // ── Red Bull ─────────────────────────────────
  {
    id: 'VER',
    name: 'Max Verstappen',
    shortName: 'Verstappen',
    team: 'Red Bull',
    teamColor: '#3671C6',
    basePace: 98,
    number: 33,
  },
  {
    id: 'HAD',
    name: 'Isack Hadjar',
    shortName: 'Hadjar',
    team: 'Red Bull',
    teamColor: '#3671C6',
    basePace: 92,
    number: 6,
  },

  // ── Mercedes ─────────────────────────────────
  {
    id: 'RUS',
    name: 'George Russell',
    shortName: 'Russell',
    team: 'Mercedes',
    teamColor: '#27F4D2',
    basePace: 95,
    number: 63,
  },
  {
    id: 'ANT',
    name: 'Kimi Antonelli',
    shortName: 'Antonelli',
    team: 'Mercedes',
    teamColor: '#27F4D2',
    basePace: 93,
    number: 12,
  },

  // ── Aston Martin ─────────────────────────────
  {
    id: 'ALO',
    name: 'Fernando Alonso',
    shortName: 'Alonso',
    team: 'Aston Martin',
    teamColor: '#229971',
    basePace: 94,
    number: 14,
  },
  {
    id: 'STR',
    name: 'Lance Stroll',
    shortName: 'Stroll',
    team: 'Aston Martin',
    teamColor: '#229971',
    basePace: 90,
    number: 18,
  },

  // ── Alpine ───────────────────────────────────
  {
    id: 'GAS',
    name: 'Pierre Gasly',
    shortName: 'Gasly',
    team: 'Alpine',
    teamColor: '#FF87BC',
    basePace: 91,
    number: 10,
  },
  {
    id: 'COL',
    name: 'Franco Colapinto',
    shortName: 'Colapinto',
    team: 'Alpine',
    teamColor: '#FF87BC',
    basePace: 90,
    number: 43,
  },

  // ── Haas ─────────────────────────────────────
  {
    id: 'OCO',
    name: 'Esteban Ocon',
    shortName: 'Ocon',
    team: 'Haas',
    teamColor: '#B6BABD',
    basePace: 91,
    number: 31,
  },
  {
    id: 'BEA',
    name: 'Oliver Bearman',
    shortName: 'Bearman',
    team: 'Haas',
    teamColor: '#B6BABD',
    basePace: 90,
    number: 87,
  },

  // ── Williams ─────────────────────────────────
  {
    id: 'ALB',
    name: 'Alexander Albon',
    shortName: 'Albon',
    team: 'Williams',
    teamColor: '#64C4FF',
    basePace: 92,
    number: 23,
  },
  {
    id: 'SAI',
    name: 'Carlos Sainz',
    shortName: 'Sainz',
    team: 'Williams',
    teamColor: '#64C4FF',
    basePace: 93,
    number: 55,
  },

  // ── Audi ─────────────────────────────────────
  {
    id: 'HUL',
    name: 'Nico Hülkenberg',
    shortName: 'Hülkenberg',
    team: 'Audi',
    teamColor: '#9B0000',
    basePace: 91,
    number: 27,
  },
  {
    id: 'BOR',
    name: 'Gabriel Bortoleto',
    shortName: 'Bortoleto',
    team: 'Audi',
    teamColor: '#9B0000',
    basePace: 90,
    number: 5,
  },

  // ── Racing Bulls ─────────────────────────────
  {
    id: 'LAW',
    name: 'Liam Lawson',
    shortName: 'Lawson',
    team: 'Racing Bulls',
    teamColor: '#6CD3BF',
    basePace: 91,
    number: 30,
  },
  {
    id: 'LIN',
    name: 'Arvid Lindblad',
    shortName: 'Lindblad',
    team: 'Racing Bulls',
    teamColor: '#6CD3BF',
    basePace: 90,
    number: 41,
  },

  // ── Cadillac ─────────────────────────────────
  {
    id: 'PER',
    name: 'Sergio Pérez',
    shortName: 'Pérez',
    team: 'Cadillac',
    teamColor: '#CCCCCC',
    basePace: 91,
    number: 11,
  },
  {
    id: 'BOT',
    name: 'Valtteri Bottas',
    shortName: 'Bottas',
    team: 'Cadillac',
    teamColor: '#CCCCCC',
    basePace: 91,
    number: 77,
  },
]

export const DRIVER_MAP: Record<string, DriverData> = Object.fromEntries(
  DRIVERS.map((d) => [d.id, d])
)
