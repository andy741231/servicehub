# Pushpay / Church Community Builder (ChMS) — UI Design Reference

> Research-driven design reference for the Pushpay ChMS (formerly Church Community Builder / CCB) user interface. Useful for informing Service Hub's `directory` sub-app and any future CHMS-style member-management features.

---

## 1. Product Background

| | |
|---|---|
| **Original product** | Church Community Builder (CCB) — launched late 1990s, acquired by Pushpay in December 2019 |
| **Current branding** | Pushpay ChMS, part of **ChurchStaq** (integrated giving + ChMS + custom church app + Insights) |
| **Platform** | Web admin app + congregant mobile app (iOS / Android) + LEAD app for staff |
| **Design philosophy** | "Complete tool for churches — a ChurchOS." Strong emphasis on connecting people data, processes, and engagement in one place. |

Key design evolution notes:
- The original CCB web app tried to serve **both administrators and congregants** in one Facebook-like platform. Congregant adoption was low because the barrier to entry was high.
- Post-acquisition, ChMS features were retrofitted into the already-popular **Pushpay mobile app** using an established UI library, rather than building a standalone experience.
- Pushpay is now running a **"Staq Transformation"** initiative (2025–2026) to modernize ChurchStaq / ParishStaq with refreshed UI in line with current design standards.

---

## 2. Overall UI Aesthetic

Pushpay ChMS leans toward a **clean, utilitarian, enterprise SaaS aesthetic** rather than a consumer-social look. Observed traits:

- **Card-heavy layouts** for dashboards, profiles, and summary views
- **Left-hand navigation rail** for primary modules (People, Groups, Schedules, Events, etc.)
- **Top search bar** persistent across modules for finding people, groups, events
- **Tabbed content areas** inside detail views (profile tabs, group tabs, event tabs)
- **Status badges / chips** for queue state, attendance, membership, sacrament verification
- **Quick-action buttons / floating actions** for common tasks ("Mark as Done", "Send Message", "Add to Queue")
- **Mobile-first responsive patterns** — many admin flows are also available in the LEAD app
- **White / light gray background surfaces**, dark navy or purple brand accents, rounded UI components

---

## 3. Information Architecture

### 3.1 Primary Modules (Left Navigation)

Typical ChMS modules visible in the admin nav:

1. **Dashboard** — church health, attendance, giving trends, at-a-glance stats
2. **People** — member directory, individual profiles, advanced search
3. **Groups** — small groups, classes, ministries, group dashboards
4. **Processes / Queues** — workflow automation for follow-up (new guests, membership, pastoral care)
5. **Schedules** — volunteer scheduling, service plans, set lists
6. **Events** — event creation, registration, attendance tracking
7. **Check-In** — saved check-in setups, stations, child check-in / checkout
8. **Giving / Donations** — donor records, batches, statements, fund allocation
9. **Communications** — email / SMS / push messages, mail merge, templates
10. **Rooms & Resources** — facility and asset reservation
11. **Reports & Insights** — customizable reports on attendance, engagement, giving
12. **Settings** — campuses, permissions, custom fields, sacraments

### 3.2 Navigation Patterns

- **Global search** at the top of the app; searches people, groups, events
- **Contextual sub-navigation** via tabs within a record (e.g., a person profile)
- **Breadcrumb-less deep linking** — app relies on persistent sidebar + tab anchors
- **Mobile bottom tab bar** in the LEAD app for Queues, Messages, People, More

---

## 4. Key Screens & Patterns

### 4.1 Dashboard

- **Stat cards** across the top: total members, first-time guests, active groups, weekly attendance, giving vs. goal
- **Bento-style widgets** below: "People to Follow Up", "Upcoming Events", "Recent Giving", "At-Risk Donors"
- **Charts**: line graphs for attendance trends, bar charts for members by campus/department
- **Quick actions** panel: "Add Person", "Add Event", "Send Message", "Open Check-In"

