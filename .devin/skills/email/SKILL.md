---
name: service-hub-email-page
description: Guide for building the email campaign scheduler and subscriber management dashboard.
---

# Email Campaigns (`client/src/pages/email`)

## Overview
The Email sub-app is a comprehensive email marketing platform that enables users to create, manage, and track email campaigns. It provides campaign composition, mailing list management, segmentation, scheduling, and detailed analytics.

Sending, deliverability tracking, and analytics depend on a third-party ESP — this app does not send mail directly over SMTP from the app server. See "Sending Architecture" below before implementing anything in Phase 8.

## Key Features

### Campaign Composer
- **Rich Text/HTML Editor:** WYSIWYG editor for creating email content
- **Template Library:** Pre-designed email templates for common use cases (see `EmailTemplate` model)
- **Mail-Merge Placeholders:** Dynamic content insertion (e.g., `{{name}}`, `{{company}}`)
- **Preview & Test:** Send test emails before campaign launch
- **Responsive Design:** Mobile-optimized email rendering
- **Media Support:** Image uploads and embedding (reuse `WebAsset` model from the CMS app)
- **Save as Draft:** Campaign persistence and versioning

### Mailing List Management
- **CSV Import/Export:** Bulk contact management — see "CSV Handling" below for injection safeguards
- **Contact Fields:** Custom fields for subscriber data
- **List Segmentation:** Filter contacts by behavior, demographics, and engagement
- **List Search:** Quick contact lookup
- **Contact Management:** Add, edit, delete individual contacts
- **Suppression List:** Recipients with `status: unsubscribed | bounced | complained` are excluded from every send — enforced at send time, not just tracked after the fact
- **Duplicate Detection:** Case-insensitive email match, scoped per mailing list
- **Validation:** Email syntax and domain validation on both manual entry and CSV import

### Campaign Scheduling
- **Immediate Send:** Enqueues a send job immediately
- **Scheduled Send:** Set specific date/time for delivery; a scheduler picks up due campaigns and enqueues send jobs
- **Time Zone Support:** Store `scheduledAt` in UTC; display/convert in the recipient's or admin's local time zone in the UI only
- **Queue Management:** View and manage scheduled/queued campaigns, including cancel-before-send

### Campaign Analytics
- **Delivery status tracking:** driven by ESP webhook events (see "Sending Architecture"), not polling
- **Open Rate Tracking:** via ESP open-tracking pixel
- **Click Tracking:** via ESP link-rewriting
- **Bounce Handling:** categorize soft vs. hard bounces from ESP webhook payloads; hard bounces move the recipient to `status: bounced` and suppress future sends
- **Unsubscribe Tracking:** monitor opt-outs via the unsubscribe endpoint and ESP complaint webhooks
- **Geographic/Device Data:** only available if the ESP provides it in webhook payloads (most do via user-agent/IP on open/click events) — don't build this as a first-party feature
- **Comparative Reports:** compare `CampaignMetrics` across campaigns
- **Export Reports:** CSV export of analytics data — apply the same CSV-injection escaping as contact export

## Sending Architecture

This app does not send email directly from the Express request/response cycle. Two problems rule that out: Azure App Service on iisnode is a synchronous IIS worker process (not suited to holding a request open for a bulk send), and open/click/bounce tracking requires infrastructure (tracking pixels, link rewriting, feedback loops) that's impractical to build first-party.

**ESP:** send through a transactional/bulk email provider (e.g. SendGrid, Postmark, or Azure Communication Services Email) via their API, not raw SMTP. Confirm the specific provider with the user before implementing Phase 8 — this skill doesn't hardcode one, but every downstream piece (webhook payload shape, unsubscribe header support, rate limits) depends on the choice.

