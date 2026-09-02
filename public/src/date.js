export function formatMoodDate(dateValue, locale) {
  if (typeof dateValue !== 'string' || !dateValue) {
    return '';
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(dateValue + 'T12:00:00')
    : new Date(dateValue.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}
