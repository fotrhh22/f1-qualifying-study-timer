# Session UI Redesign Plan

## 1. Objective

Redesign `/session` around the information architecture in the current session reference screen while removing the repeated rounded-card and pill treatment.

The target is an F1 broadcast timing wall, not a generic dashboard:

- one continuous full-screen surface;
- hierarchy created with typography, alignment, spacing, and 1 px rules;
- color reserved for race state, team identity, sector identity, and destructive actions;
- rounded containers reserved for controls that must visibly afford interaction and for modal dialogs;
- visual continuity with the setup flow through the red top rule, uppercase labels, strong white headings, thin dividers, and a fixed bottom action rail.

This phase changes presentation and layout only. Session state, race engine behavior, ranking calculations, track geometry, PIT behavior, and results logic must remain unchanged unless a visual state cannot be rendered without a small adapter.

## 2. Current Diagnosis

The current UI creates hierarchy almost entirely through nested containers:

- `dashboard-panel` gives the header, timer/ranking column, circuit, and broadcast the same rounded panel treatment;
- `surface-card` creates a second card inside the timer panel and is reused by the floating control dock;
- `metric-card` turns Fastest Lap and Current Gap into two more cards;
- `status-pill` wraps every state in a pill;
- `control-button` applies another rounded rectangle to every action;
- broadcast events receive their own card surface;
- the TrackMap is clipped inside another rounded rectangle.

The result is visually polished at the component level but weak as a single product screen. It also breaks continuity with the setup pages, where the strongest recurring devices are the top red rule, large editorial headings, simple bordered selections, and a fixed footer.

## 3. Target Composition

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3 px red session rule
 DRIVER / TEAM             QUALIFYING            CIRCUIT · LOCAL TIME
──────────────────────────────────────────────────────────────────────
 TIMER + RANKING │              LIVE CIRCUIT               │ BROADCAST
                 │                                         │
 01:29:55        │                                         │ event rows
 REMAINING       │               TRACK MAP                 │
 ─────────────── │                                         │
 P  DRIVER  GAP  │                                         │
──────────────────────────────────────────────────────────────────────
 FOCUS 01:29:55             ● ON TRACK          BREAK  │  END SESSION
