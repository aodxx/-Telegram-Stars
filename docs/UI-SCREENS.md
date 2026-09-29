# UI Screen Specification — v0.2

## Member Bot

### S01 — Home / ยังไม่เป็นสมาชิก
Header: 🎬 MEMBERSHIP
Status card: ⚪ ยังไม่ได้เป็นสมาชิก
Primary CTA: ⭐ สมัครสมาชิก
Secondary: ℹ️ รายละเอียด | ❓ วิธีใช้งาน

### S02 — Package
Header: ⭐ สมาชิก 30 วัน
Price: {monthly_price_stars} Stars
Benefits:
- เข้ากลุ่มสมาชิก
- ใช้งาน 30 วัน
- แจ้งเตือนก่อนหมดอายุ
- ต่ออายุได้
CTA: ⭐ สมัครสมาชิก

### S03 — Payment
Header: 💳 ยืนยันการสมัคร
Package: Monthly / 30 วัน
Price: {monthly_price_stars} Stars
CTA: ชำระผ่าน Telegram invoice

### S04 — Success
Header: 🎉 ชำระเงินสำเร็จ
Show start/end dates
CTA: 🔐 เข้ากลุ่มสมาชิก
Secondary: 👤 สมาชิกของฉัน

### S05 — Active Membership
Status: 🟢 ACTIVE
Show plan, start, expiry, remaining days
CTA: 🔄 ต่ออายุ | 🔐 เข้ากลุ่ม

### S06 — Expiring
Status: 🟠 ใกล้หมดอายุ
Show remaining days and expiry
CTA: 🔄 ต่ออายุ

### S07 — Expired
Status: 🔴 EXPIRED
CTA: ⭐ สมัครสมาชิกใหม่ | 👨‍💼 ติดต่อแอดมิน

### S08 — Help
Payment help, membership help, admin contact
CTA: 💳 ปัญหาการชำระเงิน | 👨‍💼 ติดต่อแอดมิน

## Admin

### A01 — Dashboard
- Total members
- Active
- Expiring soon
- Expired
- Stars revenue
- Payment count

### A02 — Members
Search/filter by status
Open member → membership detail

### A03 — Payments
Filter by date/status/type
View payment details and Telegram charge ID

### A04 — Settings
- Monthly Stars price
- Membership period
- Group ID
- Reminder schedule
- Admin IDs

## Mobile-first rule

ทุกข้อความต้องพอดีกับหน้าจอ Telegram มือถือโดยไม่ต้องเลื่อนแนวนอน และ CTA หลักต้องอยู่ในตำแหน่งเด่นที่สุด
