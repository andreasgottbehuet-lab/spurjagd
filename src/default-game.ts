import type {GameConfig,Location} from './generator.ts';

export const DEFAULT_LOCATIONS:ReadonlyArray<Readonly<Location>>=[
 {id:'loc-1',name:'Spielplatz',description:'An diesem Ort gibt es Schaukeln, eine Rutsche und ein Klettergerüst.'},
 {id:'loc-2',name:'Wiese',description:'Auf dieser offenen Fläche wachsen Gräser und Blumen.'},
 {id:'loc-3',name:'Feuerwehrplatz',description:'Neben der Feuerwache stehen rote Einsatzfahrzeuge und ein großes Tor.'},
 {id:'loc-4',name:'Sportplatz',description:'Sportfläche mit Fußballtoren'}
];

/** Fresh defaults must never inherit participant counts, addresses or answers from an older project. */
export function createDefaultGameConfig():GameConfig {
 return {
  players:12,groupSize:3,durationMinutes:60,age:'8–10',goal:'locks',
  locations:DEFAULT_LOCATIONS.map(location=>({...location})),
  puzzleMinutes:10,walkingMinutes:5,startFinishMinutes:10,
  startMode:'distributed',routeMode:'same',finishMode:'meeting',
  meetingPoint:'Treffpunkt',startPoint:'Treffpunkt',
  stationCodes:{},teamProfiles:{},routeClueModes:{'loc-1':'description','loc-2':'description','loc-3':'description','loc-4':'description'},routeClueTexts:{}
 };
}
