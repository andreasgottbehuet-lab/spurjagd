import { bildPfad, type Tinte } from './designs';
import { clampNote, formatInvitationDate } from './invitation';

export function InvitationCard({ title, date, time, place, note, designId, tinte, lang }: {
  title: string; date: string; time: string; place: string; note: string;
  designId: string; tinte: Tinte; lang: 'de' | 'en' | 'fr';
}) {
  const pfad = bildPfad(designId, 'einladung', tinte);
  return <article className={`invitation-card${pfad ? '' : ' invitation-card-plain'}`} data-sheet-kind="invitation" style={pfad ? { backgroundImage: `url(${pfad})` } : undefined}>
    <h2>{title}</h2><p>{formatInvitationDate(date, lang)}</p><p>{time}</p><p>{place}</p><p>{clampNote(note)}</p>
  </article>;
}
