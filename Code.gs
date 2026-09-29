/**
 * Telegram Stars Membership Bot — MVP
 * Single-file Google Apps Script
 *
 * Runtime:
 * Telegram Bot -> Webhook -> Google Apps Script -> Google Sheets
 *
 * Secrets/config are stored in Apps Script Script Properties.
 *
 * Required properties:
 * TELEGRAM_BOT_TOKEN
 * TELEGRAM_WEBHOOK_SECRET
 * SPREADSHEET_ID
 * GROUP_CHAT_ID
 * ADMIN_USER_IDS
 * MONTHLY_PRICE_STARS
 * MEMBERSHIP_DAYS
 * TIMEZONE
 */

const SHEETS = {
  MEMBERS: 'MEMBERS',
  PAYMENTS: 'PAYMENTS',
  ACCESS_LOG: 'ACCESS_LOG',
  LOGS: 'LOGS',
  SETTINGS: 'SETTINGS',
  PROCESSED_UPDATES: 'PROCESSED_UPDATES'
};

const HEADERS = {
  MEMBERS: [
    'user_id','username','display_name','plan','status',
    'started_at','expires_at','auto_renew','last_payment_id',
    'created_at','updated_at'
  ],
  PAYMENTS: [
    'payment_id','user_id','payload','amount_stars','currency',
    'telegram_charge_id','paid_at','type','status','payment_mode'
  ],
  ACCESS_LOG: [
    'timestamp','user_id','action','chat_id','details'
  ],
  LOGS: [
    'timestamp','event','user_id','reference_id','details'
  ],
  SETTINGS: ['key','value'],
  PROCESSED_UPDATES: ['update_id','processed_at']
};

// ============================================================
// WEB APP / WEBHOOK
// ============================================================

function doGet() {
  return ContentService
    .createTextOutput('Telegram Stars Membership Bot is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!isValidWebhookRequest_(e)) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: true });
    }

    const update = JSON.parse(e.postData.contents);
    processUpdate_(update);
    return jsonResponse_({ ok: true });
  } catch (err) {
    logError_('WEBHOOK_ERROR', '', err);
    // Return 200 so Telegram does not repeatedly retry a malformed/handled update.
    return jsonResponse_({ ok: true });
  }
}

function processUpdate_(update) {
  if (!update || update.update_id === undefined || update.update_id === null) return;

  if (isProcessedUpdate_(update.update_id)) return;

  try {
    if (update.pre_checkout_query) {
      handlePreCheckoutQuery_(update.pre_checkout_query);
    } else if (update.message && update.message.successful_payment) {
      handleSuccessfulPayment_(update.message);
    } else if (update.message && update.message.text) {
      handleMessage_(update.message);
    } else if (update.callback_query) {
      handleCallbackQuery_(update.callback_query);
    } else if (update.chat_join_request) {
      handleChatJoinRequest_(update.chat_join_request);
    } else if (update.chat_member) {
      handleChatMember_(update.chat_member);
    } else if (update.subscription) {
      handleSubscriptionUpdate_(update.subscription);
    }

    markProcessedUpdate_(update);
  } catch (err) {
    logError_('UPDATE_ERROR', String(update.update_id), err);
    throw err;
  }
}