```

### Desktop proportions

- Header: 60 px plus the 3 px red rule.
- Footer command rail: 58–64 px.
- Left timing rail: `clamp(248px, 19vw, 292px)`.
- Right broadcast rail: `clamp(272px, 21vw, 320px)`.
- Circuit: remaining width, never less than 480 px at the three-column breakpoint.
- Outer content gap: 0 px. Columns are separated by rules, not gutters.

### Compact landscape

- Below 1180 px, reduce both side rails and typography one step.
- Below 1024 px, hide the broadcast rail and retain timer/ranking plus circuit.
- Do not collapse into a portrait/mobile card stack; the product already requires landscape orientation.

## 4. Visual Grammar

### Surfaces

Use only three non-modal surface levels:

1. `session-canvas`: app background.
2. `session-rail`: header, side rails, and footer.
3. `session-stage`: track area.

Do not place a bordered surface inside another bordered surface. Hover color may be used for interactive rows, but it must not make the row look like a freestanding card.

### Borders and corners

- Main sections: `border-radius: 0`.
- Interactive rectangular buttons: 3–6 px.
- Compact badges such as PIT or DNF: 2–3 px.
- Dialogs: 10–12 px.
- Circular driver portraits, team marks, and status lights are allowed because the shape carries meaning.
- Remove decorative shadows from the session screen. Retain a shadow only behind modal dialogs.

### Status language

Replace status pills with an inline status signal:

```text
● ON TRACK     ● IN PIT     ● FAST FORWARD     ● FINISHED
```

The dot carries the status color. Text remains compact and high contrast. The status element must not have a background, border, or capsule shape.

### Typography

- Editorial/UI labels: current sans stack, uppercase, tracked.
- Timing, gaps, lap times, and clock: mono stack with tabular numerals.
- One dominant number per region: the remaining study time in the left rail.
- Avoid multiple similarly sized white headings competing with the track name and timer.

### Color

- Red: product/session identity and destructive confirmation.
- Lime: active focus or session leader.
- Yellow: PIT/break state.
- Orange: fast-forward state.
- Team colors: user identity and driver markers only.
- Magenta/yellow/cyan: circuit sectors only.

## 5. Component Plan

### Phase A — Session primitives

File: `src/app/globals.css`

- Add session-scoped tokens and classes; do not globally redefine setup-page primitives.
- Introduce:
  - `.session-frame`
  - `.session-top-rule`
  - `.session-header`
  - `.session-grid`
  - `.session-section`
  - `.session-divider-heading`
  - `.session-inline-metric`
  - `.session-status`
  - `.session-command-rail`
  - `.session-command`
- Remove `/session` dependencies on `dashboard-panel`, `surface-card`, `metric-card`, and `status-pill` before deleting or repurposing those legacy rules.
- Preserve dialog classes as a separate visual system.

Completion criteria:

- No main session region uses a panel radius or shadow.
- Main grid alignment is stable at 2560×1440, 1440×900, 1280×800, and 1024×768 landscape viewports.

### Phase B — Frame and header

Files:

- `src/app/session/page.tsx`
- `src/components/session/SessionHeader.tsx`

Changes:

- Remove the outer 16 px gutters and 16 px card gaps.
- Add the same 3 px red rule used by setup pages.
- Convert the header into a flat three-column telemetry bar with a bottom divider.
- Keep the driver portrait, but remove its glow and the rounded vertical team pill.
- Represent team identity with a straight 3 px color rail or short underline.
- Reduce the F1 logo block radius to 4 px or render it as a simple red mark without a container.
- Keep QUALIFYING centered so the screen retains a strong session identity.

Completion criteria:

- The header reads as part of one application frame, not a card placed inside it.
- Driver, session, and circuit/clock columns retain alignment as names change.

### Phase C — Timer and ranking rail

Files:

- `src/components/session/DriverSidebar.tsx`
- `src/components/StudyTimer.tsx`
- `src/components/RankingBoard.tsx`

Changes:

- Remove the nested `surface-card` around the timer.
- Place Focus Timer, state, remaining time, progress, elapsed, and goal directly in the rail.
- Replace the FOCUSING pill with the inline status signal.
- Change the rounded progress bar to a 2–3 px square-ended gauge.
- Use one divider between timer and ranking.
- Retain row-based ranking and the user's red left rail.
- Reduce oversized circular white team-logo holders; use a smaller neutral mark area while preserving legibility.
- Keep PIT/DNF markers as compact squared badges, not pills.

Completion criteria:

- The timer is the only dominant number in the left rail.
- At least eight ranking rows remain visible at 768 px viewport height.
- Ranking position, driver code, state, and gap columns do not jump when values change.

### Phase D — Circuit stage

Files:

- `src/components/session/CircuitPanel.tsx`
- `src/components/TrackMap.tsx`

Changes:

- Replace the rounded CircuitPanel shell with the central stage.
- Keep circuit title and record metadata on the left.
- Render Fastest Lap and Current Gap as right-aligned inline metric columns separated by vertical rules.
- Remove metric backgrounds, borders, and radii.
- Remove the TrackMap inset margin and rounded clipping wrapper.
- Give the map stage one continuous background.
- Preserve sector colors, corner numbers, driver markers, and toggle behavior.
- Make the legend and corner toggle behave like map annotations, not controls in pills.

Completion criteria:

- TrackMap occupies at least 70% of the circuit stage height.
- All 22 circuits remain fully visible with markers and labels inside their computed bounds.
- Metric value changes do not resize or reposition the track.

### Phase E — Broadcast rail

Files:

- `src/components/BroadcastFeed.tsx`
- `src/app/globals.css`

Changes:

- Remove per-event card surfaces and rounded corners.
- Render events as chronological log rows separated by 1 px rules.
- Use a 2 px left accent only for priority events such as flags, DNF, fastest lap, and FIA decisions.
- Keep driver badges compact and squared; avoid a dark badge inside a dark card.
- Remove the rounded WAITING container and show a quiet empty-state label directly in the rail.
- Keep event animations limited to opacity and a 3–4 px vertical entry shift.

Completion criteria:

- Five adjacent events read as one feed rather than five separate widgets.
- Priority remains clear in grayscale through typography and rule weight, not color alone.

### Phase F — Command rail and dialogs

Files:

- `src/components/session/SessionControlDock.tsx`
- `src/components/PitModal.tsx`

Changes:

- Replace the centered floating dock with a full-width bottom rail.
- Divide focus time, status, and commands using vertical rules.
- Render Break and End Session as wide rectangular commands with 4 px corners.
- Reserve filled red for hover/pressed state and the final destructive confirmation.
- Replace the nested fast-forward control card with a segmented `−  ×12  +` control.
- Keep modals visually elevated and moderately rounded because they are separate interaction layers.

Completion criteria:

- Footer width and placement match the setup flow's fixed action area.
- ON TRACK, APPROACHING PIT, PIT, DNF, FAST FORWARD, and FINISHED states do not alter the rail height.
- All buttons retain at least a 44 px target size.

### Phase G — Results continuity

File: `src/components/ResultsOverlay.tsx`

Changes:

- Do not redesign the results interaction in the first pass.
- After the session shell is stable, align ResultsOverlay typography, divider system, user highlight, and buttons with the new session language.
- Keep the overlay as a dialog-like terminal state rather than turning it into another dashboard card collection.

Completion criteria:

- The transition from session to results preserves the same header scale, red accent, mono metrics, and row geometry.
- Result summary metrics are not placed in separate rounded cards.

## 6. Implementation Sequence

Execute in this order to minimize visual regressions:

1. Add session-scoped tokens and primitives.
2. Convert the page frame and header.
3. Flatten Timer and CircuitPanel containers.
4. Convert status elements and inline metrics.
5. Convert BroadcastFeed cards into rows.
6. Replace the floating control dock with the command rail.
7. Align ResultsOverlay.
8. Run responsive and state visual QA.
9. Remove unused legacy session classes only after all references are gone.

Do not combine layout restructuring with race-engine refactors. Each phase should remain visually reviewable and behaviorally reversible.

## 7. Verification Matrix

### Viewports

- 2560×1440
- 1920×1080
- 1440×900
- 1280×800
- 1024×768 landscape

### Session states

- Initial/waiting for laps
- Active flying laps
- User approaching PIT
- User in PIT with countdown
- Natural timer completion
- User DNF
- Fast-forward at ×8, ×12, and ×20
- Finished/results overlay

### Data extremes

- Short and long circuit names
- One- and two-digit ranking positions
- No lap, leader lap, positive gap, DNF, PIT
- Long driver/team names
- Circuit with dense corner labels
- Circuit with tall and wide aspect ratios

### Interaction checks

- PIT modal open, cancel, confirm, and countdown
- End Session dialog open, Escape, cancel, and confirm
- Corner number toggle
- Fast-forward decrement, increment, and skip
- Ranking scroll and broadcast scroll
- Keyboard focus visibility on every command

## 8. Definition of Done

- Zero rounded containers are used for passive information in `/session`.
- No nested bordered panels exist in the normal session layout.
- No capsule/pill status components remain.
- Shadows are absent outside modal layers.
- TrackMap remains the dominant central element.
- Setup and session share top-rule, typography, divider, and footer conventions.
- Layout remains stable across every session state and supported landscape viewport.
- Existing timer, ranking, PIT, DNF, fast-forward, TrackMap, and results behavior passes unchanged.
- Production build completes successfully.

## 9. Out of Scope

- Reworking race pace or ranking algorithms.
- Replacing circuit SVG data.
- Changing the 2026 driver or track datasets.
- Redesigning setup driver and circuit selection grids in this pass.
- Adding new session features solely to fill visual space.

