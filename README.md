# Telegram Stars Membership Bot

ระบบสมาชิกแบบรายเดือนสำหรับ Telegram Group โดยใช้ Telegram Bot + Telegram Stars

## เป้าหมาย MVP

- ให้สมาชิกสมัครสมาชิกผ่าน Bot
- ชำระค่าบริการด้วย Telegram Stars
- บันทึกสถานะสมาชิกและวันหมดอายุ
- ส่งสิทธิ์เข้ากลุ่มให้สมาชิกที่ชำระสำเร็จ
- แจ้งเตือนก่อนหมดอายุ
- จัดการสมาชิกหมดอายุ
- มีหน้าจอ Admin สำหรับดูภาพรวมในระยะถัดไป

## แนวทางเทคนิคเริ่มต้น

MVP จะหลีกเลี่ยง VPS/Hosting ภายนอกก่อน โดยออกแบบให้สามารถใช้ Google Apps Script + Google Sheets เป็น backend/database ระยะแรกได้

## เอกสารออกแบบ

- [PRD](docs/PRD.md)
- [UI/UX Design](docs/UI-UX-DESIGN.md)
- [Membership Flow](docs/MEMBERSHIP-FLOW.md)
- [Data Model](docs/DATA-MODEL.md)

## หมายเหตุ

ระบบชำระเงินสำหรับ digital goods/services ภายใน Telegram ใช้ Telegram Stars (XTR) ตาม Telegram Bot Payments API
