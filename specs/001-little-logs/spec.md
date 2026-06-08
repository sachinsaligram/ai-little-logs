# Feature Specification: Little Logs — Baby Tracking App

**Feature Branch**: `001-little-logs`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Personal baby tracking web app with AI-powered insights and dual access — a web UI and natural language access via Claude MCP tools."

## Clarifications

### Session 2026-06-08

- Q: Is the app designed primarily for mobile, or equally for mobile and desktop? → A: Mobile-first. The phone is the primary design target — every screen must pass the one-handed mobile test first. Desktop is a valid secondary surface (same browser URL) but is not the primary constraint.
- Q: In Phase 1, does the web UI (logging + insights) work on any device via URL while MCP is local stdio + Claude Desktop on desktop only? → A: Yes. Web UI = any device via browser URL (mobile primary). MCP Phase 1 = local stdio transport, requires Claude Desktop running on a desktop/laptop. These are independent access paths to the same database. No remote MCP until Phase 3.
- Q: Is the app distributed via browser URL or app store? → A: Browser URL. The canonical entry point is a web URL accessible from any browser. PWA install to the phone home screen is an optional convenience layer — no App Store, no native build required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Event Logging (Priority: P1)

A parent opens the app on their phone, one-handed, while holding a baby. They need to record what just happened — a sleep start, a feed, or a nappy change — in as few taps as possible and move on.

**Why this priority**: This is the entire reason the app exists. Without fast, frictionless logging, nothing else has value. It must work on mobile, in the dark, with one hand.

**Independent Test**: Can be fully tested by opening the app on a phone and logging one event of each type (sleep, feed, nappy). Delivers a working logging MVP with data persisted and visible.

**Acceptance Scenarios**:

1. **Given** the parent is on the home screen, **When** they tap "Start sleep" and confirm, **Then** a sleep session is started and the elapsed timer is visible — completed in 2 taps or fewer.
2. **Given** a sleep session is in progress, **When** the parent taps "End sleep", **Then** the session is closed with duration calculated automatically.
3. **Given** the parent is on the home screen, **When** they tap "Log feed", select type (breast/bottle/solid), and confirm, **Then** a feed is recorded — completed in 3 taps or fewer.
4. **Given** the parent is on the home screen, **When** they tap "Log nappy", select type (wet/dirty/both), and confirm, **Then** a nappy change is recorded — completed in 3 taps or fewer.
5. **Given** the parent is not signed in, **When** they open the app, **Then** they are shown a sign-in prompt and cannot access any logs until authenticated.

---

### User Story 2 - In-App AI Insights (Priority: P2)

A parent wants to understand their baby's patterns without manually tallying logs. They open the app and ask for a summary or look at an insights panel to see what the AI has detected.

**Why this priority**: This is the AI value-add that differentiates the app from a plain spreadsheet. It builds on logged data and is the primary "wow" moment for the demo.

**Independent Test**: Can be tested by logging at least one week of data, then viewing the insights panel. Delivers readable summaries and at least one detected pattern without any manual calculation.

**Acceptance Scenarios**:

1. **Given** the parent has logged at least 3 days of data, **When** they view the insights panel, **Then** they see a plain-English summary of sleep totals, feed counts, and nappy change counts for the past day and week.
2. **Given** the insights panel is open, **When** a pattern exists (e.g., consistent sleep window), **Then** the panel surfaces it as a readable observation (e.g., "Baby typically sleeps between 7 pm and 7 am").
3. **Given** the parent has no logged data yet, **When** they open the insights panel, **Then** they see a friendly prompt to start logging rather than an empty or broken view.
4. **Given** the insights panel is generating a summary, **When** the AI call is in progress, **Then** a loading indicator is shown and the UI remains usable.

---

### User Story 3 - Natural Language Access via Claude Chat (Priority: P3)

A parent (or demo audience) opens Claude Desktop or Claude.ai, and asks questions about the baby's logs in plain English — "How much did the baby sleep last night?" or "Log a nappy change right now." The app's MCP server handles the request against the live database.

**Why this priority**: This is the AI demo story. It showcases the dual-access architecture and the power of MCP. It does not block the core logging or insights features but must work end-to-end for the demo to land.

**Independent Test**: Can be tested by connecting Claude Desktop to the MCP server, logging one event via Claude chat, then retrieving a summary via chat. Delivers the full MCP demo loop independently of the web UI.

**Acceptance Scenarios**:

1. **Given** Claude Desktop is connected to the MCP server, **When** the user says "Log a 10-minute breastfeed", **Then** a feed entry is created in the database and Claude confirms it.
2. **Given** logs exist in the database, **When** the user asks "How much did the baby sleep yesterday?", **Then** Claude returns an accurate summary using the `get_summary` tool.
3. **Given** logs exist for the past 7 days, **When** the user asks "Are there any patterns in the baby's sleep?", **Then** Claude uses `analyze_patterns` to return a readable analysis.
4. **Given** no logs exist for a requested period, **When** the user queries for that period, **Then** Claude returns a clear "no data for that period" response rather than an error.
5. **Given** the user is not the whitelisted account, **When** they attempt to connect to the MCP server, **Then** access is denied.

---

### Edge Cases

