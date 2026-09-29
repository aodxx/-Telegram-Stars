# MVP Setup Checklist

## A. Telegram
- [ ] Bot exists in BotFather.
- [ ] Bot is Administrator in the Group.
- [ ] Bot has permission to invite users / manage join requests.
- [ ] Bot has permission required to remove/restrict members.
- [ ] Group chat ID is known.
- [ ] Payment/support text is prepared.
- [ ] Membership price is decided.

## B. Google
- [ ] Create the production Google Sheet.
- [ ] Create sheets from GOOGLE-SHEETS-SCHEMA.md.
- [ ] Create an Apps Script project.
- [ ] Add project source files from this repository.
- [ ] Deploy as a Web App.
- [ ] Set Web App access so Telegram can reach it.
- [ ] Copy the deployment URL.

## C. Apps Script Properties
Set:
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
SPREADSHEET_ID=
GROUP_CHAT_ID=
ADMIN_USER_IDS=
MONTHLY_PRICE_STARS=
MEMBERSHIP_DAYS=30
TIMEZONE=Asia/Bangkok

Do not commit real values to GitHub.

## D. Webhook
1. Call setWebhook with the Apps Script Web App URL.
2. Set secret_token.
3. Set allowed_updates.
4. Call getWebhookInfo.
5. Confirm pending updates are not accumulating.

## E. First test
1. Open the Bot.
2. Send /start.
3. Verify Home UI.
4. Press Subscribe.
5. Verify Stars invoice.
6. Complete a test payment in Telegram's test environment.
7. Verify successful payment is stored.
8. Verify membership becomes ACTIVE.
9. Verify the controlled Group join request is approved.
10. Verify ACCESS_LOG and LOGS.

## F. Production gate
Do not connect production Group/payment configuration until duplicate payment, expiration/removal, renewal, support/refund, secret handling, and webhook diagnostics have been tested.