> Service Hub parallel: The existing `DirectoryDashboard.jsx` already uses a bento-grid with stat cards and a department bar chart. Pushpay validates this direction.

---

### 4.2 People / Member Directory

#### Directory List View
- Table or card grid of members
- Columns: avatar, name, primary email/phone, family/household, campus, status
- Filters: campus, membership type, volunteer role, group membership, process queue
- Bulk actions: send email, add to group, add to process queue, export

#### Person Profile
The CCB / Pushpay profile is organized into tabs:

| Tab | Contents |
|---|---|
| **About** | Contact info, birthdate, marital status, allergies, baptism status, campus, system privileges, custom fields (e.g., membership start date), background-check status |
| **Involvement** | Volunteer roles, attendance history, group membership, giving history, process queues, completed forms |
| **Notes & Messages** | Pastoral notes (permission-controlled), sent messages, activity log |
| **Family** | Spouse, children, household relationships |

Design notes:
- **Left column** holds the "identity card" (photo, name, contact badges, quick actions)
- **Right column** is the tabbed detail pane
- Inline editing on many fields; save per-section rather than one giant form
- Notes are timestamped and attributed to staff users; permissions restrict who can view sensitive notes

---

### 4.3 Groups

Recent **Groups Optimization** redesign (June 2026) describes the modern Pushpay group UI:

- **Group dashboard** — meeting times, upcoming events, messages needing attention, quick actions
- **Unified tabbed space** for:
  - **Messages** — group chat / announcements, replies and confirmations kept in one thread
  - **Needs** — prayer requests and care needs surfaced inside the group (not buried in an inbox)
  - **Files** — shared resources
  - **Events / Calendar** — group-specific events with one-click creation
- **Member roster** with roles (leader, co-leader, member)
- **Mobile-friendly** layout prioritized for group leaders

Pattern takeaway: groups are treated as **mini dashboards** rather than simple member lists.

---

### 4.4 Process Queues (Workflows)

One of CCB's most distinctive features.

- A **Process** is an overall workflow (e.g., "New Guest Follow-Up", "Membership Journey")
- A **Queue** is a step inside that workflow (e.g., "Send Welcome Text", "Schedule Call", "Invite to Lunch")
- People are added to queues automatically (form submission, new guest, group join) or manually

UI patterns:
- **Queue list view** shows people, due dates, assigned manager, status
- **Profile card inside the queue** with contact options (call/text/email) and notes
- **"Mark as Done"** is the primary action; on completion, automations fire (add to group, send mail merge, move to next queue)
- **Next-queue picker** appears after marking done so staff can route people forward
- **Verification queues** (e.g., sacraments) have filterable pending-verification tabs

This is a strong model for any "follow-up pipeline" or "onboarding workflow" in Service Hub.

---

### 4.5 Check-In

- **Saved setups** — configured once, launched quickly at check-in stations
- **Station modes** — staff/volunteer stations or self check-in
- **Family search** — search by name or phone; parent and children displayed together
- **Barcode / phone number lookup** for returning families
- **Security labels** printed on check-in
- **Text parent** feature to notify guardians
- **Checkout flow** to record when children are picked up

UI pattern: large touch-friendly buttons, minimal text, high-contrast status states, and a prominent "search by phone" field.

---

### 4.6 Schedules (Volunteer Scheduling)

- **Service templates** for recurring services (e.g., Sunday 9:00 AM) so planners don't start from scratch
- **Volunteer positions** listed per service (greeter, worship, tech, children)
- **Scheduling status badges**: confirmed, unconfirmed, declined, blocked out, needed
- **Set list integration** with chord charts / lyrics (SongSelect)
- **Message volunteers directly** from the schedule
- **Public sign-up** option so volunteers can self-schedule

---

### 4.7 Events

- Event creation wizard: title, date/time, location/room, registration form, payment
- **Multi-participant registration** with payments in one form
- Attendance tracking tied to the event
- Event notes and engagement metrics
- Calendar views: month, week, list

---

### 4.8 Giving / Donations