**Queue:** campaign sends are enqueued as background jobs, not processed inline in the controller.
- `POST /campaigns/:id/send` validates the campaign and recipient list, flips status to `scheduled` (or `sending`), and enqueues a job — it returns immediately, it does not send synchronously.
- Use a real queue (e.g. BullMQ + a managed Redis instance, or Azure Queue Storage + a separate worker/Azure Function). A `setTimeout`/in-process loop is not durable across app restarts or multiple instances and will silently drop or duplicate sends.
- The worker batches recipients (respect the ESP's rate limits), calls the ESP API per batch, and writes one `EmailLog` row per recipient per event as webhook events arrive.

**Webhook receiver:** a dedicated route (e.g. `POST /webhooks/email`) receives ESP delivery events (delivered, opened, clicked, bounced, complained, unsubscribed):
- This route is unauthenticated by JWT (the ESP calls it, not a logged-in user) — verify it instead via the ESP's signing-secret/HMAC verification mechanism. Do not put it behind `verifyToken`/`requireAppAccess`.
- Each event upserts an `EmailLog` row and increments the matching counter on `CampaignMetrics`.
- A `bounced` (hard) or `complained` event also updates the `Recipient.status` so future sends exclude them.

## Technical Architecture

### Database Schema
```prisma
model EmailCampaign {
  id             String             @id @default(uuid())
  name           String
  subject        String
  bodyHtml       String             // sanitized on write per the service-hub skill's Input Validation rules
  fromName       String
  fromEmail      String
  replyTo        String?
  status         String             // "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed"
  scheduledAt    DateTime?          // stored in UTC
  sentAt         DateTime?
  mailingListId  String?
  mailingList    MailingList?       @relation(fields: [mailingListId], references: [id])
  templateId     String?
  template       EmailTemplate?     @relation(fields: [templateId], references: [id])
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?          // Soft delete — campaign metadata only, see "GDPR & Recipient Erasure" below
  logs           EmailLog[]
  metrics        CampaignMetrics?

  @@index([status])
  @@index([mailingListId])
}

model EmailTemplate {
  id        String          @id @default(uuid())
  name      String
  bodyHtml  String          // sanitized on write, same as EmailCampaign.bodyHtml
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  campaigns EmailCampaign[]
}

model MailingList {
  id          String      @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  recipients  Recipient[]
  campaigns   EmailCampaign[]
}

model Recipient {
  id            String      @id @default(uuid())
  email         String
  firstName     String?
  lastName      String?
  customFields  String?     // JSON serialized, validated via Zod on write
  status        String      @default("active") // "active" | "unsubscribed" | "bounced" | "complained"
  consentSource String?     // e.g. "csv_import" | "signup_form" | "manual" — required for GDPR consent records
  consentAt     DateTime?
  mailingListId String
  list          MailingList @relation(fields: [mailingListId], references: [id])
  logs          EmailLog[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([mailingListId, email])
  @@index([status])
}

model EmailLog {
  id           String        @id @default(uuid())
  campaignId   String
  recipientId  String
  status       String        // "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed"
  sentAt       DateTime      @default(now())
  metadata     String?       // JSON: raw ESP event payload (device, geo, link clicked, etc. — whatever the ESP provides)
  campaign     EmailCampaign @relation(fields: [campaignId], references: [id])
  recipient    Recipient     @relation(fields: [recipientId], references: [id])

  @@index([campaignId, status])
  @@index([recipientId])
}

model CampaignMetrics {
  id          String        @id @default(uuid())
  campaignId  String        @unique
  sent        Int           @default(0)
  delivered   Int           @default(0)
  opened      Int           @default(0)
  clicked     Int           @default(0)
  bounced     Int           @default(0)
  unsubscribed Int          @default(0)
  complained  Int           @default(0)
  campaign    EmailCampaign @relation(fields: [campaignId], references: [id])
}
```
> Changed from the parent skill's version: `EmailLog.recipient` (a raw string) is now `EmailLog.recipientId` (a foreign key to `Recipient`), added indexes on the fields analytics/send-filtering actually query, added `EmailTemplate`, and added `Recipient.consentSource`/`consentAt` for GDPR. If you're copying the parent `service-hub` skill's schema block instead of this one, apply these same changes — this version supersedes it for the email sub-app.

### Component Structure
- **EmailShell.jsx:** Pass-through shell rendering `<Outlet />` (section nav lives in the sidebar drill-down/accordion)
- **EmailDashboard.jsx:** List of all campaigns with quick stats
- **CampaignComposer.jsx:** Rich text editor for email content
- **NewsletterBuilder.jsx:** Newsletter template builder
- **MailingLists.jsx:** Contact list management
- **CampaignAnalytics.jsx:** Detailed analytics view

### State Management
- React useState for campaign composition
- Zustand global store in `client/src/pages/email/store/emailStore.js` (campaigns, mailing lists, composition state)
- Campaign content stored as HTML string in database (sanitized on write, escaped/rendered safely wherever previewed)

## Key Patterns

### Campaign Status Flow
1. **draft** → Initial state, editable
2. **scheduled** → Queued for future delivery, send job not yet enqueued
3. **sending** → Send job enqueued/in progress, not editable
4. **sent** → All batches handed to the ESP
5. **paused** → Paused during delivery (for troubleshooting) — the worker must check for `paused` between batches and stop
6. **failed** → Send job errored before completion; surfaced to the admin with the failure reason

### Mail-Merge Placeholders
Replace placeholders in subject and body at send time (per-recipient, in the worker — not in the composer):
- `{{firstName}}` → Recipient's first name
- `{{lastName}}` → Recipient's last name
- `{{email}}` → Recipient's email
- `{{company}}` → Custom field from recipient data

If a placeholder has no value for a given recipient, fall back to an empty string or a configured default — don't send `{{firstName}}` literally.

### CSV Handling
Applies to both import and export:
- **Injection escaping (export):** any field value starting with `=`, `+`, `-`, or `@` must be prefixed (e.g. with a leading `'` or tab) before writing, so Excel/Sheets doesn't interpret it as a formula.
- **Import validation:** validate email syntax per row; reject or quarantine malformed rows into an "import errors" report rather than failing the whole import.
- **Import format:**
```csv
firstName,lastName,email,company
John,Doe,john@example.com,Acme Corp
Jane,Smith,jane@example.com,Tech Inc
```
- Imported recipients get `consentSource: "csv_import"` — flag in the UI that the importing user is attesting they have consent to email these contacts; this app doesn't verify that independently.

## Integration Points
- **Auth System:** Uses existing JWT authentication for all admin-facing routes. The unsubscribe endpoint and the ESP webhook receiver are explicit exceptions — see "Sending Architecture" and "Unsubscribe & Compliance."
- **Design System:** THEME.md tokens and components
- **Database:** Prisma integration with existing schema
- **API Structure:** Consistent with existing backend patterns
- **Validation:** all writes (campaign, template, recipient, custom fields) go through Zod schemas per the parent `service-hub` skill's Input Validation section; `bodyHtml` is sanitized, not just validated

## Unsubscribe & Compliance

- **One-click unsubscribe:** every send includes a `List-Unsubscribe` header (and `List-Unsubscribe-Post` for one-click) pointing at a public, unauthenticated unsubscribe route. Gmail/Yahoo require this for bulk senders — don't gate it behind login.
- **Unsubscribe link in body:** in addition to the header, the rendered email body must include a visible unsubscribe link (CAN-SPAM requirement), plus the sender's physical mailing address. Add a `senderAddress` setting (org-level, not per-campaign) and inject it into every send template.
- **Suppression is enforced at send time:** the worker filters out `unsubscribed`/`bounced`/`complained` recipients before calling the ESP, not just after the fact via tracking.

### GDPR & Recipient Erasure
`EmailCampaign.deletedAt` is a soft delete of campaign metadata — it does not touch recipient PII and does not satisfy an erasure request by itself.

For a recipient-level deletion/erasure request:
- Hard-delete or anonymize the `Recipient` row's PII (`email`, `firstName`, `lastName`, `customFields`) — replace with a tombstone/anonymized marker rather than removing the row outright, so `EmailLog` foreign keys and `CampaignMetrics` counts stay intact.
- `EmailLog` rows for that recipient remain (aggregate counts are not personal data once the recipient link is anonymized), but should no longer be joinable back to identifying info.
- Log the erasure action itself (who requested it, when, who performed it) for audit purposes.
- Build this as an explicit admin action, not an automatic cascade on `Recipient` delete — accidental hard-deletes of recipients should not be indistinguishable from GDPR erasures.

## Performance Requirements
- **Import speed:** CSV import of 10,000+ contacts runs as a background job (same queue mechanism as sends), not inline in the request — return immediately with an import job ID and report progress/results asynchronously.
- **Send speed:** batched, queued send processing per "Sending Architecture" above; batch size and pacing tuned to the chosen ESP's rate limits.
- **Live analytics:** poll `CampaignMetrics` on an interval (e.g. every 10-30s while a campaign is `sending`) rather than building a WebSocket layer for v1 — revisit if polling proves insufficient.
- **Caching:** cache `EmailTemplate` list and static list-metadata reads; don't cache anything containing live recipient status.
- **Pagination:** cursor or offset pagination on `Recipient` and `EmailLog` queries — never load a full mailing list or log table into memory.