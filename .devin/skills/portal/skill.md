# Portal Sub-App Skill

## Purpose

The Portal sub-app contains member-facing and operational workflows that belong outside the Email Sender app. The current operational workflow is **Payment Reconciliation**, which displays inbound email records received from `serviceoffice@churchinhouston.org`.

## Current routes

- `/hub-admin/portal/dashboard` — Portal dashboard
- `/hub-admin/portal/payment-reconciliation` — Payment Reconciliation page

The Payment Reconciliation page reads stored inbound email records through `GET /api/email/inbound`. The underlying API remains mounted under the email API namespace because the database model and webhook are email-ingestion infrastructure.

## Inbound email data flow

1. Google Workspace receives mail at `serviceoffice@churchinhouston.org`.
2. Google Apps Script polls the mailbox and sends email data to the production webhook:
   `https://houstonservicehub.azurewebsites.net/api/email/inbound`
3. The server validates the `x-webhook-secret` header against `INBOUND_EMAIL_WEBHOOK_SECRET`.
4. Prisma stores the message in the `InboundEmail` table.
5. Portal → Payment Reconciliation loads the records through the authenticated API.

## Local development limitation

Google Apps Script runs on Google's servers and cannot reach `http://localhost:4000`. Therefore, the Apps Script webhook cannot deliver inbound email data to a local ServiceHub instance using a localhost URL.

Use the production webhook URL for end-to-end email testing. If local webhook testing is required, expose the local server through a secure tunnel such as ngrok and use the temporary HTTPS tunnel URL in Apps Script. The production URL is the supported path for the current workflow.

## Webhook secret

The value of `INBOUND_EMAIL_WEBHOOK_SECRET` must be configured in Azure App Service production settings and must exactly match `CONFIG.WEBHOOK_SECRET` in the Google Apps Script. Never commit the real secret to source control.

## Maintenance rules

- Keep Payment Reconciliation navigation under the Portal app, not Email Sender.
- Keep inbound webhook routes and persistence logic separate from Portal UI code.
- Preserve pagination, search, message detail, and delete behavior when changing the page.
- Restart or redeploy the server after changing production environment variables.
- Run `npx prisma db push` after schema changes affecting `InboundEmail`.
