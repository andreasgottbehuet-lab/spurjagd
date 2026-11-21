export const INVITATION_NOTE_MAX = 120;

export function invitationTitle(projectName: string, userTitle: string, touched: boolean): string {
  return touched ? userTitle : projectName;
}

export function clampNote(text: string): string {
  return text.slice(0, INVITATION_NOTE_MAX);
}

export function formatInvitationDate(iso: string, lang: 'de' | 'en' | 'fr'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return '';
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return '';
  const locale = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR' }[lang];
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