function isValidWebhookRequest_(e) {
  const expected = getConfig_('TELEGRAM_WEBHOOK_SECRET', '');
  if (!expected) return true;

  const headers = e && e.headers ? e.headers : {};
  const receivedHeader =
    headers['X-Telegram-Bot-Api-Secret-Token'] ||
    headers['x-telegram-bot-api-secret-token'] ||
    headers['X-Telegram-Bot-Api-Secret-Token'.toLowerCase()] ||
    '';

  // Apps Script web apps do not always expose incoming headers consistently.
  // Query-string fallback is supported for this deployment.
  const receivedQuery = e && e.parameter ? String(e.parameter.secret || '') : '';

  return receivedHeader === expected || receivedQuery === expected;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// CONFIG
// ============================================================

function getConfig_(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value === null || value === '' ? fallback : value;
}

function getRequiredConfig_(key) {
  const value = getConfig_(key, '');
  if (!value) throw new Error('Missing Script Property: ' + key);
  return value;
}

function getConfigNumber_(key, fallback) {
  const value = Number(getConfig_(key, fallback));
  if (!isFinite(value)) throw new Error('Invalid numeric config: ' + key);
  return value;
}

function getAdminUserIds_() {
  return getConfig_('ADMIN_USER_IDS', '')
    .split(',')
    .map(function(v) { return String(v).trim(); })
    .filter(Boolean);
}

function isAdmin_(userId) {
  return getAdminUserIds_().indexOf(String(userId)) !== -1;
}

function getTimezone_() {
  return getConfig_('TIMEZONE', 'Asia/Bangkok');
}

function getMembershipDays_() {
  return getConfigNumber_('MEMBERSHIP_DAYS', 30);
}

function getMonthlyPriceStars_() {
  return getConfigNumber_('MONTHLY_PRICE_STARS', 0);
}

function getGroupChatId_() {
  return getRequiredConfig_('GROUP_CHAT_ID');
}

// ============================================================
// GOOGLE SHEETS / STORAGE
// ============================================================

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getRequiredConfig_('SPREADSHEET_ID'));
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function setupSheets() {
  const ss = getSpreadsheet_();

  Object.keys(SHEETS).forEach(function(key) {
    const name = SHEETS[key];
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    const headers = HEADERS[key];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
      const empty = current.every(function(v) { return v === ''; });
      if (empty) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      }
    }
  });

  logEvent_('SETUP_SHEETS', '', '', 'Sheets initialized.');
  return 'Sheets ready: ' + Object.keys(SHEETS).map(function(k) { return SHEETS[k]; }).join(', ');
}

function findMember_(userId) {
  const sheet = getSheet_(SHEETS.MEMBERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(userId)) {
      return {
        row: i + 1,
        user_id: String(values[i][0]),
        username: values[i][1] || '',
        display_name: values[i][2] || '',
        plan: values[i][3] || '',
        status: values[i][4] || '',
        started_at: values[i][5],
        expires_at: values[i][6],
        auto_renew: values[i][7] === true || String(values[i][7]).toLowerCase() === 'true',
        last_payment_id: values[i][8] || '',
        created_at: values[i][9],
        updated_at: values[i][10]
      };
    }
  }
  return null;
}

function upsertMember_(user, status, startedAt, expiresAt, paymentId, autoRenew) {
  const sheet = getSheet_(SHEETS.MEMBERS);
  const existing = findMember_(user.id);
  const now = new Date();

  const data = [
    String(user.id),
    user.username || '',
    [user.first_name || '', user.last_name || ''].join(' ').trim(),
    'MONTHLY_30D',
    status,
    startedAt,
    expiresAt,
    autoRenew !== undefined ? !!autoRenew : (existing ? existing.auto_renew : false),
    paymentId || (existing ? existing.last_payment_id : ''),
    existing ? existing.created_at : now,
    now
  ];

  if (existing) {
    sheet.getRange(existing.row, 1, 1, data.length).setValues([data]);
  } else {
    sheet.appendRow(data);
  }
}

function isMemberActive_(userId) {
  const member = findMember_(userId);
  return !!member &&
    member.status === 'ACTIVE' &&
    member.expires_at &&
    new Date(member.expires_at).getTime() > Date.now();
}

function setMemberStatus_(userId, status) {
  const member = findMember_(userId);
  if (!member) return false;
  const sheet = getSheet_(SHEETS.MEMBERS);
  sheet.getRange(member.row, 5).setValue(status);
  sheet.getRange(member.row, 11).setValue(new Date());
  return true;
}

