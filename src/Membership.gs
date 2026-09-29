function getSpreadsheet_() {
  return SpreadsheetApp.openById(getRequiredConfig_('SPREADSHEET_ID'));
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function upsertMember_(user, status, startedAt, expiresAt, paymentId) {
  const sheet = getSheet_('MEMBERS');
  const values = sheet.getDataRange().getValues();

  let row = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(user.id)) {
      row = i + 1;
      break;
    }
  }

  const now = new Date();
  const data = [
    String(user.id),
    user.username || '',
    [user.first_name || '', user.last_name || ''].join(' ').trim(),
    'MONTHLY_30D',
    status,
    startedAt,
    expiresAt,
    false,
    paymentId || '',
    row === -1 ? now : values[row - 1][9],
    now
  ];

  if (row === -1) {
    sheet.appendRow(data);
  } else {
    sheet.getRange(row, 1, 1, data.length).setValues([data]);
  }
}

function findMember_(userId) {
  const sheet = getSheet_('MEMBERS');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(userId)) {
      return {
        row: i + 1,
        user_id: String(values[i][0]),
        status: values[i][4],
        started_at: values[i][5],
        expires_at: values[i][6],
        last_payment_id: values[i][8]
      };
    }
  }
  return null;
}

function isMemberActive_(userId) {
  const member = findMember_(userId);
  return !!member &&
    member.status === 'ACTIVE' &&
    member.expires_at &&
    new Date(member.expires_at).getTime() > Date.now();
}

function activateMembership_(user, paymentId, payment) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = findMember_(user.id);
    const now = new Date();
    let start = now;
    if (existing && existing.status === 'ACTIVE' && existing.expires_at) {
      start = new Date(existing.expires_at);
      if (start.getTime() < now.getTime()) start = now;
    }

    let expires = payment.subscription_expiration_date
      ? new Date(payment.subscription_expiration_date * 1000)
      : new Date(start.getTime() + getMembershipDays_() * 86400000);

    upsertMember_(user, 'ACTIVE', start, expires, paymentId);
  } finally {
    lock.releaseLock();
  }
}
