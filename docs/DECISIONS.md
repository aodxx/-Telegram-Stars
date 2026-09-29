# Design Decisions

## 2026-09-30

### D001 — Monthly plan
MVP uses one 30-day membership plan. Price remains configurable.

### D002 — Telegram Stars
Digital goods/services sold inside Telegram use Telegram Stars (XTR). Telegram's current Bot API supports a 30-day subscription period for Stars invoices.

### D003 — Group access
The project targets an existing Telegram Group. Telegram's dedicated paid subscription invite link API is currently documented for channels, so the Group flow will use bot-controlled membership/invite management rather than assuming channel paid-invite behavior.

### D004 — No VPS for MVP
Start with the simplest backend possible. Google Apps Script + Google Sheets remains the planned MVP backend unless testing shows that webhook/runtime requirements justify another host.

### D005 — Payment confirmation
Membership is activated only after the bot receives and validates the successful payment update. A button click or client-side state is never sufficient.

### D006 — Content rights
The membership system is designed for content/services the operator is authorized to provide.
