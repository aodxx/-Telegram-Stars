# Technical Architecture — MVP

## 1. Goal
Build a monthly membership system for an existing Telegram Group using Telegram Stars (XTR), with the Bot as the access-control authority.

Architecture:
Telegram User -> Telegram Bot -> Google Apps Script Webhook -> Google Sheets.
Apps Script also calls the Telegram Bot API and runs scheduled expiry/reminder jobs.

No VPS or separate domain is required for the MVP. The Apps Script Web App provides the HTTPS webhook endpoint.

## 2. Responsibilities
Telegram Bot:
- Display membership UI.
- Send Stars invoices.
- Receive payment and membership updates.
- Provide controlled Group access.
- Receive join requests.
- Send reminders and support messages.

Google Apps Script:
- Receive updates through doPost(e).
- Route update types.
- Validate pre-checkout data.
- Process successful payments.
- Activate/extend membership.
- Control Group access.
- Record audit/payment/member data.
- Run scheduled jobs.

Google Sheets:
- Persistent MVP database.
- Payment history is append-only.
- MEMBERS stores current membership state.

## 3. Webhook security
Use Telegram setWebhook with secret_token. Store the secret in Apps Script Properties and never commit it to GitHub. Reject requests whose Telegram secret header does not match.

## 4. Configuration
Apps Script Properties:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- SPREADSHEET_ID
- GROUP_CHAT_ID
- ADMIN_USER_IDS
- MONTHLY_PRICE_STARS
- MEMBERSHIP_DAYS (default 30)
- TIMEZONE (default Asia/Bangkok)

## 5. Required update types
MVP handlers:
- message
- callback_query
- pre_checkout_query
- chat_join_request
- chat_member
- subscription

## 6. Payment authority
A button click is never treated as payment. The authoritative activation event is a validated successful_payment update. Store telegram_payment_charge_id before granting service.

## 7. Group access model
The project uses an existing Group rather than a Channel.

MVP:
1. User pays successfully.
2. Bot activates membership.
3. Bot provides a controlled invite link configured for join requests.
4. User submits a join request.
5. Bot receives chat_join_request.
6. Bot checks membership status and expiration.
7. Active member: approve.
8. Inactive/expired member: decline.
9. Expired existing members are removed/restricted according to policy.

## 8. Membership states
PENDING_PAYMENT, ACTIVE, EXPIRING_SOON, EXPIRED, SUSPENDED, REFUNDED.

## 9. Renewal
If membership is active, extend from the current expiration date. If expired, start a new 30-day period from payment time. Never overwrite historical payments.

Automatic Stars subscription updates must be processed separately and idempotently.

## 10. Scheduled jobs
Use Apps Script time-driven triggers. Recommended MVP: hourly worker. It sends reminders, marks expired members, removes/restricts expired members, and logs actions. The worker must be idempotent.

## 11. Idempotency
Use update_id tracking where appropriate and telegram_payment_charge_id as the payment de-duplication key. Check existing records before activating or extending membership.

## 12. Admin
Phase 1: authorized Bot commands/buttons for members, payments, system status, and configurable settings.
Phase 2: web dashboard matching the approved UI prototype.

## 13. Testing
Use separate TEST and PROD configuration. Test payment, duplicate updates, join requests, expiration, renewal, refund/support, and webhook failure/retry behavior.

## 14. Non-goals
No VPS, custom domain, native mobile app, complex analytics, multi-plan billing, affiliate system, or content-delivery system in MVP.

## 15. Content rights
The membership system must only provide access to content/services the operator is authorized to distribute or monetize.
