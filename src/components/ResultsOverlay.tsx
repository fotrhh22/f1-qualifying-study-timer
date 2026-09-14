'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import type { RankingEntry } from '@/engine/types'
import { DRIVER_FACE } from '@/data/images'
import { getFullTeamName } from '@/data/teamNames'
import { formatGap, formatLapTime, formatStudyTime } from '@/engine/lapTime'
import { computeRanking, useRacers, useSession, useSessionStore, useTrack } from '@/store/sessionStore'
import { useSetupStore } from '@/store/setupStore'

export default function ResultsOverlay() {
  const router = useRouter()
  const session = useSession()
  const racers = useRacers()
  const track = useTrack()
  const { stopSession } = useSessionStore()
  const resetSetup = useSetupStore((state) => state.reset)
  const ranking = useMemo(() => (racers ? computeRanking(racers) : []), [racers])

  if (!session || !track) return null

  const userEntry = ranking.find((entry) => entry.isUser)
  const top3 = ranking.slice(0, 3)
  const focusTime = Math.max(0, session.focusElapsedMs)

  const leaveResults = (destination: string) => {
    stopSession()
    resetSetup()
    router.push(destination)
  }

  return (
    <div className="results-overlay animate-fade-in">
      <section className="results-panel" aria-labelledby="results-title">
        <header className="results-header">
          <div className="results-header__track">
            <span className="results-header__flag" aria-hidden="true">{track.flag}</span>
            <div>
              <p className="results-eyebrow">Session complete</p>
              <p className="results-track-name">{track.gpName}</p>
            </div>
          </div>
          <div className="results-header__title">
            <span className="results-complete-dot" aria-hidden="true" />
            <h1 id="results-title">Qualifying results</h1>
          </div>
        </header>

        <div className="results-body">
          {userEntry && (
            <section className="results-user-hero" aria-label="Your session result">
              <div className="results-user-hero__heading">Your result</div>
              <div className="results-user-hero__content">
                <div className="results-user-position">
                  <strong>P{userEntry.position}</strong>
                  <span>/ 22</span>
                </div>
                <div className="results-user-meta" aria-label="Your session summary">
                  <span><strong>{formatStudyTime(focusTime)}</strong> Focus</span>
                  <i aria-hidden="true">·</i>
                  <span><strong>{userEntry.totalLaps}</strong> Laps</span>
                  <i aria-hidden="true">·</i>
                  <span>Best <strong>{userEntry.bestLap !== null ? formatLapTime(userEntry.bestLap) : '—'}</strong></span>
                </div>
              </div>
            </section>
          )}

          {top3.length >= 3 && (
            <section className="results-podium-section" aria-label="Top three drivers">
              <div className="results-podium-heading">
                <strong>Top 3</strong>
                <span>Session podium</span>
              </div>
              <div className="results-podium">
                <PodiumDriver entry={top3[1]} place={2} />
                <PodiumDriver entry={top3[0]} place={1} />
                <PodiumDriver entry={top3[2]} place={3} />
              </div>
            </section>
          )}

          <section className="results-classification" aria-label="Final classification">
            <div className="results-table-header results-table-grid" aria-hidden="true">
              <span>POS</span>
              <span>DRIVER</span>
              <span className="results-team-col">TEAM</span>
              <span>TIME</span>
              <span>GAP</span>
              <span>LAP</span>
            </div>
            <div className="results-table" role="table" aria-label="Final qualifying classification">
              {ranking.map((entry) => (
                <ClassificationRow key={entry.racerId} entry={entry} />
              ))}
            </div>
          </section>
        </div>

        <footer className="results-actions">
          <button onClick={() => leaveResults('/')} className="results-button results-button--secondary">
            <span aria-hidden="true">←</span>
            <span>Home</span>
          </button>
          <button onClick={() => leaveResults('/setup/driver')} className="results-button results-button--primary">
            <span>New session</span>
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      </section>
    </div>
  )
}

function ClassificationRow({ entry }: { entry: RankingEntry }) {
  const hasLap = entry.bestLap !== null
  const medal = entry.position <= 3 ? entry.position : undefined
  const nameParts = entry.name.trim().split(/\s+/)
  const surname = nameParts.pop() ?? entry.name
  const givenName = nameParts.join(' ')

  return (
    <div
      className="results-table-row results-table-grid"
      data-user={entry.isUser || undefined}
      data-dnf={(entry.isDnf && !hasLap) || undefined}
      role="row"
    >
      <span className="results-position" data-medal={medal}>{entry.position}</span>
      <div className="results-driver-cell">
        <div className="results-driver-name">
          {givenName && <span>{givenName} </span>}
          <strong>{surname}</strong>
        </div>
        {entry.isUser && <span className="results-driver-you">YOU</span>}
      </div>
      <span className="results-team-col results-team-name" title={getFullTeamName(entry.teamName)}>
        {getFullTeamName(entry.teamName)}
      </span>
      <span className="results-lap-time">
        {entry.isDnf && !hasLap ? 'DNF' : hasLap ? formatLapTime(entry.bestLap!) : '—'}
      </span>
      <span className="results-gap">
        {entry.position > 1 && hasLap && entry.gap !== null ? formatGap(entry.gap) : '—'}
      </span>
      <span className="results-lap-count">{entry.totalLaps || '—'}</span>
    </div>
  )
}

function PodiumDriver({ entry, place }: { entry: RankingEntry; place: 1 | 2 | 3 }) {
  const nameParts = entry.name.trim().split(' ')
  const displayName = nameParts.length > 1
    ? `${nameParts[0][0]}. ${nameParts[nameParts.length - 1]}`
    : entry.name

  return (
    <article
      className="results-podium-driver"
      data-place={place}
      data-user={entry.isUser || undefined}
    >
      {DRIVER_FACE[entry.racerId] && (
        <Image
          className="results-podium-driver__image"
          src={DRIVER_FACE[entry.racerId]}
          alt={entry.name}
          fill
          sizes="(max-width: 900px) 32vw, 180px"
          unoptimized
        />
      )}
      <div className="results-podium-driver__position">P{place}</div>
      {entry.isUser && <span className="results-you-badge">You</span>}
      <div className="results-podium-driver__caption">
        <span className="results-team-stripe" style={{ background: entry.teamColor }} />
        <div>
          <strong>{displayName}</strong>
          <span>{entry.bestLap !== null ? formatLapTime(entry.bestLap) : 'No time'}</span>
        </div>
      </div>
    </article>
  )
}
