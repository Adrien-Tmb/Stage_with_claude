// Export calendrier : fichier .ics (Google Agenda, Outlook, Apple) et liens "ajouter à Google Agenda".

const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

export function buildIcs(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StagePilot//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const ev of events) {
    const start = new Date(ev.date);
    const end = new Date(start.getTime() + (ev.durationMin ?? 60) * 60000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@stagepilot`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc(ev.title)}`,
      `DESCRIPTION:${esc(ev.notes ?? '')}`,
      ...(ev.location ? [`LOCATION:${esc(ev.location)}`] : []),
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(ev.title)}`, 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function googleCalendarUrl(ev) {
  const start = new Date(ev.date);
  const end = new Date(start.getTime() + (ev.durationMin ?? 60) * 60000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details: ev.notes ?? '',
    location: ev.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
