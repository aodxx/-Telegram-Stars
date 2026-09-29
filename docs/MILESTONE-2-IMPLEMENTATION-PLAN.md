# Milestone 2 — Core Bot Implementation Plan

## Status
Technical architecture is approved. The next implementation target is the Google Apps Script runtime.

## Source modules
- Code.gs — doGet/doPost and update routing
- Config.gs — Script Properties and configuration validation
- Telegram.gs — Telegram Bot API wrapper
- Handlers.gs — /start, callbacks, join requests and member updates
- Payment.gs — Stars invoice, pre-checkout and successful payment processing
- Membership.gs — membership state and renewal calculations
- Storage.gs — Google Sheets persistence, logs and idempotency
- Worker.gs — scheduled expiration/reminder processing

## Runtime sequence
1. Deploy Apps Script as a Web App.
2. Initialize the six Sheets defined in GOOGLE-SHEETS-SCHEMA.md.
3. Set Script Properties without committing secrets.
4. Configure Telegram webhook.
5. Test /start.
6. Test Stars invoice and pre-checkout.
7. Test successful payment and membership activation.
8. Test Group join request approval.
9. Test expiration.
10. Test renewal and duplicate-update protection.

## Important implementation constraints
- Membership is never activated from a button click.
- Only validated successful payment data can activate membership.
- telegram_payment_charge_id is the payment idempotency key.
- Group membership is not proof of payment.
- Join requests are checked against the current MEMBERS record.
- Historical payment rows are append-only.
- Secrets remain in Apps Script Properties.
- Production credentials must never be committed to GitHub.

## Current configuration required from the operator
The implementation cannot be connected to the production environment until these values are supplied in Apps Script:
- Telegram Bot token
- Telegram webhook secret
- Google Spreadsheet ID
- Existing Group chat ID
- Admin Telegram user ID(s)
- Monthly Stars price

These values should be entered directly into Script Properties, not sent in chat or stored in GitHub.
