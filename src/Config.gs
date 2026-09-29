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
    .map(function (v) { return String(v).trim(); })
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
