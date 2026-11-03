/** Verifies that the rendered A5 packet contains the number of logical pages promised by the manifest. */
export function auditRenderedPrintSheets(expected:number,actual:number):string[] {
 const issues:string[]=[];
 if(!Number.isSafeInteger(expected)||expected<1) issues.push('Die erwartete A5-Seitenzahl ist ungültig.');
 if(!Number.isSafeInteger(actual)||actual<0) issues.push('Die Anzahl gerenderter A5-Seiten ist ungültig.');
 if(issues.length===0 && actual!==expected) issues.push('Druckpaket unvollständig: '+actual+' von '+expected+' vorgesehenen A5-Blättern vorhanden.');
 return issues;
}