function appendPayment_(paymentId, userId, payment, type) {
  getSheet_(SHEETS.PAYMENTS).appendRow([
    paymentId,
    String(userId),
    payment.invoice_payload || '',
    Number(payment.total_amount || 0),
    payment.currency || '',
    payment.telegram_payment_charge_id || '',
    new Date(),
    type,
    'PAID',
    payment.is_recurring ? 'recurring' : 'initial'
  ]);
}

function paymentAlreadyRecorded_(chargeId) {
  if (!chargeId) return false;
  const sheet = getSheet_(SHEETS.PAYMENTS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][5]) === String(chargeId)) return true;
  }
  return false;
}

function appendAccessLog_(userId, action, chatId, details) {
  getSheet_(SHEETS.ACCESS_LOG).appendRow([
    new Date(), String(userId || ''), action || '', String(chatId || ''), details || ''
  ]);
}

function appendLog_(event, userId, referenceId, details) {
  getSheet_(SHEETS.LOGS).appendRow([
    new Date(), event || '', String(userId || ''), String(referenceId || ''), details || ''
  ]);
}

function logEvent_(event, userId, referenceId, details) {
  try {
    appendLog_(event, userId, referenceId, details);
  } catch (ignore) {}
}

function logError_(event, referenceId, err) {
  try {
    appendLog_(
      event,
      '',
      referenceId || '',
      err && err.stack ? String(err.stack) : String(err)
    );
  } catch (ignore) {}
}

function isProcessedUpdate_(updateId) {
  const sheet = getSheet_(SHEETS.PROCESSED_UPDATES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const start = Math.max(2, lastRow - 5000 + 1);
  const values = sheet.getRange(start, 1, lastRow - start + 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(updateId)) return true;
  }
  return false;
}

function markProcessedUpdate_(update) {
  getSheet_(SHEETS.PROCESSED_UPDATES).appendRow([
    String(update.update_id),
    new Date()
  ]);
}

// ============================================================
// TELEGRAM API
// ============================================================

function telegramApi_(method, payload) {
  const token = getRequiredConfig_('TELEGRAM_BOT_TOKEN');
  const url = 'https://api.telegram.org/bot' + token + '/' + method;

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true
  });

  const body = response.getContentText();
  let result;

  try {
    result = JSON.parse(body);
  } catch (err) {
    throw new Error('Telegram API returned invalid JSON for ' + method + ': ' + body);
  }

  if (!result.ok) {
    throw new Error('Telegram API ' + method + ': ' + body);
  }

  return result.result;
}

function sendMessage_(chatId, text, replyMarkup) {
  const payload = { chat_id: chatId, text: text };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return telegramApi_('sendMessage', payload);
}

function answerCallbackQuery_(callbackQueryId, text) {
  return telegramApi_('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || ''
  });
}

function answerPreCheckoutQuery_(queryId, ok, errorMessage) {
  const payload = { pre_checkout_query_id: queryId, ok: !!ok };
  if (!ok && errorMessage) payload.error_message = errorMessage;
  return telegramApi_('answerPreCheckoutQuery', payload);
}

function createStarsInvoice_(chatId, payload, price) {
  return telegramApi_('sendInvoice', {
    chat_id: chatId,
    title: 'สมาชิกกลุ่ม — 30 วัน',
    description: 'สิทธิ์สมาชิกกลุ่มเป็นเวลา 30 วัน',
    payload: payload,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: 'สมาชิก 30 วัน', amount: price }],
    // Telegram Stars recurring subscription: 30 days.
    subscription_period: 2592000
  });
}

function approveJoinRequest_(chatId, userId) {
  return telegramApi_('approveChatJoinRequest', {
    chat_id: chatId,
    user_id: userId
  });
}

function declineJoinRequest_(chatId, userId) {
  return telegramApi_('declineChatJoinRequest', {
    chat_id: chatId,
    user_id: userId
  });
}

