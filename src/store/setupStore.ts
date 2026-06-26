// Setup 3단계 화면 간 선택 상태 공유
import { create } from 'zustand'

interface SetupStore {
  driverId: string | null
  trackId: string | null
  studyMinutes: number | null

  setDriver: (id: string) => void
  setTrack: (id: string) => void
  setStudyMinutes: (min: number | null) => void
  reset: () => void
}

export const useSetupStore = create<SetupStore>((set) => ({
  driverId: null,
  trackId: null,
  studyMinutes: null,

  setDriver: (id) => set({ driverId: id }),
  setTrack: (id) => set({ trackId: id }),
  setStudyMinutes: (min) => set({ studyMinutes: min }),
  reset: () => set({ driverId: null, trackId: null, studyMinutes: null }),
}))