- **Transactions page** with fund reallocation directly in-table
- **Batch management** for physical gifts and auto-batching for digital gifts
- **Donor profiles** with giving history, recurring gifts, statements
- **Year-end statements** printable by donors themselves
- Dashboard widgets for at-risk donors and giving trends

---

### 4.9 Communications

- **Mass messaging** via email, SMS, push notifications
- **Saved templates** and mail-merge fields
- **Mailing lists** tied to groups, campuses, or custom criteria
- **One-way text messaging** and interactive polling
- Messages can be connected to processes so replies trigger queue actions

---

### 4.10 Reports & Insights

- Pre-built reports: attendance, giving, new members, group engagement
- **Custom report builder** with filters and column selection
- Visual dashboards with charts
- Export to CSV / PDF
- Scheduled report delivery to leaders

---

## 5. Detailed UI Patterns

### 5.1 Layout

| Pattern | Description |
|---|---|
| **App shell** | Fixed left sidebar + fixed top bar + scrollable main content |
| **Two-column detail** | Left = identity card / summary; Right = tabbed detail |
| **Bento dashboard** | 2–4 column grid of stat cards and widgets |
| **Full-width tables** | For directory, queues, schedules, transactions |
| **Drawer / slide-over** | Likely used for quick edits and record creation |

### 5.2 Components

- **Avatars** — circular, with initials fallback; family/household avatars grouped
- **Status badges** — "Active", "Inactive", "Pending", "Done", "Verified", "Unverified", "Confirmed"
- **Action chips** — "Call", "Text", "Email", "Add to Group", "Add to Queue"
- **Card headers** — colored top border or subtle background tint to indicate module
- **Empty states** — friendly illustrations + primary CTA
- **Search + filter bar** — sticky at top of list views
- **Date pickers** — standard calendar popovers

### 5.3 Forms

- Sectioned forms rather than one long column
- Inline validation
- Custom fields surfaced dynamically based on config
- Save-per-section common in profile editing

### 5.4 Tables

- Sortable headers
- Bulk select checkbox in header row
- Row hover reveals secondary actions
- Pagination or infinite scroll depending on module
- Export button in table toolbar

### 5.5 Mobile Patterns

- **Bottom tab bar** for core actions (Queues, Messages, People)
- **Card-based feed** for queue items and messages
- **Full-screen modal sheets** for check-in and quick actions
- **Large tap targets** for volunteer/staff use during events

---

## 6. Visual Style Inferences

Because Pushpay does not publish a public design system, the following is inferred from product screenshots, release notes, and third-party reviews.

