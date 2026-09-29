# Google Sheets Schema — MVP

## MEMBERS
A user_id, B username, C display_name, D plan, E status, F started_at, G expires_at, H auto_renew, I last_payment_id, J created_at, K updated_at.

## PAYMENTS
A payment_id, B user_id, C payload, D amount_stars, E currency, F telegram_payment_charge_id, G paid_at, H type, I status, J raw_reference.

type = NEW or RENEWAL.
status = PAID, REFUNDED, or FAILED.

## ACCESS_LOG
A log_id, B user_id, C chat_id, D action, E reason, F event_at.

Actions can include APPROVED, DECLINED, REMOVED, RESTRICTED.

## LOGS
A log_id, B event_type, C user_id, D reference_id, E message, F created_at.

## SETTINGS
Key/value configuration:
monthly_price_stars
membership_days = 30
timezone = Asia/Bangkok
reminder_days_1 = 3
reminder_days_2 = 1

Sensitive credentials are not stored in Sheets.

## PROCESSED_UPDATES
A update_id, B received_at, C update_type, D status.

## Data rules
1. Payment history is append-only.
2. A payment charge ID must not be credited twice.
3. MEMBERS contains current membership state.
4. LOGS and ACCESS_LOG preserve the audit trail.
5. Store/display dates consistently using Asia/Bangkok.
6. Never store bot tokens or webhook secrets in Sheets.
