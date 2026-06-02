# DEVCON+ PM Dashboard — Product Requirements Document

**OWNER** Rhea Rizz Perocho  
**VERSION** 2.0  
**STATUS** Active Development  
**DATE** June 2026  
**STACK** Next.js 14 · Supabase · Vercel · Tailwind CSS · Anthropic Claude · Groq · Telegram

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Users & Roles](#4-users--roles)
   - 4.1 [Role Definitions](#41-role-definitions)
5. [Access Control Matrix](#5-access-control-matrix)
6. [Feature Requirements](#6-feature-requirements)
   - 6.1 [Authentication & Session Management](#61-authentication--session-management)
   - 6.2 [PM Board (Kanban)](#62-pm-board-kanban)
   - 6.3 [Activity Logging & Notifications](#63-activity-logging--notifications)
   - 6.4 [Contributors Management](#64-contributors-management)
   - 6.5 [QA Tracker](#65-qa-tracker)
   - 6.6 [Bug Tracker](#66-bug-tracker)
   - 6.7 [Announcements](#67-announcements)
   - 6.8 [Meetings](#68-meetings)
   - 6.9 [Milestones](#69-milestones)
   - 6.10 [Essentials (Knowledge Base)](#610-essentials-knowledge-base)
   - 6.11 [Risk Management](#611-risk-management)
   - 6.12 [GitHub Integration](#612-github-integration)
   - 6.13 [My Tasks](#613-my-tasks)
   - 6.14 [AI Agent System](#614-ai-agent-system)
   - 6.15 [Telegram Bot Integration](#615-telegram-bot-integration)
   - 6.16 [Task Reminders](#616-task-reminders)
   - 6.17 [Dashboard Overview & Widgets](#617-dashboard-overview--widgets)
7. [Technical Architecture](#7-technical-architecture)
8. [Email Notification System](#8-email-notification-system)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Out of Scope](#10-out-of-scope)
11. [Open Questions & Future Considerations](#11-open-questions--future-considerations)
12. [Glossary](#12-glossary)

---

## 1. Executive Summary

DEVCON+ PM is a **self-hosted, custom-built project management dashboard** purpose-built for the internal operations of DEVCON+ Philippines. Rather than bending a third-party tool (Jira, Notion, Linear) to fit the team's workflow, DEVCON+ PM is designed ground-up to match exactly how this team plans, tracks, communicates, and ships.

The product is a **full-stack web application** built on Next.js 14 App Router + Supabase, deployed on Vercel, accessible from any browser — no installation required. It replaces ad-hoc spreadsheet tracking and scattered communication with a single, role-aware, real-time source of truth.

> **Design Philosophy:** Every feature decision is shaped by one question — does this match how the DEVCON+ team actually works? Nothing is added for feature parity with other tools. Everything exists because the team needs it.

### Core Capabilities at a Glance

| Capability | Description |
|---|---|
| **Open Kanban Board** | Accessible without login, real-time sync via Supabase Realtime |
| **Role-aware Access Control** | Three tiers: Admin, Contributor, Guest |
| **Proactive Notifications** | Email alerts, Telegram bot, and in-app notifications |
| **QA & Bug Traceability** | QA tests and bugs linked directly to tasks |
| **Meeting, Milestone & Announcements** | Integrated team coordination modules |
| **Essentials Knowledge Base** | Project-scoped, supports credentials, links, files, code |
| **Risk Management** | Risk register with heatmap visualization and AI scanning |
| **GitHub Integration** | Webhook-based PR/push tracking with semantic task linking |
| **AI Agent System** | Automated standup generation, risk scanning, overdue escalation, PR linking |
| **Telegram Bot** | Real-time team notifications and Telegram-native interactions |

---

## 2. Problem Statement

### Core Pain Points

| PAIN POINT | CURRENT STATE | IMPACT |
|---|---|---|
| **Task visibility** | Scattered across chats and spreadsheets | Work gets missed or duplicated |
| **Status tracking** | Manual updates, no enforcement | Stale data, no accountability |
| **QA traceability** | QA results not linked to tasks or bugs | Fixes ship without verified test coverage |
| **Bug management** | Informal, no severity or ownership | Critical issues deprioritized |
| **Contributor access** | No formal onboarding or offboarding | Security and coordination risk |
| **Meeting coordination** | Separate tools, no project context | Meeting action items lost |
| **Announcements** | Chat messages buried in history | Team misses critical updates |
| **Admin overhead** | No central management UI | Manual effort to add/remove people |
| **Risk visibility** | No formal risk register | Project risks go unaddressed until critical |
| **GitHub activity** | PR and push events not tied to tasks | Dev progress disconnected from PM visibility |
| **Overdue tasks** | No automated escalation | Blocked work silently slips |
| **Daily standups** | Manual preparation, time-consuming | Inconsistent team sync |

### Why Not an Off-the-Shelf Tool?

Existing PM tools either over-engineer the workflow (Jira), require costly subscriptions (Linear), or lack the specific combination of:

- Open board access for contributors without login friction
- Admin-only management controls for team membership
- Native email and Telegram notifications tied to project events
- A UI shaped around DEVCON+'s exact task lifecycle
- AI agents that run automatically and push alerts to where the team already communicates

---

## 3. Goals & Success Metrics

### Primary Goals

1. Give the admin full visibility and control over all team activity, contributors, and project state
2. Allow contributors to manage their work on the board without login friction
3. Ensure every significant board action is tracked and the admin is proactively notified of all non-admin activity
4. Replace all external PM tooling for the DEVCON+ team
5. Automate repetitive PM tasks (standups, risk detection, overdue escalation) via AI agents

### Success Metrics

| METRIC | TARGET | DESCRIPTION |
|---|---|---|
| **Task tracking adoption** | 100% | All active tasks tracked on the board |
| **Contributor onboarding time** | < 2 min | Admin adds → welcome email + Telegram message sent |
| **Alert delivery SLA** | 60s | Email alert for any non-admin board action |
| **QA test coverage** | > 80% | Shipped features with a linked QA test |
| **Risk identification** | > 90% | Active risks logged before they become blockers |
| **Standup accuracy** | > 85% | AI-generated standups approved without major edits |

---

## 4. Users & Roles

### 4.1 Role Definitions

#### 👑 Admin (`plusmemberplatform@devcon.ph`)

- Full read/write access across all modules
- Sole access to Contributors management
- Real-time in-app activity feed (notification bell showing all activity)
- Receives all non-admin email alerts
- Admin bypass if contributor record missing
- Login via Google OAuth or email/password

#### 🧑‍💻 Contributor

- Added by admin to `contributors` table
- Access to all pages except Contributors management
- Full edit rights on board tasks, groups, QA, Bugs, Announcements, Meetings, Milestones, Essentials, Risks, GitHub
- Receives email when assigned to a task or bug
- In-app notification bell shows assignment notifications only
- Welcome email sent automatically on addition
- Redirected to `/dashboard` on login

#### 👤 Guest

- Unauthenticated visitor
- Full read/write access to the board (open board model)
- No access to Contributors management (server-side redirect)
- Notification bell hidden
- Sidebar shows "Viewing as Guest" + "Sign in as Admin" link
- All guest actions logged + admin email alerts triggered
- Identified as "Guest" in activity notifications

> **Design Rationale (Open Board Model):** The open board model removes login friction for contributors/collaborators while keeping the sensitive Contributors page locked to the admin. All non-admin activity is monitored, so the admin maintains full awareness without restricting participation.

---

## 5. Access Control Matrix

| FEATURE | ADMIN | CONTRIBUTOR | GUEST |
|---|---|---|---|
| PM Board — view | ✅ | ✅ | ✅ |
| PM Board — edit tasks/groups | ✅ | ✅ | ✅ |
| QA Tracker | ✅ | ✅ | ✅ |
| Bug Tracker | ✅ | ✅ | ✅ |
| Announcements | ✅ | ✅ | ✅ |
| Meetings | ✅ | ✅ | ✅ |
| Milestones | ✅ | ✅ | ✅ |
| Essentials | ✅ | ✅ | ✅ |
| Risk Management | ✅ | ✅ | ✅ |
| GitHub Integration | ✅ | ✅ | ✅ |
| My Tasks | ✅ | ✅ (own tasks only) | ❌ redirect |
| AI Agents (trigger) | ✅ | ✅ | ❌ |
| Contributors page | ✅ | ❌ redirect | ❌ redirect |
| Notification bell | ✅ All activity | Assignments only | ❌ Hidden |
| Activity email alerts | ✅ Receives | ❌ | ❌ |
| Supabase admin bypass | ✅ | ❌ | ❌ |

---

## 6. Feature Requirements

### 6.1 Authentication & Session Management

**`FR-AUTH-1` Email/Password Login**

Users authenticate with email + password via Supabase Auth. Invalid credentials return an inline error. On success, the user's contributor record is fetched from the `contributors` table and stored in Zustand (`useAuthStore`).

**`FR-AUTH-2` Google OAuth**

Users can sign in via Google. The OAuth callback route (`/auth/callback`) exchanges the code for a session, verifies the contributor record, and redirects to `/dashboard`. Admin email bypasses the contributor check.

**`FR-AUTH-3` Admin Bypass**

If the admin email is authenticated but has no contributor record in the DB, a synthetic contributor object is created in the Zustand store (`id: "admin"`) so the UI functions normally. This prevents admin lockout.

**`FR-AUTH-4` Access Denied**

Any authenticated user whose email is NOT in the `contributors` table AND is NOT the admin email is immediately signed out and redirected to `/access-denied`.

**`FR-AUTH-5` Open Board (Guest Access)**

Unauthenticated visitors are not redirected to `/login`. The middleware only redirects on: authenticated user visiting `/login` → send to `/dashboard`. All other routes are accessible without auth.

**`FR-AUTH-6` Session Hydration**

On mount, `AuthProvider` calls `supabase.auth.getUser()`. If a session exists, it fetches the contributor record. If no session: sets `contributor = null` (guest mode). The `SIGNED_OUT` auth event triggers a redirect to `/login` — but `INITIAL_SESSION` with null (guest visits) does not.

---

### 6.2 PM Board (Kanban)

**`FR-BOARD-1` Projects**

Users can create projects (name + optional description). Projects appear in a left sidebar. Clicking a project loads its groups and tasks. First project is auto-selected on load.

**`FR-BOARD-2` Groups**

Projects contain Groups (analogous to sprints or feature areas). Groups contain Tasks, rendered as table rows.

- **Add group:** inline form at the bottom of the board
- **Rename group:** click group name → inline edit → blur/Enter to save
- **Delete group:** trash icon (hover) → confirmation modal (warns all tasks will be deleted)
- **Reorder groups:** drag handle (⠿, hover-visible) using `@dnd-kit`
- **Collapse/expand:** chevron icon (animated rotation) — toggles task table visibility

**`FR-BOARD-3` Group Color Coding**

Each group has a manually assigned accent color from a 12-color palette: Blue, Violet, Indigo, Teal, Emerald, Lime, Amber, Orange, Red, Rose, Pink, Cyan.

- A colored circle button in the group header opens a 4×3 swatch grid
- Selected color indicated with a white checkmark overlay
- Color persists in `localStorage` keyed by `devcon-group-color-{groupId}`
- On first render (no localStorage entry), a default color is assigned from the rotating palette based on group index
- Accent color applies to: left border (4px), tinted header background (~7% opacity), group name text

**`FR-BOARD-4` Tasks**

Each task is a row in the group table with these columns:

| COLUMN | BEHAVIOR |
|---|---|
| **Task (Title)** | Inline edit on click, blur to save |
| **Assignee** | Multi-select dropdown showing all contributors (portal-rendered, no scroll clipping); supports multiple assignees |
| **Status** | Color-coded badge dropdown (portal-rendered) |
| **Timeline** | Date range picker (start → end) |
| **Due Date** | Single date picker |
| **Attachment** | Upload files to Supabase Storage, view/delete |
| **PR Link** | Inline URL input; auto-populated by PR Linker agent |

Task actions (hover-visible): drag to reorder (within group), delete (confirmation modal), expand description (textarea below the row).

**`FR-BOARD-5` Task Status System**

Six statuses with distinct colors:

| STATUS | COLOR |
|---|---|
| Not Started | `#9ca3af` |
| In Progress | `#3b82f6` |
| Done | `#22c55e` |
| Help | `#f59e0b` |
| I am Stuck | `#ef4444` |
| For Improvements | `#a855f7` |

Each task row has a 3px colored left-border stripe matching its status for at-a-glance scanning.

**`FR-BOARD-6` Drag & Drop**

Tasks reorder within a group via vertical DnD (`@dnd-kit`, `PointerSensor`, 8px activation distance). Groups reorder within a project via vertical DnD. Position values are written back to Supabase on drop.

**`FR-BOARD-7` Portal Dropdowns**

Assignee and Status dropdowns render via `ReactDOM.createPortal` at `document.body` with `position: fixed`, positioned using `getBoundingClientRect()`. This prevents clipping by the `overflow-x-auto` table wrapper. Dropdowns auto-flip upward when less than ~260–280px of space exists below the trigger.

**`FR-BOARD-8` Real-time Board Sync**

The board subscribes to Supabase Realtime `postgres_changes` for the selected project's tasks table. INSERT/UPDATE/DELETE events are applied to local state without a full reload. Multiple users editing the same board see changes in real-time.

**`FR-BOARD-9` Multi-Assignee Support**

Tasks support multiple assignees stored in a separate `task_assignees` join table. The assignee cell displays avatar stacks for multiple assignees. Notifications are sent to all assignees when a task is assigned.

---

### 6.3 Activity Logging & Notifications

**`FR-NOTIF-1` Activity API**

All CRUD operations on the board call `POST /api/activity` (fire-and-forget). Payload: `{ action, entity, entityTitle, actorName, actorEmail, page }`.

Actions logged: task created, updated (status/assignee/title/due date changes), moved (group change), deleted; group created, renamed, deleted; project created. Position-only reorders are not logged (too noisy).

**`FR-NOTIF-2` Admin Email Alerts**

`/api/activity` checks `isAdmin(actorEmail)`. For non-admin actors (contributors or guests): sends a styled HTML email to the admin via Resend. Email contains: actor name, action, entity title, page, and timestamp in PHT (Asia/Manila). Color-coded left border: green=created, red=deleted, blue=all others. Admin's own actions do not trigger an email.

**`FR-NOTIF-3` In-App Notification Bell (Admin)**

Shown only to the admin. Subscribes to Supabase Realtime on tasks (INSERT/UPDATE/DELETE, all projects) and groups (INSERT/DELETE). UPDATE events only surface meaningful field changes (status, assignee, title, group_id). Displays an "Activity Feed" dropdown with up to 30 entries. Shows unseen count badge (red). "Clear all" button. Clicking an activity entry navigates to `/dashboard`.

**`FR-NOTIF-4` In-App Notification Bell (Contributor)**

Shows assignment notifications only. Subscribes to tasks Realtime filtered by `assignee_id = contributor.id`. INSERT and UPDATE events on that filter trigger a notification. Displays "Notifications" label.

**`FR-NOTIF-5` Task Assignment Email**

When a task's assignee changes to a non-null value, an email is sent to the new assignee via `POST /api/notify` (type: `task_assigned`). For multi-assignee tasks, all new assignees receive the email. This is in addition to the activity alert sent to the admin.

---

### 6.4 Contributors Management

**`FR-CONTRIB-1` Access Guard**

The `/contributors` route performs a server-side check: `user.email !== ADMIN_EMAIL` → `redirect("/dashboard")`. Enforced regardless of Supabase session state.

**`FR-CONTRIB-2` Contributor List**

Table showing: avatar (initials), full name, email, role badge, Telegram handle, join date. Hover reveals Edit and Remove actions.

**`FR-CONTRIB-3` Add Contributor**

Modal form: full name, email, role (dropdown), Telegram username. On submit: inserts row in `contributors` table, sends welcome email via Resend (type: `welcome_contributor`).

**`FR-CONTRIB-4` Edit Contributor**

Same form fields as add. Updates the DB row in place.

**`FR-CONTRIB-5` Remove Contributor**

Soft delete: sets `deleted_at` timestamp. Contributor immediately loses access (login check filters `deleted_at IS NULL`). Browser confirm dialog before action.

**`FR-CONTRIB-6` Roles Management**

Side panel for managing roles (name, description, color). Roles are assigned to contributors and displayed as colored badges throughout the UI (sidebar, task assignee cell, contributor list).

---

### 6.5 QA Tracker

Test case management per project. Each QA test has:

- `title`, `description`, `category`
- `status`: Pass / Fail / Blocked / Not Run
- `assigned_to`: contributor
- `bug_report`: free text
- `bug_id`: link to a Bug Tracker entry

Supports creating, editing, and bulk status updates. Status changes trigger email notifications to the assignee. QA tests can be linked back to tasks for full traceability.

---

### 6.6 Bug Tracker

Structured bug reporting with the following fields:

- **Core fields:** title, description, steps to reproduce, expected vs actual behavior
- **Classification:** severity (Critical / High / Medium / Low), status (Open / In Progress / Resolved / Closed / Cannot Reproduce)
- **Assignment:** reporter, assignee — bug assignment triggers email notification
- **Context:** environment, browser/device, screenshot URLs, PR link
- **Links:** linked task, linked QA test

**Activity log per bug:** tracks field changes (who changed what, old → new value, timestamp). Bug detail panel shows full audit trail alongside all metadata.

---

### 6.7 Announcements

Create and broadcast announcements to the team. Each announcement: title, body (supports line breaks), created by, `sent_at` timestamp.

Announcements are broadcast via:
- **Email:** to all contributors via Resend
- **Telegram:** to the team group via Telegram bot

---

### 6.8 Meetings

Schedule and manage team meetings with:

- **Details:** title, type (Standup / Audit / Other), description, date, start/end time, timezone
- **Recurrence:** None / Daily / Weekly / Biweekly / Monthly with recurrence end date
- **Integration:** Google Meet link, Google Calendar event ID (via Google Calendar API)
- **Reminders:** reminder offset (minutes before) via Supabase Edge Function (`send-meeting-reminders`)

Attendee RSVPs (Pending / Accepted / Declined) tracked per meeting. Calendar grid view + detail modal.

**Email notifications:** meeting confirmation on schedule, cancellation notice, and reminder N minutes before start.

---

### 6.9 Milestones

Track high-level project goals. Each milestone:

- `title`, `description`, `target_date`
- `status`: Not Started / In Progress / At Risk / Achieved / Missed
- `achieved_at`, `announced` flag, `linked project`

**Progress logging:** contributors log progress notes, percentage completion, and blockers. History modal shows the full progress timeline.

When a milestone is marked "Achieved," an email broadcast is sent to all contributors. Auto-status updates run via the `update-milestone-statuses` Edge Function.

---

### 6.10 Essentials (Knowledge Base)

A project-scoped knowledge base. Organized as **Sections** (groupings with title, icon, description) containing **Entries**.

- **Entry types:** `text`, `link`, `code`, `file`, `email`, `credential`
- **Sensitive entries:** can be marked `is_sensitive` (masked by default, toggle to reveal)
- **Files:** stored in Supabase Storage with signed URLs
- Supports CRUD on both sections and entries, with drag-reorder by position
- **Views:** Section-grouped card view or flat list view
- Seed template system for standardized project essentials

---

### 6.11 Risk Management

A structured risk register for tracking, visualizing, and mitigating project risks.

**`FR-RISK-1` Risk Register**

Each risk entry contains:

- `title`, `description`, `category`, `probability`, `impact`
- **Categories:** Technical / Schedule / Resource / Scope / Quality / Dependency / Budget
- **Status:** Open / Mitigating / Resolved / Accepted
- `owner`: assigned contributor
- `mitigation_plan`, `contingency_plan`
- `linked_task_id`: optional task linkage
- `risk_score`: computed from probability × impact

**`FR-RISK-2` Risk Heatmap**

A probability vs. impact matrix heatmap visualization rendered via Recharts. Each risk is plotted as a point on the 5×5 grid. Color-coded zones: green (low), amber (medium), red (high). Clicking a point opens the risk detail panel.

**`FR-RISK-3` Risk Score Badge**

Each risk displays a computed score badge with color coding: green (1–4), amber (5–12), red (15–25).

**`FR-RISK-4` Risk Summary View**

Aggregate view showing risk distribution by category, status breakdown, and high-risk count at a glance.

**`FR-RISK-5` AI Risk Scan (Agent)**

See [§6.14 AI Agent System — Risk Scan](#fr-agent-3-risk-scan-agent).

---

### 6.12 GitHub Integration

Full bidirectional integration with GitHub repositories via webhooks and semantic task linking.

**`FR-GIT-1` Repository Connection**

Admin or contributors connect a GitHub repository by registering a webhook. The connection is stored in `github_connections` table (repo name, owner, webhook secret).

**`FR-GIT-2` Webhook Handler**

`POST /api/webhooks/github` receives GitHub webhook payloads. Supported events:
- `push` — logs commits with branch, author, commit message
- `pull_request` — logs PR opened/closed/merged with title, author, state, branch
- `pull_request_review` — logs review submissions

All events stored in `github_events` table.

**`FR-GIT-3` Git Activity Feed**

The `/git` page displays a chronological activity feed of all GitHub events across connected repositories. Each entry shows: event type badge, actor avatar, repo name, branch/PR title, timestamp. Filterable by repo and event type.

**`FR-GIT-4` Automatic PR-to-Task Linking**

When a pull request event arrives, the PR Linker agent (`/api/agent/pr-linker`) attempts to semantically match the PR title and branch name against open task titles. Matching uses token overlap (≥40% threshold). On match: the task's `pr_link` field is updated automatically.

---

### 6.13 My Tasks

A personalized task view for the logged-in contributor.

**`FR-MYTASKS-1` Personal Task List**

Shows all tasks where the authenticated contributor is an assignee (including multi-assignee tasks). Grouped by project and status. Allows quick inline status updates without navigating to the full board.

**`FR-MYTASKS-2` Access Restriction**

`/my-tasks` redirects unauthenticated (guest) visitors to `/dashboard`. Requires a logged-in contributor session.

---

### 6.14 AI Agent System

A set of automated agents that run on-demand or on schedule to reduce PM overhead.

**`FR-AGENT-1` Standup Generator**

`POST /api/agent/standup`

Queries all tasks updated in the past 24 hours. Groups by contributor and status. Uses Claude AI (Anthropic SDK) to generate a structured daily standup summary: what was completed, what is in progress, what is blocked. Output is formatted for posting to Telegram or email.

**`FR-AGENT-2` Overdue Escalation Agent**

`POST /api/agent/overdue-escalation`

Scans tasks where `due_date < now()` and `status != 'Done'`. For each overdue task: sends a Telegram alert to the team channel and/or the assigned contributor's Telegram handle. Optionally updates task status to "I am Stuck."

**`FR-AGENT-3` Risk Scan Agent**

`POST /api/agent/risk-scan`

Uses Claude AI to analyze task descriptions across the active project for risk signals. Identifies patterns matching: Technical debt, Schedule slippage indicators, Resource bottlenecks, Scope creep language. Automatically creates new `risks` table entries for detected risks with appropriate category, probability, and impact scores. Returns a summary of identified risks.

**`FR-AGENT-4` PR Linker Agent**

`POST /api/agent/pr-linker`

Triggered on GitHub PR webhook events. Tokenizes incoming PR title and branch name. Compares against all open task titles using word-overlap scoring. If match score ≥ 40%, updates the task's `pr_link` field with the PR URL. Returns the matched task ID and score.

---

### 6.15 Telegram Bot Integration

Full Telegram bot integration for real-time team notifications and command-based interactions.

**`FR-TG-1` Webhook Handler**

`POST /api/telegram` receives Telegram bot updates via webhook. Processes incoming messages and commands using the grammy SDK.

**`FR-TG-2` Outbound Notifications**

The bot sends messages to the configured team Telegram group/channel for:

- New announcements (title + body)
- Overdue task escalations (task title + assignee + due date)
- Milestone achieved (celebration message + milestone title)
- Daily standup summary (AI-generated, formatted for Telegram markdown)

**`FR-TG-3` Voice Input (Groq LLaMA)**

Voice messages sent to the bot are transcribed using Groq LLaMA's speech-to-text API (`groq-sdk`). Transcribed text is processed as a command or task description, enabling voice-driven task creation or status updates from mobile.

**`FR-TG-4` Notification Library**

`lib/telegram.ts` provides a typed client for all outbound message types. Supports message formatting with Telegram MarkdownV2, inline keyboards, and mention linking via stored `telegram_username` on contributors.

---

### 6.16 Task Reminders

A scheduling system for time-based task reminders.

**`FR-REMINDER-1` Reminder Creation**

Users can set reminders on any task via `POST /api/reminders`. Stored in `task_reminders` table with: `task_id`, `remind_at` (datetime), `contributor_id`, `message`.

**`FR-REMINDER-2` Reminder Delivery**

The `notify-due-date` Supabase Edge Function runs on a schedule, queries `task_reminders` where `remind_at <= now()`, and sends email or Telegram notifications to the specified contributor.

---

### 6.17 Dashboard Overview & Widgets

The `/dashboard` page includes an overview panel with summary widgets above the Kanban board.

**`FR-DASH-1` Bug Summary Widget**

Shows open bug count by severity (Critical / High / Medium / Low). Color-coded counts. Links to the `/bugs` page.

**`FR-DASH-2` Upcoming Meetings Widget**

Lists the next 3 scheduled meetings with date, time, and type badge. Links to the `/meetings` page.

**`FR-DASH-3` Milestones Progress Widget**

Shows active milestones with their progress percentage and status badge. Links to the `/milestones` page.

---

## 7. Technical Architecture

### Technology Stack

| LAYER | TECHNOLOGY |
|---|---|
| **Frontend** | Next.js 14 (App Router, React Server Components + Client Components) |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Storage** | Supabase Storage (task attachments, essential files, bug screenshots) |
| **Real-time** | Supabase Realtime (`postgres_changes`) |
| **Edge Functions** | Supabase Edge Functions (Deno) |
| **State** | Zustand 5.0 (`useAuthStore`) |
| **Email** | Resend (transactional + broadcast) |
| **Telegram** | grammy SDK + Telegram Bot API |
| **AI (Risk & Standup)** | Anthropic Claude SDK (`@anthropic-ai/sdk`) |
| **AI (Voice)** | Groq SDK (`groq-sdk`) + LLaMA speech-to-text |
| **Google** | googleapis (Google Calendar API) |
| **Data Visualization** | Recharts (risk heatmap, milestone progress) |
| **Deployment** | Vercel |
| **Styling** | Tailwind CSS + shadcn/ui + Class Variance Authority |
| **Drag & Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` |

### Key Architectural Decisions

**`ARCH-1` Server vs Client Components**

Data-fetching pages (Dashboard, QA, Contributors, etc.) are async Server Components that hydrate the client with initial data via props, avoiding client-side loading spinners on first render. Interactivity (board mutations, modals, dropdowns) is in `"use client"` components.

**`ARCH-2` Auth Guard Layering (3 Layers)**

- **Middleware:** session cookie refresh + login→dashboard redirect
- **AuthProvider:** client-side session hydration, admin bypass, access-denied flow
- **Page-level (server):** Contributors page verifies `user.email === ADMIN_EMAIL`, redirects otherwise

**`ARCH-3` Permissions Module**

`lib/permissions.ts` — Single source of truth for `ADMIN_EMAIL` constant and `isAdmin()` helper, imported across middleware, server components, client components, and API routes.

**`ARCH-4` Portal Dropdowns**

All floating UI elements (status picker, assignee picker, color picker) that live inside `overflow-x-auto` containers use `ReactDOM.createPortal` + `position: fixed` to escape overflow clipping. Auto-flip logic prevents off-screen rendering.

**`ARCH-5` Activity System**

Fire-and-forget `POST /api/activity` calls from client components. API route is the single gating point for admin email alerts — never blocks the UI on email delivery failure (always returns `{ ok: true }`).

**`ARCH-6` Group Colors (localStorage)**

Stored in `localStorage` (key: `devcon-group-color-{groupId}`) to avoid requiring a DB schema change. Hydrated client-side after mount to prevent SSR hydration mismatch.

**`ARCH-7` AI Agent Isolation**

All AI agents (`/api/agent/*`) are isolated API routes. They use the Anthropic Claude SDK or Groq SDK only server-side. API keys are never exposed to the client. Agents are fire-and-respond — they return structured results and trigger side effects (Supabase writes, Telegram sends) internally.

**`ARCH-8` Telegram Client**

`lib/telegram.ts` wraps the grammy SDK and Telegram Bot API. All Telegram sends are typed by notification category. The webhook handler at `/api/telegram` processes inbound messages including voice transcription via Groq.

### Database Schema

```
roles              → id, name, description, color, created_at
contributors       → id, email, full_name, role_id, telegram_username, deleted_at, created_at
projects           → id, name, description, created_by, created_at
groups             → id, project_id, name, position, created_at
tasks              → id, group_id, project_id, title, description, assignee_id, status,
                     timeline_start, timeline_end, due_date, pr_link, position, created_at, updated_at
task_assignees     → id, task_id, contributor_id  (multi-assignee join table)
task_attachments   → id, task_id, file_name, file_url, uploaded_by, uploaded_at
task_reminders     → id, task_id, contributor_id, remind_at, message, created_at
announcements      → id, title, body, created_by, sent_at, created_at
qa_tests           → id, project_id, title, description, category, status, assigned_to,
                     bug_report, bug_id, created_at, updated_at
bugs               → id, project_id, title, description, steps_to_reproduce, expected_behavior,
                     actual_behavior, severity, status, reported_by, assigned_to, qa_test_id,
                     task_id, pr_link, environment, browser_device, screenshot_urls[],
                     created_at, updated_at
bug_activity       → id, bug_id, changed_by, field_changed, old_value, new_value, changed_at
meetings           → id, project_id, title, type, description, meeting_date, start_time, end_time,
                     timezone, recurrence, recurrence_end_date, google_calendar_event_id,
                     google_meet_link, reminder_minutes_before, status, created_by,
                     created_at, updated_at
meeting_attendees  → id, meeting_id, contributor_id, rsvp_status
milestones         → id, project_id, title, description, target_date, status, achieved_at,
                     announced, created_by, created_at, updated_at
milestone_progress → id, milestone_id, logged_by, progress_note, progress_percent, blockers,
                     logged_date, created_at
essential_sections → id, project_id, title, description, icon, position, created_by, created_at
essential_entries  → id, section_id, project_id, label, data_type, value_text, value_file_url,
                     value_file_name, is_sensitive, position, note, created_by, created_at, updated_at
risks              → id, project_id, title, description, category, probability, impact,
                     risk_score, status, owner_id, mitigation_plan, contingency_plan,
                     linked_task_id, created_by, created_at, updated_at
github_connections → id, project_id, repo_owner, repo_name, webhook_secret, created_at
github_events      → id, connection_id, event_type, actor, branch, title, url, payload,
                     created_at
```

### Supabase Edge Functions

| FUNCTION | TRIGGER | BEHAVIOR |
|---|---|---|
| `broadcast-announcement` | Manual / scheduled | Sends announcement to Telegram and email |
| `notify-assignee` | DB trigger on task insert/update | Emails new task assignee |
| `notify-due-date` | Cron schedule | Sends reminders for tasks with upcoming/past due dates |
| `send-meeting-reminders` | Cron schedule | Sends Telegram/email reminders N minutes before meetings |
| `update-milestone-statuses` | Cron schedule | Auto-updates milestone status based on target date |

---

## 8. Email Notification System

All emails use a shared HTML wrapper with the DEVCON+ PM brand, sent from `DEVCON+ PM <onboarding@resend.dev>`.

| TRIGGER | RECIPIENT | TEMPLATE / CONTENT |
|---|---|---|
| Contributor added | New contributor | Welcome email + login CTA |
| Task assigned | New assignee(s) | Task details + status + due date |
| Bug assigned | New assignee | Bug severity + description |
| Meeting scheduled | All attendees | Date, time, timezone, Meet link |
| Meeting cancelled | All attendees | Cancellation notice |
| Meeting reminder | All attendees | Starts in N minutes |
| Milestone achieved | All contributors | Celebration email |
| Announcement broadcast | All contributors | Announcement title + body |
| Board activity (non-admin) | Admin only | Actor + action + entity + timestamp PHT |
| Overdue task escalation | Admin + assignee | Task title + overdue duration + assignee |

> **Email Reliability:** Activity email failures silently swallow errors and return `{ ok: true }` — board operations never fail due to email delivery issues.

---

## 9. Non-Functional Requirements

**`NFR-1` Performance**

Initial page load uses server-side data fetching — the board is populated without client-side waterfalls. Realtime updates (Supabase Realtime) are incremental. AI agent endpoints are async and do not block UI interactions.

**`NFR-2` Security**

- Admin email is hardcoded server-side (`lib/permissions.ts`), never derived from client input
- Service role key used only in trusted API routes (`/api/notify`), never exposed to the browser
- Soft deletes on contributors — revoked access is immediate but data is preserved
- Sensitive essentials entries are masked by default
- GitHub webhook secrets validated on every incoming payload
- Groq and Anthropic API keys server-only, never in client bundles

**`NFR-3` Resilience**

- Activity email failures silently swallow errors — board operations never fail due to email issues
- Admin bypass prevents permanent lockout if the admin's contributor record is accidentally deleted
- Board mutations are optimistic with rollback on Supabase error
- AI agent failures return structured error responses without impacting the board

**`NFR-4` Accessibility**

All interactive elements have `title` attributes. Color is not the only differentiator — status also has a text label alongside the color badge.

**`NFR-5` Responsive Design**

Full mobile support: collapsible sidebar drawer (top bar + hamburger) with the same navigation as desktop.

**`NFR-6` AI Cost Management**

The Groq LLaMA model is used for voice transcription (cost-effective for high-frequency inference). Anthropic Claude is used for higher-reasoning tasks (risk scan, standup generation) where output quality justifies the cost. Model selection is intentional and not interchangeable.

---

## 10. Out of Scope (Current Version)

- Multi-admin / role-based admin elevation (admin is always a single hardcoded email)
- Time tracking per task
- Comments/threads on tasks
- Dark mode
- Exportable reports (CSV/PDF)
- Public-facing project status page
- Native mobile app (iOS/Android)
- Billing or subscription management

---

## 11. Open Questions & Future Considerations

| QUESTION | NOTES |
|---|---|
| Should guest activity be attributed to a name? | Could add a "Who are you?" one-time prompt stored in localStorage |
| Should group colors be stored in Supabase? | Current localStorage approach loses colors when clearing browser data; a color column on `groups` would persist cross-device |
| Rate limiting on `/api/activity`? | High-frequency edits (e.g., typing in title) could send many emails; consider debouncing or only emitting on significant field changes |
| Supabase RLS for open board? | Anon key needs SELECT/INSERT/UPDATE/DELETE policies on all board tables for guest access to function |
| AI standup scheduling? | Currently manual trigger; could be a cron-based Edge Function posting to Telegram every morning |
| Risk scan frequency? | Currently manual trigger; consider running automatically when tasks are bulk-updated |
| Groq voice commands scope? | Currently transcription only; could evolve into full natural language task creation ("create a task for...") |
| GitHub Actions integration? | Webhook currently handles PR/push events; CI status (pass/fail) not yet surfaced on task cards |
| Milestone linking to tasks? | Milestones track project-level goals; linking specific tasks to a milestone would improve traceability |

---

## 12. Glossary

| TERM | DEFINITION |
|---|---|
| **Admin** | The single owner account with full system privileges |
| **Contributor** | A team member added by the admin with access to all pages except Contributors management |
| **Guest** | An unauthenticated visitor with open board access |
| **Group** | A named section within a project (analogous to a sprint or feature area) that contains tasks |
| **Accent Color** | The manually chosen color assigned to a group, controlling its left border and header tint |
| **Activity Feed** | The admin's real-time notification bell showing all board CRUD events |
| **Open Board** | The access model where the PM board is publicly readable and editable without login |
| **Portal Dropdown** | A React dropdown rendered via `createPortal` at `document.body` to escape overflow clipping |
| **Soft Delete** | Setting `deleted_at` on a contributor row rather than removing it, preserving audit history |
| **PHT** | Philippine Standard Time (Asia/Manila, UTC+8) — used in activity email timestamps |
| **Risk Score** | Computed value: probability (1–5) × impact (1–5); ranges 1–25 |
| **Risk Heatmap** | A 5×5 probability/impact matrix visualizing all active risks as plotted points |
| **PR Linker** | The AI agent that semantically matches GitHub pull requests to open tasks |
| **Standup Generator** | The AI agent that summarizes the past 24h of task activity into a daily standup report |
| **Overdue Escalation** | The AI agent that detects past-due tasks and sends Telegram/email alerts |
| **Risk Scan** | The AI agent that analyzes task descriptions for risk signals and auto-creates risk entries |
| **Multi-assignee** | Support for assigning more than one contributor to a single task |

---

*DEVCON+ PM Dashboard — PRD v2.0 · Owner: Rhea Rizz Perocho · June 2026 · Confidential Internal Document*
