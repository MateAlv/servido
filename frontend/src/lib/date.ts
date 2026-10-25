const BA_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's calendar date in Buenos Aires (`YYYY-MM-DD`), the timezone business rules use. */
export function todayInBuenosAires(): string {
  return BA_DATE_FORMAT.format(new Date())
}
