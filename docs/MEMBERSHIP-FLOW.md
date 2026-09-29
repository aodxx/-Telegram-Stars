# Membership Flow

## Main Flow

สมาชิก
→ /start
→ Home
→ สมัครสมาชิก
→ สร้าง Invoice
→ Telegram Stars
→ pre_checkout_query
→ answerPreCheckoutQuery
→ successful_payment
→ บันทึก Payment
→ เปิดสิทธิ์สมาชิก
→ ส่งสิทธิ์เข้ากลุ่ม
→ Active

## Renewal Flow

สมาชิก Active
→ ต่ออายุ
→ Invoice Subscription / Renewal
→ Successful Payment
→ ขยายวันหมดอายุ
→ แจ้งผล

## Expiration Flow

Scheduled Check
→ ตรวจ expire_date
→ ถ้ายังไม่หมดอายุ: ไม่ทำอะไร
→ ถ้าใกล้หมดอายุ: แจ้งเตือน
→ ถ้าหมดอายุ: เปลี่ยนสถานะ EXPIRED
→ จัดการสิทธิ์ใน Group ตาม policy

## Payment Safety

ห้ามเปิดสิทธิ์จากการกดปุ่มชำระเงินเพียงอย่างเดียว
ต้องใช้ Telegram payment update ที่ยืนยันสำเร็จ

เก็บ:
- telegram_user_id
- invoice payload
- amount
- currency
- telegram_payment_charge_id
- paid_at
- subscription expiration
