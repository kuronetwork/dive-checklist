/* nofly.js — No-fly calculator pure functions */

/**
 * Compute the three recommended safe-to-fly timestamps.
 * @param {Date} lastDiveEnd
 * @returns {{ h12: Date, h18: Date, h24: Date }}
 */
function computeNoFlyTimes(lastDiveEnd) {
  const t = lastDiveEnd.getTime();
  return {
    h12: new Date(t + 12 * 3600000),
    h18: new Date(t + 18 * 3600000),
    h24: new Date(t + 24 * 3600000),
  };
}

/**
 * Returns the recommended minimum wait hours for a given dive type.
 * @param {'single_nodecomp'|'multi_day'|'decompression'} diveType
 * @returns {12|18|24}
 */
function getRecommendedHours(diveType) {
  if (diveType === 'single_nodecomp') return 12;
  if (diveType === 'decompression') return 24;
  return 18; // multi_day default
}

/**
 * Returns a human-readable countdown string from now to targetTime.
 * Returns '' if targetTime is in the past.
 * @param {Date} targetTime
 * @param {Date} now
 * @returns {string}
 */
function formatCountdown(targetTime, now) {
  const diff = targetTime.getTime() - now.getTime();
  if (diff <= 0) return '';
  const totalMinutes = Math.ceil(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `還需等待 ${hours} 小時 ${minutes} 分鐘`;
  if (hours > 0) return `還需等待 ${hours} 小時`;
  return `還需等待 ${minutes} 分鐘`;
}

/**
 * Returns true if the target time is still in the future.
 * @param {Date} targetTime
 * @param {Date} now
 * @returns {boolean}
 */
function isWaitRequired(targetTime, now) {
  return targetTime.getTime() > now.getTime();
}

/**
 * Format a Date to a locale datetime string for display.
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