function createJoinRequestInviteLink_(chatId, name, expireDate) {
  return telegramApi_('createChatInviteLink', {
    chat_id: chatId,
    name: name,
    expire_date: expireDate,
    creates_join_request: true
  });
}

function banMember_(chatId, userId) {
  return telegramApi_('banChatMember', {
    chat_id: chatId,
    user_id: userId,
    revoke_messages: false
  });
}

function unbanMember_(chatId, userId) {
  return telegramApi_('unbanChatMember', {
    chat_id: chatId,
    user_id: userId,
    only_if_banned: true
  });
}

function getBotInfo_() {
  return telegramApi_('getMe', {});
}

function getChatInfo_(chatId) {
  return telegramApi_('getChat', { chat_id: chatId });
}

// ============================================================
// USER UI / COMMANDS
// ============================================================

function homeKeyboard_() {
  return {
    inline_keyboard: [
      [{ text: '⭐ สมัครสมาชิก', callback_data: 'subscribe' }],
      [{ text: '👤 ดูสถานะสมาชิก', callback_data: 'status' }],
      [{ text: '🔐 เข้ากลุ่มสมาชิก', callback_data: 'group' }],
      [{ text: 'ℹ️ รายละเอียด', callback_data: 'info' }],
      [{ text: '❓ วิธีใช้งาน', callback_data: 'help' }]
    ]
  };
}

