export type DesignId = 'schlicht' | 'entdecker' | 'wald' | 'detektiv' | 'piraten' | 'weltraum' | 'weihnachten';
export type BildArt = 'cover' | 'urkunde' | 'raetselrahmen' | 'einladung' | `icon-${string}`;
export type Tinte = 'farbig' | 'schwarzweiss';

export const designs = [
  { id: 'schlicht', name: 'Schlicht', beschreibung: 'Einfaches Layout ohne Grafikdateien.' },
  { id: 'entdecker', name: 'Entdecker', beschreibung: 'Grafiken für kleine Entdecker.', praefix: '/grafik/entdecker/' },
  { id: 'wald', name: 'Wald und Natur', beschreibung: 'Grafiken rund um Wald und Natur.', praefix: '/grafik/wald/' },
  { id: 'detektiv', name: 'Detektiv', beschreibung: 'Grafiken für spannende Detektivabenteuer.', praefix: '/grafik/detektiv/' },
  { id: 'piraten', name: 'Piraten', beschreibung: 'Grafiken für aufregende Piratenabenteuer.', praefix: '/grafik/piraten/' },
  { id: 'weltraum', name: 'Weltraum', beschreibung: 'Grafiken fuer Abenteuer zwischen Sternen und Planeten.', praefix: '/grafik/weltraum/' },
  { id: 'weihnachten', name: 'Weihnachten', beschreibung: 'Grafiken fuer festliche Weihnachtsabenteuer.', praefix: '/grafik/weihnachten/' },
] as const;

export const STANDARD_ICONS = ['fahne', 'fernglas', 'fragezeichen', 'fussabdruecke', 'karte', 'kompass', 'laterne', 'lupe', 'rucksack', 'schatztruhe', 'schluessel', 'uhr'] as const;
const WEIHNACHTS_ICONS = ['stern', 'tannenbaum', 'geschenk', 'kerze', 'glocke', 'lebkuchen', 'zuckerstange', 'handschuh', 'stiefel', 'schneeflocke', 'kompass', 'lupe', 'schlitten', 'rentier', 'mistelzweig', 'adventskranz', 'tannenzapfen', 'muetze'] as const;
export function iconsFuer(designId: string): readonly string[] {
  return designId === 'weihnachten' ? WEIHNACHTS_ICONS : STANDARD_ICONS;
}

export type Design = typeof designs[number];

export function getDesign(id: string): Design {
  return designs.find(design => design.id === id) ?? designs[0];
}

export function bildPfad(designId: string, bildArt: BildArt, tinte: Tinte): string | null {
  const design = getDesign(designId);
  return design.id === 'schlicht' ? null : `${design.praefix}${bildArt}_${tinte}.webp`;
}
