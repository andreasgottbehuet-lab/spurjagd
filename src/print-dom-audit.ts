/** Verifies that the rendered A5 packet contains the number of logical pages promised by the manifest. */
export function auditRenderedPrintSheets(expected:number,actual:number):string[] {
 const issues:string[]=[];
 if(!Number.isSafeInteger(expected)||expected<1) issues.push('Die erwartete A5-Seitenzahl ist ungültig.');
 if(!Number.isSafeInteger(actual)||actual<0) issues.push('Die Anzahl gerenderter A5-Seiten ist ungültig.');
 if(issues.length===0 && actual!==expected) issues.push('Druckpaket unvollständig: '+actual+' von '+expected+' vorgesehenen A5-Blättern vorhanden.');
 return issues;
}

export interface RenderedSheetCounts {
 total:number;
 organizer:number;
 children:number;
 labels:number;
}
export interface ExpectedSheetCounts {
 minimumSheets:number;
 organizerSheets:number;
 taskSheets:number;
 labelSheets:number;
}
/** Also catches a missing child page offset by an extra organizer or label page. */
export function auditRenderedPrintCategories(expected:ExpectedSheetCounts,actual:RenderedSheetCounts):string[] {
 const issues=auditRenderedPrintSheets(expected.minimumSheets,actual.total);
 const checks:[string,number,number][]=[
  ['Spielleitungsblätter',expected.organizerSheets,actual.organizer],
  ['Kinderblätter',expected.taskSheets,actual.children],
  ['Etikettenblätter',expected.labelSheets,actual.labels]
 ];
 for(const [name,wanted,found] of checks){
  if(!Number.isSafeInteger(wanted)||wanted<0) issues.push(name+': ungültige erwartete A5-Blattzahl.');
  if(!Number.isSafeInteger(found)||found<0||found!==wanted) issues.push(name+': '+found+' von '+wanted+' vorgesehenen A5-Blättern vorhanden.');
 }
 if(Number.isSafeInteger(expected.minimumSheets)&&expected.organizerSheets+expected.taskSheets+expected.labelSheets!==expected.minimumSheets)
  issues.push('Druckmanifest: Blattkategorien stimmen nicht mit der Gesamtzahl überein.');
 if(actual.organizer+actual.children+actual.labels!==actual.total) issues.push('Druckpaket enthält nicht zugeordnete A5-Blätter.');
 return [...new Set(issues)];
}

export interface RenderedEnvelopeSheet {
 envelopeId:string;
 kind:string;
 routePage?:number;
}
export interface ExpectedEnvelope {
 id:string;
 sheetCount:number;
}
/** Checks actual child-page assignment, not only aggregate page counts. */
export function auditRenderedEnvelopes(expected:ExpectedEnvelope[],actual:RenderedEnvelopeSheet[]):string[] {
 const issues:string[]=[];
 const expectedIds=new Set(expected.map(envelope=>envelope.id));
 if(expectedIds.size!==expected.length) issues.push('Druckmanifest enthält doppelte Umschlagkennungen.');
 for(const envelope of expected){
  if(!envelope.id.trim()) issues.push('Druckmanifest enthält eine leere Umschlagkennung.');
  if(!Number.isSafeInteger(envelope.sheetCount)||envelope.sheetCount<3)
   issues.push('Umschlag '+(envelope.id||'(leer)')+': ungültige Anzahl Kinderblätter.');
 }
 for(const sheet of actual){
  if(!expectedIds.has(sheet.envelopeId)) issues.push('Druckblatt ohne gültige Umschlagzuordnung: '+(sheet.envelopeId||'(leer)'));
  if(!['task','answer','route'].includes(sheet.kind)) issues.push('Druckblatt mit ungültiger Blattart: '+(sheet.kind||'(leer)'));
 }
 for(const envelope of expected){
  if(!Number.isSafeInteger(envelope.sheetCount)||envelope.sheetCount<3) continue;
  const sheets=actual.filter(sheet=>sheet.envelopeId===envelope.id);
  const tasks=sheets.filter(sheet=>sheet.kind==='task').length;
  const answers=sheets.filter(sheet=>sheet.kind==='answer').length;
  const routes=sheets.filter(sheet=>sheet.kind==='route').length;
  if(tasks!==1||answers!==1||routes!==envelope.sheetCount-2){
   issues.push('Umschlag '+envelope.id+': '+tasks+' Aufgaben-, '+answers+' Antwort- und '+routes+' Wegrätselblätter statt 1/1/'+(envelope.sheetCount-2)+'.');
  }
 }
 for(const envelope of expected){
  if(!Number.isSafeInteger(envelope.sheetCount)||envelope.sheetCount<3) continue;
  const pages=actual.filter(sheet=>sheet.envelopeId===envelope.id&&sheet.kind==='route');
  pages.forEach((page,index)=>{
   if(page.routePage!==index+1) issues.push('Umschlag '+envelope.id+': Wegrätsel-Seitenfolge ist fehlerhaft.');
  });
 }
 // The packet must be packable in manifest order: task, answer, then route pages.
 const validCounts=expected.every(envelope=>Number.isSafeInteger(envelope.sheetCount)&&envelope.sheetCount>=3);
 if(!validCounts) return [...new Set(issues)];
 const expectedCount=expected.reduce((sum,envelope)=>sum+envelope.sheetCount,0);
 if(!Number.isSafeInteger(expectedCount)||expectedCount!==actual.length){
  issues.push('Kinderblätter sind nicht in Umschlag-Reihenfolge (Aufgabe, Antwort, Wegrätsel) angeordnet.');
  return [...new Set(issues)];
 }
 const expectedSequence=expected.flatMap(envelope=>[
  {envelopeId:envelope.id,kind:'task'},
  {envelopeId:envelope.id,kind:'answer'},
  ...Array.from({length:Math.max(0,envelope.sheetCount-2)},()=>({envelopeId:envelope.id,kind:'route'}))
 ]);
 if(expectedSequence.length!==actual.length || expectedSequence.some((sheet,index)=>
   actual[index]?.envelopeId!==sheet.envelopeId || actual[index]?.kind!==sheet.kind
 )) issues.push('Kinderblätter sind nicht in Umschlag-Reihenfolge (Aufgabe, Antwort, Wegrätsel) angeordnet.');
 return [...new Set(issues)];
}

