# Data Model

## MEMBERS

| Field | Purpose |
|---|---|
| user_id | Telegram User ID |
| username | Telegram username |
| display_name | ชื่อที่แสดง |
| plan | แผนสมาชิก |
| status | ACTIVE / EXPIRING / EXPIRED / BLOCKED |
| started_at | วันเริ่ม |
| expires_at | วันหมดอายุ |
| auto_renew | สถานะต่ออายุ |
| created_at | วันที่สร้าง record |
| updated_at | วันที่แก้ไขล่าสุด |

## PAYMENTS

| Field | Purpose |
|---|---|
| payment_id | internal ID |
| user_id | ผู้ชำระ |
| payload | invoice payload |
| amount_stars | จำนวน Stars |
| currency | XTR |
| telegram_charge_id | Telegram payment charge ID |
| paid_at | เวลาชำระ |
| type | NEW / RENEWAL |
| status | PAID / REFUNDED / FAILED |

## SETTINGS

| Key | Example |
|---|---|
| monthly_price_stars | TBD |
| membership_days | 30 |
| group_chat_id | TBD |
| timezone | Asia/Bangkok |
| admin_user_ids | TBD |

## LOGS

เก็บเหตุการณ์สำคัญ เช่น:
- payment received
- membership activated
- invite generated
- member joined
- reminder sent
- membership expired
- member removed/restricted
- refund
- admin action