function handleMessage_(message) {
  const text = String(message.text || '').trim();
  const user = message.from;
  if (!user) return;

  if (text === '/start' || text.indexOf('/start ') === 0) {
    sendHome_(user.id);
    return;
  }

  if (text === '/subscribe' || text === '/buy') {
    sendSubscribe_(user);
    return;
  }

  if (text === '/status') {
    sendStatus_(user.id);
    return;
  }

  if (text === '/group' || text === '/access') {
    sendGroupAccess_(user.id);
    return;
  }

  if (text === '/help') {
    sendHelp_(user.id);
    return;
  }

  if (text === '/paysupport') {
    sendPaymentSupport_(user.id);
    return;
  }

  if (text === '/admin') {
    if (isAdmin_(user.id)) sendAdminStatus_(user.id);
    else sendMessage_(user.id, 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น');
    return;
  }
}

function handleCallbackQuery_(query) {
  const user = query.from;
  const data = String(query.data || '');

  try {
    if (data === 'subscribe') {
      answerCallbackQuery_(query.id, 'กำลังสร้างรายการชำระเงิน');
      sendSubscribe_(user);
    } else if (data === 'status') {
      answerCallbackQuery_(query.id);
      sendStatus_(user.id);
    } else if (data === 'group') {
      answerCallbackQuery_(query.id);
      sendGroupAccess_(user.id);
    } else if (data === 'info') {
      answerCallbackQuery_(query.id);
      sendInfo_(user.id);
    } else if (data === 'help') {
      answerCallbackQuery_(query.id);
      sendHelp_(user.id);
    } else {
      answerCallbackQuery_(query.id);
    }
  } catch (err) {
    logError_('CALLBACK_ERROR', String(query.id), err);
    try {
      answerCallbackQuery_(query.id, 'เกิดข้อผิดพลาด');
    } catch (ignore) {}
  }
}

function sendHome_(chatId) {
  sendMessage_(
    chatId,
    '⭐ สมาชิกกลุ่ม\n\nเลือกเมนูที่ต้องการได้เลย',
    homeKeyboard_()
  );
}

function sendInfo_(chatId) {
  const price = getMonthlyPriceStars_();
  sendMessage_(
    chatId,
    'ℹ️ รายละเอียดสมาชิก\n\n' +
    '• ระยะเวลา: ' + getMembershipDays_() + ' วัน\n' +
    '• ราคา: ' + price + ' Stars\n' +
    '• ชำระผ่าน Telegram Stars\n' +
    '• หลังชำระสำเร็จ ระบบจะตรวจสอบและเปิดสิทธิ์สมาชิก\n\n' +
    'หากเป็นการสมัครแบบต่ออายุอัตโนมัติ ระบบจะได้รับสถานะจาก Telegram'
  );
}

function sendHelp_(chatId) {
  sendMessage_(
    chatId,
    '❓ วิธีใช้งาน\n\n' +
    '1. กด ⭐ สมัครสมาชิก\n' +
    '2. ชำระด้วย Telegram Stars\n' +
    '3. รอระบบยืนยันการชำระเงิน\n' +
    '4. กด 🔐 เข้ากลุ่มสมาชิก\n' +
    '5. ส่งคำขอเข้ากลุ่มผ่านลิงก์ที่ระบบสร้างให้\n\n' +
    'คำสั่ง: /start /subscribe /status /group /help /paysupport'
  );
}

function sendPaymentSupport_(chatId) {
  sendMessage_(
    chatId,
    '💳 Payment Support\n\n' +
    'หากชำระเงินแล้วแต่สมาชิกยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลพร้อมข้อมูลการชำระเงินจาก Telegram'
  );
}

function sendSubscribe_(user) {
  const price = getMonthlyPriceStars_();

  if (!price || price <= 0) {
    sendMessage_(user.id, 'ระบบยังไม่ได้ตั้งราคา MONTHLY_PRICE_STARS');
    return;
  }

  const existing = findMember_(user.id);
  if (existing && existing.status === 'ACTIVE' && existing.expires_at &&
      new Date(existing.expires_at).getTime() > Date.now()) {
    sendMessage_(
      user.id,
      'คุณมีสมาชิกที่ใช้งานอยู่\nหมดอายุ: ' + formatDate_(existing.expires_at) +
      '\n\nหากต้องการต่ออายุ สามารถชำระรายการใหม่ได้'
    );
  }

  const payload = buildInvoicePayload_(user.id);
  createStarsInvoice_(user.id, payload, price);
  appendLog_('INVOICE_CREATED', user.id, payload, 'Stars invoice created.');
}

function sendStatus_(userId) {
  const member = findMember_(userId);

  if (!member) {
    sendMessage_(
      userId,
      '👤 สถานะสมาชิก\n\nยังไม่มีสมาชิกที่เปิดใช้งาน\nกด ⭐ สมัครสมาชิก เพื่อเริ่มต้น',
      { inline_keyboard: [[{ text: '⭐ สมัครสมาชิก', callback_data: 'subscribe' }]] }
    );
    return;
  }

  const now = Date.now();
  const expires = member.expires_at ? new Date(member.expires_at).getTime() : 0;
  let status = member.status;

  if (status === 'ACTIVE' && expires <= now) status = 'EXPIRED';

  sendMessage_(
    userId,
    '👤 สถานะสมาชิก\n\n' +
    'สถานะ: ' + status + '\n' +
    'แพ็กเกจ: ' + member.plan + '\n' +
    'เริ่ม: ' + formatDate_(member.started_at) + '\n' +
    'หมดอายุ: ' + formatDate_(member.expires_at),
    status === 'ACTIVE'
      ? { inline_keyboard: [[{ text: '🔐 เข้ากลุ่มสมาชิก', callback_data: 'group' }]] }
      : { inline_keyboard: [[{ text: '⭐ สมัคร/ต่ออายุ', callback_data: 'subscribe' }]] }
  );
}

function sendGroupAccess_(userId) {
  if (!isMemberActive_(userId)) {
    sendMessage_(
      userId,
      '🔒 ยังไม่มีสิทธิ์เข้ากลุ่มที่ใช้งานอยู่\n\nกรุณาสมัครสมาชิกหรือชำระต่ออายุก่อน',
      { inline_keyboard: [[{ text: '⭐ สมัครสมาชิก', callback_data: 'subscribe' }]] }
    );
    return;
  }

  const expire = Math.floor(Date.now() / 1000) + 3600;
  const link = createJoinRequestInviteLink_(
    getGroupChatId_(),
    'member-' + userId,
    expire
  );

  appendAccessLog_(userId, 'INVITE_CREATED', getGroupChatId_(), link.invite_link);

  sendMessage_(
    userId,
    '🔐 ลิงก์เข้ากลุ่มพร้อมแล้ว\n\n' +
    'ลิงก์นี้ใช้สำหรับส่งคำขอเข้ากลุ่มและมีอายุประมาณ 1 ชั่วโมง\n' +
    'เมื่อส่งคำขอแล้ว ระบบจะตรวจสอบสมาชิกและอนุมัติให้อัตโนมัติ\n\n' +
    link.invite_link
  );
}

// ============================================================
// PAYMENT
// ============================================================

function buildInvoicePayload_(userId) {
  return 'membership_30d:' + String(userId) + ':' +
    Utilities.getUuid().replace(/-/g, '');
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
    try {
      answerPreCheckoutQuery_(query.id, false, 'ไม่สามารถตรวจสอบรายการได้');
    } catch (ignore) {}
  }
}

