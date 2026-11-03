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
  if(!Number.isSafeInteger(found)||found<0||found!==wanted) issues.push(name+': '+found+' von '+wanted+' vorgesehenen A5-Blättern vorhanden.');
 }
 if(actual.organizer+actual.children+actual.labels!==actual.total) issues.push('Druckpaket enthält nicht zugeordnete A5-Blätter.');
 return [...new Set(issues)];
}
