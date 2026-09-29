function buildInvoicePayload_(userId) {
  return 'membership_30d:' + String(userId) + ':' + Utilities.getUuid().replace(/-/g, '');
}

function handlePreCheckoutQuery_(query) {
  try {
    const expectedPrice = getMonthlyPriceStars_();
    if (!expectedPrice) {
      answerPreCheckoutQuery_(query.id, false, 'ระบบยังไม่ได้ตั้งราคาสมาชิก');
      return;
    }

    const payload = String(query.invoice_payload || '');
    const userId = String(query.from.id);
    const validPrefix = 'membership_30d:' + userId + ':';

    if (query.currency !== 'XTR') {
      answerPreCheckoutQuery_(query.id, false, 'สกุลเงินไม่ถูกต้อง');
      return;
    }

    if (payload.indexOf(validPrefix) !== 0) {
      answerPreCheckoutQuery_(query.id, false, 'รายการชำระเงินไม่ถูกต้อง');
      return;
    }

    if (Number(query.total_amount) !== expectedPrice) {
      answerPreCheckoutQuery_(query.id, false, 'ราคาสมาชิกเปลี่ยน กรุณาสร้างรายการใหม่');
      return;
    }

    answerPreCheckoutQuery_(query.id, true);
  } catch (err) {
    logError_('PRECHECKOUT_ERROR', String(query.id), err);
    answerPreCheckoutQuery_(query.id, false, 'ไม่สามารถตรวจสอบรายการได้');
  }
}

function handleSuccessfulPayment_(message) {
  const payment = message.successful_payment;
  const user = message.from;

  if (payment.currency !== 'XTR') {
    throw new Error('Unexpected payment currency: ' + payment.currency);
  }

  if (payment.invoice_payload.indexOf('membership_30d:' + String(user.id) + ':') !== 0) {
    throw new Error('Invalid payment payload for user ' + user.id);
  }

  const chargeId = String(payment.telegram_payment_charge_id);
  if (paymentAlreadyRecorded_(chargeId)) return;

  const paymentId = 'PAY-' + Utilities.getUuid();
  appendPayment_(paymentId, user.id, payment, payment.is_recurring ? 'RENEWAL' : 'NEW');
  activateMembership_(user, paymentId, payment);
  appendLog_('MEMBERSHIP_ACTIVATED', user.id, paymentId, 'Membership activated after successful Stars payment.');

  sendMessage_(user.id,
    '🎉 ชำระเงินสำเร็จ\n\nสมาชิกของคุณเปิดใช้งานแล้ว\nหมดอายุ: ' +
    formatDate_(findMember_(user.id).expires_at) +
    '\n\nกดปุ่มด้านล่างเพื่อขอเข้ากลุ่ม'
  );
}

function paymentAlreadyRecorded_(chargeId) {
  const sheet = getSheet_('PAYMENTS');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][5]) === chargeId) return true;
  }
  return false;
}

function appendPayment_(paymentId, userId, payment, type) {
  getSheet_('PAYMENTS').appendRow([
    paymentId,
    String(userId),
    payment.invoice_payload,
    Number(payment.total_amount),
    payment.currency,
    payment.telegram_payment_charge_id,
    new Date(),
    type,
    'PAID',
    payment.is_recurring ? 'recurring' : 'initial'
  ]);
}

function formatDate_(date) {
  if (!date) return '-';
  return Utilities.formatDate(new Date(date), getTimezone_(), 'dd/MM/yyyy HH:mm');
}