function handleSuccessfulPayment_(message) {
  const payment = message.successful_payment;
  const user = message.from;

  if (!payment || !user) return;

  if (payment.currency !== 'XTR') {
    throw new Error('Unexpected payment currency: ' + payment.currency);
  }

  const expectedPrefix = 'membership_30d:' + String(user.id) + ':';
  if (String(payment.invoice_payload || '').indexOf(expectedPrefix) !== 0) {
    throw new Error('Invalid payment payload for user ' + user.id);
  }

  const chargeId = String(payment.telegram_payment_charge_id || '');
  if (!chargeId) throw new Error('Missing telegram_payment_charge_id');

  if (paymentAlreadyRecorded_(chargeId)) return;

  const paymentId = 'PAY-' + Utilities.getUuid();
  const type = payment.is_recurring ? 'RENEWAL' : 'NEW';

  appendPayment_(paymentId, user.id, payment, type);
  activateMembership_(user, paymentId, payment);

  appendLog_(
    'MEMBERSHIP_ACTIVATED',
    user.id,
    paymentId,
    'Membership activated after successful Stars payment.'
  );

  const member = findMember_(user.id);

  sendMessage_(
    user.id,
    '🎉 ชำระเงินสำเร็จ\n\n' +
    'สมาชิกของคุณเปิดใช้งานแล้ว\n' +
    'หมดอายุ: ' + formatDate_(member.expires_at) +
    '\n\nกด 🔐 เข้ากลุ่มสมาชิก เพื่อขอเข้ากลุ่ม'
  );
}

function activateMembership_(user, paymentId, payment) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const existing = findMember_(user.id);
    const now = new Date();

    let start = now;

    if (existing && existing.expires_at) {
      const oldExpiry = new Date(existing.expires_at);
      if (oldExpiry.getTime() > now.getTime()) {
        start = oldExpiry;
      }
    }

    let expires;

    if (payment.subscription_expiration_date) {
      expires = new Date(Number(payment.subscription_expiration_date) * 1000);
    } else {
      expires = new Date(
        start.getTime() + getMembershipDays_() * 86400000
      );
    }

    upsertMember_(
      user,
      'ACTIVE',
      start,
      expires,
      paymentId,
      !!payment.is_recurring
    );
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// GROUP ACCESS
// ============================================================

