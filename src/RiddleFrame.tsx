import { bildPfad, type Tinte } from './designs';

export function RiddleFrame({ designId, tinte }: { designId: string; tinte: Tinte }) {
  const pfad = bildPfad(designId, 'raetselrahmen', tinte);
  return pfad ? <div className="print-riddle-frame" aria-hidden="true" style={{ backgroundImage: `url(${pfad})` }} /> : null;
}