| Element | Inferred Style |
|---|---|
| **Primary color** | Deep purple / navy (Pushpay brand), sometimes teal accents in older CCB |
| **Background** | White content surfaces on light gray (#F7F8FA-ish) page background |
| **Typography** | Clean sans-serif, generous line height, clear hierarchy |
| **Corners** | Moderately rounded cards and buttons |
| **Shadows** | Subtle, layered shadows for cards and dropdowns |
| **Spacing** | Comfortable padding; modules breathe; not content-dense like an ERP |
| **Icons** | Rounded, outlined iconography consistent with modern SaaS |

---

## 7. UX Strengths to Emulate

1. **People-centric data model** — every feature ultimately ties back to a person profile; the profile is the "source of truth" for involvement.
2. **Process queues** — turn follow-up from an inbox into a structured workflow with clear ownership and next steps.
3. **Group dashboards** — groups are collaborative hubs, not static member lists.
4. **Mobile parity** — key staff actions (queues, messages, people lookup) work on mobile, not just desktop.
5. **Saved setups / templates** — reduce repetitive setup (check-in setups, service schedules).
6. **Inline editing** — keeps users in context rather than forcing full-page form reloads.
7. **Contextual communication** — message people from wherever you see them (profile, group, queue, schedule).

---

## 8. Anti-Patterns / Cautions

1. **Avoid the "Facebook-like everything app" trap** — CCB's original low congregant adoption shows that mixing admin and member UX too aggressively can hurt both audiences.
2. **Don't overload profiles** — tabs are essential; dumping every field on one page overwhelms users.
3. **Permission sensitivity** — pastoral notes, background checks, and giving data need fine-grained access control and clear visual indicators of restricted data.
4. **Avoid modal-heavy flows for complex data** — multi-step forms or dedicated pages are better for process setup and event creation.

---

## 9. Mapping to Service Hub

### Immediate relevance: `directory` sub-app

The existing `directory` sub-app has:
- `DirectoryShell.jsx` with Dashboard / Browse tabs
- `DirectoryDashboard.jsx` — bento stat cards + department chart
- `index.jsx` (Browse) — searchable/filterable member grid
- Mock data only; no backend yet

### Recommended borrowings from Pushpay

| Pushpay pattern | Service Hub application |
|---|---|
| Person profile with About / Involvement / Notes tabs | Replace mock member cards with a detail view |
| Family/household relationships | Add household grouping to directory models |
| Process queues | Add a "Follow-up Pipelines" feature under directory or as a separate sub-app |
| Group dashboards | Upgrade directory groups from filters to full group hubs |
| Quick actions on cards | "Email", "Add to Group", "Add to Pipeline" buttons on member cards |
| Saved reports/filters | Persisted filter views in the browse page |
| Mobile-friendly member lookup | Responsive grid and large tap targets |

### Data-model hints for Service Hub

If expanding directory, consider Prisma additions:

```prisma
model DirectoryPerson {
  id              String   @id @default(uuid())
  userId          String?  // link to auth User if they have login
  firstName       String
  lastName        String
  email           String?
  phone           String?
  campus          String?
  householdId     String?
  household       DirectoryHousehold? @relation(fields: [householdId], references: [id])
  memberships     DirectoryGroupMembership[]
  notes           DirectoryNote[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model DirectoryHousehold {
  id        String @id @default(uuid())
  name      String
  people    DirectoryPerson[]
  address   String?
}

model DirectoryGroup {
  id          String @id @default(uuid())
  name        String
  groupType   String // small_group, ministry, class, team
  memberships DirectoryGroupMembership[]
  events      DirectoryGroupEvent[]
}

model DirectoryGroupMembership {
  personId String
  groupId  String
  role     String // leader, co_leader, member
  person   DirectoryPerson @relation(fields: [personId], references: [id])
  group    DirectoryGroup  @relation(fields: [groupId], references: [id])
  @@id([personId, groupId])
}

model DirectoryNote {
  id       String @id @default(uuid())
  personId String
  content  String
  authorId String
  isPrivate Boolean @default(false)
  person   DirectoryPerson @relation(fields: [personId], references: [id])
  createdAt DateTime @default(now())
}
```

---

## 10. Sources

- Pushpay ChMS product page: https://pushpay.com/product/chms-software/
- Pushpay product releases: https://pushpay.com/product/releases/
- Church Community Builder review (ChurchTechToday): https://churchtechtoday.com/church-community-builder-review-church-management-software/
- Pushpay App ChMS case study (Sean McCarthy / Basik Media): https://basikmedia.net/project/pushpay-app-chms
- Must-Have Church Management System Features (Pushpay blog): https://pushpay.com/blog/church-management-system-features/
- Pushpay ChMS support / help center (queued profile, check-in, groups, schedules)
- CCB / Pushpay API documentation

---

## 11. Next Steps (Optional)

If you want to act on this reference:

1. **Audit the current `directory` sub-app** against the patterns above and produce a gap list.
2. **Create low-fidelity wireframes** for a Person Profile page and a Group Dashboard.
3. **Design a "Follow-up Pipeline" / process-queue feature** for the directory sub-app.
4. **Generate a design system update** (color, typography, spacing) aligned with the cleaner Pushpay aesthetic using the `ui-ux-pro-max` skill.
5. **Add backend models** for households, groups, notes, and memberships.