/** Label order must match the envelope list so printed labels can be packed without guesswork. */
export function auditRenderedLabels(expected:ExpectedEnvelope[],actualIds:string[]):string[] {
 const expectedIds=expected.map(envelope=>envelope.id);
 const issues:string[]=[];
 if(expectedIds.some(id=>!id.trim())) issues.push('Druckmanifest enthält eine leere Umschlagkennung.');
 if(new Set(expectedIds).size!==expectedIds.length) issues.push('Druckmanifest enthält doppelte Umschlagkennungen.');
 if(expectedIds.length===actualIds.length && expectedIds.every((id,index)=>id===actualIds[index]) && issues.length===0) return [];
 issues.push('Stationsetiketten fehlen, sind doppelt oder entsprechen nicht der Umschlag-Reihenfolge.');
 const allowed=new Set(expectedIds);
 for(const id of actualIds) if(!allowed.has(id)) issues.push('Stationsetikett mit unbekanntem Umschlag: '+(id||'(leer)'));
 return [...new Set(issues)];
}

/** Detects content that extends beyond the A5 sheet's printable content box. */
export interface PrintSheetGeometry {
 id:string;
 contentWidth:number;
 contentHeight:number;
 scrollWidth:number;
 scrollHeight:number;
}
export function auditPrintOverflow(sheets:PrintSheetGeometry[],tolerance=2):string[] {
 const issues:string[]=[];
 if(!Number.isFinite(tolerance)||tolerance<0) return ['Ungültige Messtoleranz für A5-Blätter.'];
 if(sheets.length===0) issues.push('Keine A5-Blätter für die Geometrieprüfung vorhanden.');
 const ids=sheets.map(sheet=>sheet.id);
 if(new Set(ids).size!==ids.length) issues.push('A5-Geometrieprüfung enthält doppelte Blattkennungen.');
 for(const sheet of sheets){
  if(!sheet.id.trim()) issues.push('A5-Blatt ohne Kennung kann nicht zugeordnet werden.');
  if(![sheet.contentWidth,sheet.contentHeight,sheet.scrollWidth,sheet.scrollHeight].every(v=>Number.isFinite(v)&&v>0)){
   issues.push('A5-Blatt '+sheet.id+': Druckabmessungen konnten nicht geprüft werden.');
   continue;
  }
  if(sheet.scrollWidth>sheet.contentWidth+tolerance)
   issues.push('A5-Blatt '+sheet.id+': Inhalt ist zu breit und kann abgeschnitten werden.');
  if(sheet.scrollHeight>sheet.contentHeight+tolerance)
   issues.push('A5-Blatt '+sheet.id+': Inhalt überschreitet die vorgesehene Seitenhöhe.');
 }
 return issues;
}

/** Check content against the A5 portrait content area (148×210 mm, 10 mm margins).
 * Geometry must be collected with print styles active; screen measurements are not equivalent.
 */
export function auditA5PageBounds(sheets:PrintSheetGeometry[],pixelsPerMillimeter:number):string[] {
 if(!Number.isFinite(pixelsPerMillimeter)||pixelsPerMillimeter<=0)
  return ['A5-Druckskalierung konnte nicht bestimmt werden.'];
 const maxWidth=128*pixelsPerMillimeter;
 const maxHeight=190*pixelsPerMillimeter;
 const issues=auditPrintOverflow(sheets);
 for(const sheet of sheets){
  if(sheet.contentWidth>maxWidth+2 || sheet.scrollWidth>maxWidth+2)
   issues.push('A5-Blatt '+sheet.id+': Breite überschreitet den bedruckbaren Bereich (128 mm).');
  if(sheet.contentHeight>maxHeight+2 || sheet.scrollHeight>maxHeight+2)
   issues.push('A5-Blatt '+sheet.id+': Höhe überschreitet den bedruckbaren Bereich (190 mm).');
 }
 return [...new Set(issues)];
}