function handleChatJoinRequest_(request) {
  const groupId = String(request.chat.id);
  const userId = String(request.from.id);

  if (groupId !== String(getGroupChatId_())) {
    declineJoinRequest_(request.chat.id, request.from.id);
    appendAccessLog_(userId, 'DECLINED_WRONG_GROUP', groupId, '');
    return;
  }

  if (isMemberActive_(userId)) {
    approveJoinRequest_(request.chat.id, request.from.id);
    appendAccessLog_(userId, 'JOIN_APPROVED', groupId, 'Active membership.');
    appendLog_('MEMBER_JOIN_APPROVED', userId, groupId, 'Join request approved.');
    sendMessage_(userId, '✅ อนุมัติเข้ากลุ่มเรียบร้อยแล้ว');
  } else {
    declineJoinRequest_(request.chat.id, request.from.id);
    appendAccessLog_(userId, 'JOIN_DECLINED', groupId, 'No active membership.');
    appendLog_('MEMBER_JOIN_DECLINED', userId, groupId, 'No active membership.');
    sendMessage_(
      userId,
      '❌ ไม่สามารถอนุมัติเข้ากลุ่มได้ เนื่องจากสมาชิกของคุณยังไม่ Active'
    );
  }
}

function handleChatMember_(update) {
  const chatId = update.chat && update.chat.id;
  const newMember = update.new_chat_member;
  const oldMember = update.old_chat_member;

  if (!newMember || !newMember.user) return;

  const userId = newMember.user.id;
  const newStatus = String(newMember.status || '');
  const oldStatus = oldMember ? String(oldMember.status || '') : '';

  appendAccessLog_(
    userId,
    'CHAT_MEMBER',
    chatId,
    oldStatus + ' -> ' + newStatus
  );

  if (newStatus === 'member' || newStatus === 'administrator') {
    appendLog_('MEMBER_JOINED', userId, String(chatId), newStatus);
  }

  if (newStatus === 'left' || newStatus === 'kicked') {
    appendLog_('MEMBER_LEFT', userId, String(chatId), newStatus);
  }
}

function removeMemberFromGroup_(userId) {
  const groupId = getGroupChatId_();

  try {
    banMember_(groupId, userId);
    Utilities.sleep(300);
    unbanMember_(groupId, userId);

    appendAccessLog_(userId, 'REMOVED', groupId, 'Expired membership');
    appendLog_('MEMBER_REMOVED', userId, groupId, 'Expired membership');
    return true;
  } catch (err) {
    logError_('REMOVE_MEMBER_ERROR', String(userId), err);
    return false;
  }
}

// ============================================================
// SUBSCRIPTION UPDATE
// ============================================================

function handleSubscriptionUpdate_(subscription) {
  try {
    const userId =
      subscription.user_id ||
      (subscription.from && subscription.from.id) ||
      '';

    appendLog_(
      'SUBSCRIPTION_UPDATE',
      userId,
      '',
      JSON.stringify(subscription)
    );
  } catch (err) {
    logError_('SUBSCRIPTION_UPDATE_ERROR', '', err);
  }
}

// ============================================================
// EXPIRATION / WORKER
// ============================================================

function runWorker() {
  const sheet = getSheet_(SHEETS.MEMBERS);
  const values = sheet.getDataRange().getValues();
  const now = Date.now();
  const reminderWindow = 24 * 60 * 60 * 1000;

  for (let i = 1; i < values.length; i++) {
    const userId = String(values[i][0] || '');
    const status = String(values[i][4] || '');
    const expiresAt = values[i][6];

    if (!userId || !expiresAt) continue;

    const expiry = new Date(expiresAt).getTime();
    if (!isFinite(expiry)) continue;

    if (status === 'ACTIVE' && expiry <= now) {
      sheet.getRange(i + 1, 5).setValue('EXPIRED');
      sheet.getRange(i + 1, 11).setValue(new Date());

      appendLog_('MEMBERSHIP_EXPIRED', userId, '', 'Membership expired.');

      removeMemberFromGroup_(userId);

      try {
        sendMessage_(
          userId,
          '⏰ สมาชิกของคุณหมดอายุแล้ว\n\nกด ⭐ สมัครสมาชิก เพื่อเปิดใช้งานอีกครั้ง'
        );
      } catch (ignore) {}
      continue;
    }

    if (status === 'ACTIVE' && expiry > now && expiry - now <= reminderWindow) {
      const marker = 'REMINDER_' + Utilities.formatDate(
        new Date(),
        getTimezone_(),
        'yyyy-MM-dd'
      );

      if (!wasReminderLogged_(userId, marker)) {
        appendLog_(
          'EXPIRING_SOON',
          userId,
          marker,
          'Membership expires within 24 hours.'
        );

        try {
          sendMessage_(
            userId,
            '⚠️ สมาชิกของคุณกำลังจะหมดอายุ\n\n' +
            'หมดอายุ: ' + formatDate_(expiresAt) +
            '\n\nกด ⭐ สมัคร/ต่ออายุ เพื่อใช้งานต่อ'
          );
        } catch (ignore) {}
      }
    }
  }
}

