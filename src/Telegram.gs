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
  const result = JSON.parse(body);

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
  const payload = { pre_checkout_query_id: queryId, ok: ok };
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
