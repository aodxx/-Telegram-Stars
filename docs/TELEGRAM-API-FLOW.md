# Telegram API Flow — MVP

## 1. /start
User sends /start.
Bot identifies the user, creates/updates MEMBERS, reads membership status, and shows Home UI.

## 2. Subscribe
User presses สมัครสมาชิก.
Bot reads MONTHLY_PRICE_STARS, creates a unique invoice payload, and sends a Telegram Stars invoice using currency XTR.
For a 30-day recurring Stars subscription, use Telegram's supported 30-day subscription period when automatic renewal is enabled.

## 3. Pre-checkout
On pre_checkout_query, validate:
- user ID
- invoice payload
- currency XTR
- configured amount
- valid plan

Then answerPreCheckoutQuery OK only when validation succeeds.
Never activate membership at this stage.

## 4. Successful payment
On successful_payment:
1. Extract user ID, payload, amount, currency, and telegram_payment_charge_id.
2. Check whether the charge ID was already processed.
3. Write PAYMENTS.
4. Activate or extend membership.
5. Log the activation.
6. Provide controlled Group access.
7. Send success UI.

## 5. Group join request
The access link creates a join request.
On chat_join_request, verify the requested chat and the user's ACTIVE membership and expiration.
If valid, approve the request and log it.
If invalid, decline and log it.

## 6. Existing member monitoring
Use chat_member updates to synchronize join/leave/remove/restrict events. Group membership itself is never treated as proof of payment.

## 7. Expiration worker
Recommended reminders: 3 days and 1 day before expiry. On expiration, set EXPIRED and remove/restrict access. On renewal, restore access.

## 8. Subscription updates
Telegram's current Bot API provides a subscription update for changes to a user's bot payment subscription. Distinguish initial payment, recurring renewal, and cancellation/status changes. Do not double-credit an already recorded payment.

## 9. Support/refund
Implement /paysupport. Explain how members can contact the operator for payment problems and refund requests. Record refunds in PAYMENTS and membership history.

## 10. Webhook
Use setWebhook with the Apps Script Web App URL, secret_token, and configured allowed_updates. Use getWebhookInfo for diagnostics.

## 11. Error handling
Catch unexpected exceptions, write a LOG row, and avoid exposing secrets. Critical failures must leave enough diagnostic information for safe repair/replay.
