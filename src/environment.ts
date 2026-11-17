import type {Environment,Location} from './generator.ts';
import {DEFAULT_LOCATIONS} from './default-game.ts';

/** Example rooms for a hunt at home. Same IDs as the outdoor defaults, so codes and clue settings stay attached. */
const INDOOR_LOCATIONS_DE:ReadonlyArray<Readonly<Location>>=[
 {id:'loc-1',name:'Küche',description:'Hier stehen Kühlschrank, Herd und Esstisch.'},
 {id:'loc-2',name:'Wohnzimmer',description:'Hier gibt es ein Sofa, Kissen und einen Teppich.'},
 {id:'loc-3',name:'Flur',description:'Hier hängen Jacken und stehen die Schuhe.'},
 {id:'loc-4',name:'Kinderzimmer',description:'Hier stehen Bett, Spielsachen und Bücher.'}
];
const INDOOR_LOCATIONS_EN:ReadonlyArray<Readonly<Location>>=[
 {id:'loc-1',name:'Kitchen',description:'This room has a fridge, a cooker and a dining table.'},
 {id:'loc-2',name:'Living room',description:'This room has a sofa, cushions and a rug.'},
 {id:'loc-3',name:'Hallway',description:'Coats hang here and shoes are lined up.'},
 {id:'loc-4',name:'Kids\' room',description:'This room has a bed, toys and books.'}
];
export const OUTDOOR_WALKING_MINUTES=5;
export const INDOOR_WALKING_MINUTES=1;
export const MIXED_WALKING_MINUTES=3;

export function indoorLocations(en:boolean):Location[] {
 return (en?INDOOR_LOCATIONS_EN:INDOOR_LOCATIONS_DE).map(location=>({...location}));
}
const sameLocations=(a:ReadonlyArray<Location>,b:ReadonlyArray<Location>)=>a.length===b.length&&a.every((location,i)=>location.id===b[i].id&&location.name===b[i].name&&location.description===b[i].description);
/** True only for untouched example stations (outdoor defaults or indoor examples in either language). */
export function isPresetLocations(locations:ReadonlyArray<Location>):boolean {
 return [DEFAULT_LOCATIONS,INDOOR_LOCATIONS_DE,INDOOR_LOCATIONS_EN].some(preset=>sameLocations(locations,preset));
}
/**
 * Values after switching the environment. Stations edited by the user are never replaced.
 * indoor/outdoor: example stations and walking time only while the stations are untouched presets.
 * mixed: untouched example stations stay as they are, walking time 3 minutes.
 * Edited stations: nothing changes (neither stations nor walking time).
 */
export function applyEnvironmentPreset(environment:Environment,current:{locations:Location[];walkingMinutes:number},en:boolean):{locations:Location[];walkingMinutes:number} {
 if(environment==='mixed') return {locations:current.locations,walkingMinutes:MIXED_WALKING_MINUTES};
 if(!isPresetLocations(current.locations)) return current;
 if(environment==='indoor') return {locations:indoorLocations(en),walkingMinutes:INDOOR_WALKING_MINUTES};
 return {locations:DEFAULT_LOCATIONS.map(location=>({...location})),walkingMinutes:OUTDOOR_WALKING_MINUTES};
}

/** Existing organizer paragraph; for 'outdoor' it stays exactly this German text in every UI language. */
export const OUTDOOR_SITE_CHECK='Strecken, Straßenquerungen, Gewässer, Baustellen, Wetter, Zugänglichkeit und Aufsicht prüfen. Keine Aufgaben an gefährlichen oder unzugänglichen Orten platzieren. Den Kindern den nächsten Zielort nicht vor dem Rätsel verraten.';
/** Text for the "Vor Ort kontrollieren" paragraph of the organizer sheet. */
export function siteSafetyCheck(environment:Environment|undefined,en:boolean):string {
 if(!environment||environment==='outdoor') return OUTDOOR_SITE_CHECK;
 const outdoor=en?'Outdoors: check routes, road crossings, water, building sites, weather, access and supervision.':'Draußen: Strecken, Straßenquerungen, Gewässer, Baustellen, Wetter, Zugänglichkeit und Aufsicht prüfen.';
 const indoor=en?'Indoors: secure stairs and doors, lock away fragile and hot items, clearly name rooms that are off limits, arrange supervision and keep noise down out of consideration for neighbours.':'Im Haus: Treppen und Türen sichern, Zerbrechliches und Heißes wegschließen, verbotene Zimmer klar benennen, Aufsicht festlegen und auf Lautstärke und Nachbarn Rücksicht nehmen.';
 const rest=en?'Do not place tasks in dangerous or inaccessible places. Do not reveal the next destination to the children before they solve the clue.':'Keine Aufgaben an gefährlichen oder unzugänglichen Orten platzieren. Den Kindern den nächsten Zielort nicht vor dem Rätsel verraten.';
 return (environment==='mixed'?outdoor+' ':'')+indoor+' '+rest;
}