function wasReminderLogged_(userId, marker) {
  const sheet = getSheet_(SHEETS.LOGS);
  const values = sheet.getDataRange().getValues();

  for (let i = Math.max(1, values.length - 2000); i < values.length; i++) {
    if (
      String(values[i][1]) === 'EXPIRING_SOON' &&
      String(values[i][2]) === String(userId) &&
      String(values[i][3]) === String(marker)
    ) return true;
  }
  return false;
}

function createWorkerTrigger() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runWorker') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('runWorker')
    .timeBased()
    .everyHours(1)
    .create();

  return 'Hourly runWorker trigger created.';
}

// ============================================================
// WEBHOOK MANAGEMENT
// ============================================================

function setWebhook() {
  const webAppUrl = getRequiredConfig_('WEB_APP_URL');
  const secret = getRequiredConfig_('TELEGRAM_WEBHOOK_SECRET');

  const url = webAppUrl + '?secret=' + encodeURIComponent(secret);

  const result = telegramApi_('setWebhook', {
    url: url,
    secret_token: secret,
    allowed_updates: [
      'message',
      'callback_query',
      'pre_checkout_query',
      'chat_join_request',
      'chat_member',
      'subscription'
    ]
  });

  appendLog_('WEBHOOK_SET', '', '', JSON.stringify(result));
  return JSON.stringify(result);
}

function deleteWebhook() {
  const result = telegramApi_('deleteWebhook', {
    drop_pending_updates: false
  });

  appendLog_('WEBHOOK_DELETED', '', '', JSON.stringify(result));
  return JSON.stringify(result);
}

function getWebhookInfo() {
  return telegramApi_('getWebhookInfo', {});
}

// ============================================================
// ADMIN / DIAGNOSTICS
// ============================================================

function sendAdminStatus_(chatId) {
  const bot = getBotInfo_();
  const webhook = getWebhookInfo();

  sendMessage_(
    chatId,
    '🔧 Admin Status\n\n' +
    'Bot: @' + (bot.username || '-') + '\n' +
    'Webhook URL: ' + (webhook.url || '-') + '\n' +
    'Pending updates: ' + (webhook.pending_update_count || 0) + '\n' +
    'Last error: ' + (webhook.last_error_message || '-')
  );
}

function testTelegramConnection() {
  const bot = getBotInfo_();
  return JSON.stringify({
    ok: true,
    id: bot.id,
    username: bot.username,
    name: bot.first_name
  });
}

function testGroupConnection() {
  const chat = getChatInfo_(getGroupChatId_());
  return JSON.stringify({
    ok: true,
    id: chat.id,
    type: chat.type,
    title: chat.title || ''
  });
}

function getMyTelegramIdForTest() {
  // Use this only if called through a webhook-enabled bot flow is not possible.
  // A safer production path is to use /start and read message.from.id in logs.
  return 'Send /start to the bot; the user ID is stored in the MEMBERS sheet after payment.';
}

// ============================================================
// DATE / UTILITIES
// ============================================================

function formatDate_(date) {
  if (!date) return '-';
  try {
    return Utilities.formatDate(
      new Date(date),
      getTimezone_(),
      'dd/MM/yyyy HH:mm'
    );
  } catch (err) {
    return String(date);
  }
}
