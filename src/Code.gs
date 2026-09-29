/**
 * Telegram Stars Membership Bot — MVP
 * Google Apps Script entry points and update router.
 */

function doPost(e) {
  try {
    if (!isValidWebhookRequest_(e)) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }

    const update = JSON.parse(e.postData.contents);
    processUpdate_(update);
    return jsonResponse_({ ok: true });
  } catch (err) {
    logError_('WEBHOOK_ERROR', '', err);
    return jsonResponse_({ ok: true });
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Telegram Stars Membership Bot is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function processUpdate_(update) {
  if (!update || !update.update_id) return;
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
  const received = headers['X-Telegram-Bot-Api-Secret-Token'] ||
                   headers['x-telegram-bot-api-secret-token'] || '';
  return received === expected;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