- What happens when a sleep session is started but the app is closed before it is ended? The in-progress session must survive app restarts and be resumable.
- What happens when a feed log is submitted without an end time? The system must accept open-ended feeds (some feeds are timed by the parent, some are not).
- What happens if the AI insights call fails or times out? The rest of the app must remain fully functional; insights degrade gracefully.
- What happens if the MCP server receives an ambiguous log request (e.g., "log a nap" with no duration)? The tool must prompt for required fields rather than creating an incomplete record.
- What happens if the parent logs two overlapping sleep sessions? The system must warn or prevent overlapping sleep records.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**

- **FR-001**: The app MUST restrict access to a single pre-configured email address; all other accounts MUST be denied.
- **FR-002**: Users MUST be able to sign in using their Google account without creating a separate password.
- **FR-003**: Authenticated sessions MUST persist across browser restarts so the parent is not re-prompted on every visit.

**Event Logging — Sleep**

- **FR-004**: Users MUST be able to start a sleep session with a single primary action from the home screen.
- **FR-005**: Users MUST be able to end an in-progress sleep session; duration MUST be calculated automatically.
- **FR-006**: Users MUST be able to optionally record sleep location and a quality rating (1–5) when logging or editing a sleep entry.
- **FR-007**: An in-progress sleep session MUST be recoverable after the app is closed and reopened.

**Event Logging — Feeds**

- **FR-008**: Users MUST be able to log a feed specifying type (breast, bottle, or solid food).
- **FR-009**: For breast feeds, users MUST be able to optionally record which side (left, right, or both).
- **FR-010**: For bottle feeds, users MUST be able to optionally record the amount consumed.
- **FR-011**: Feed entries MUST support an optional start time and end time; only start time is required.

**Event Logging — Nappy Changes**

- **FR-012**: Users MUST be able to log a nappy change specifying type (wet, dirty, both, or dry).
- **FR-013**: Users MUST be able to optionally record colour, consistency, and flag a concern on any nappy entry.
- **FR-014**: A flagged concern MUST be visually distinct in the log history.

**General Logging**

- **FR-015**: Any event type MUST be loggable in 3 taps or fewer from the home screen.
- **FR-016**: Users MUST be able to add free-text notes to any log entry.
- **FR-017**: The app MUST display a chronological log history showing all event types.

**In-App AI Insights**

- **FR-018**: The app MUST display an insights panel showing a daily and weekly summary of sleep totals, feed counts, and nappy change counts.
- **FR-019**: The insights panel MUST surface detected patterns in plain English (e.g., typical sleep windows, feed frequency trends).
- **FR-020**: The insights panel MUST degrade gracefully when no data is available or when the AI call fails, displaying a helpful message rather than an error.

**MCP / Natural Language Access**

- **FR-021**: The system MUST expose tools to log a sleep event, log a feed, and log a nappy change via natural language.
- **FR-022**: The system MUST expose a tool to retrieve a daily or weekly summary of all event types.
- **FR-023**: The system MUST expose a tool to query raw log entries by event type and date range.
- **FR-024**: The system MUST expose a tool to perform AI-powered pattern analysis over a configurable number of days.
- **FR-025**: All MCP tool access MUST be restricted to the same authenticated user as the web UI.

**Mobile / PWA**

- **FR-026**: The app MUST be accessible via a browser URL on any device. PWA install to the phone home screen is an optional convenience; the app MUST be fully functional without it.
- **FR-027**: Every screen MUST be designed for one-handed use on a mobile phone first. Desktop layout is a secondary concern and MUST not degrade the mobile experience.

### Key Entities

- **Sleep Log**: A record of a baby's sleep period with start time, optional end time, duration (auto-computed when ended), optional location, optional quality rating (1–5), and optional notes.
- **Feed Log**: A record of a feeding event with start time, optional end time, type (breast/bottle/solid), optional side (breast), optional amount (bottle), and optional notes.
- **Nappy Log**: A record of a nappy change with timestamp, type (wet/dirty/both/dry), optional colour, optional consistency, concern flag, and optional notes.
- **Baby**: A single baby profile (name, date of birth). Multi-baby support is out of scope for v1 but the data model accommodates it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any event (sleep, feed, nappy) can be logged in 3 taps or fewer from the home screen on a mobile device.
- **SC-002**: The home screen loads and is interactive within 2 seconds on a standard mobile connection.
- **SC-003**: The AI insights panel returns a summary within 10 seconds; if it does not, a loading state is shown and the rest of the app remains fully usable.
- **SC-004**: The complete MCP demo loop — log an event via Claude chat, then retrieve a summary via Claude chat — works end-to-end without manual database intervention.
- **SC-005**: A first-time user (with the whitelisted account) can sign in, log one event of each type, and view the insights panel within 5 minutes of first opening the app.
- **SC-006**: An in-progress sleep session survives an app close and reopen with no data loss.

## Assumptions

- There is exactly one baby being tracked. The data model supports multiple babies but the UI and all v1 features assume a single baby.
- The parent is the sole user; no sharing, multi-device conflict resolution, or concurrent sessions need to be handled.
- Connectivity is assumed for all logging and AI features; network is required to write or read data.
- All timestamps are stored in UTC and displayed in the device's local timezone.
- The two access paths are entirely independent: (1) the web UI is accessible via browser URL from any device (mobile is the primary design target); (2) the MCP server in Phase 1 runs locally via stdio transport alongside Claude Desktop on a desktop/laptop. Mobile logging happens exclusively through the web UI. Remote HTTP MCP is a Phase 3 concern.
- "Pattern analysis" means statistical observations about timing and frequency (e.g., sleep windows, feed intervals) — not medical advice or clinical recommendations.
- The concern flag on a nappy entry is informational only; the app does not provide medical guidance.
