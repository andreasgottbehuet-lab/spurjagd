/** Measured A5 packing; never combines different teams or document sections. */
export const A5_USABLE_HEIGHT_MM = 190;
export interface A5Block { id:string; owner:string; section:string; heightMm:number; keepWithNext?:boolean }
export interface A5PackedPage { owner:string; section:string; blocks:A5Block[]; usedMm:number }
export function packA5Blocks(blocks:readonly A5Block[],usableHeightMm=A5_USABLE_HEIGHT_MM,options:{compactOrganizer?:boolean;compactAll?:boolean}={}):A5PackedPage[] {
 if(!Number.isFinite(usableHeightMm)||usableHeightMm<=0) throw new Error('Ungültige A5-Druckhöhe');
 const pages:A5PackedPage[]=[];
 if(blocks.some(b=>!b.id.trim()||!b.owner.trim()||!b.section.trim()||!Number.isFinite(b.heightMm)||b.heightMm<=0||b.heightMm>usableHeightMm)) throw new Error('Ungültiger A5-Inhaltsblock');
 if(new Set(blocks.map(b=>b.id)).size!==blocks.length) throw new Error('Doppelte A5-Blockkennung');
 for(let i=0;i<blocks.length;i++){
  const block=blocks[i],last=pages[pages.length-1];
  const same=last&&last.owner===block.owner&&last.section===block.section;
  let pair=block.heightMm;
  if(block.keepWithNext){
   let j=i;
   while(j+1<blocks.length&&blocks[j].keepWithNext&&blocks[j+1].owner===block.owner&&blocks[j+1].section===block.section){
    j++;pair+=blocks[j].heightMm;
   }
  }
  if(pair>usableHeightMm) throw new Error('Zusammengehörige A5-Blöcke überschreiten die Druckhöhe');
  const eligibleForCompaction=options.compactAll!==false&&(block.owner!=='leitung'||(options.compactOrganizer!==false&&block.heightMm<usableHeightMm/2&&!!last&&last.blocks.length===1&&last.blocks.every(previous=>previous.heightMm<usableHeightMm/2)));
  if(!last||!same||!eligibleForCompaction||last.usedMm+block.heightMm>usableHeightMm||(pair>block.heightMm&&last.usedMm+pair>usableHeightMm)) pages.push({owner:block.owner,section:block.section,blocks:[],usedMm:0});
  const page=pages[pages.length-1];page.blocks.push(block);page.usedMm+=block.heightMm;
 }
 return pages;
}
export function underfilledA5Pages(pages:readonly A5PackedPage[],usableHeightMm=A5_USABLE_HEIGHT_MM):number[] {
 return pages.flatMap((page,i)=>page.usedMm<usableHeightMm/2?[i]:[]);
}

/** Browser measurement is in CSS pixels; physical A5 content height is 190 mm with 10 mm margins. */
export interface A5MeasuredSheet { id:string; owner:string; section:string; heightPx:number }
export function measureA5Sheets(sheets:readonly A5MeasuredSheet[],cssPxPerMm=96/25.4):A5Block[] {
 if(!Number.isFinite(cssPxPerMm)||cssPxPerMm<=0)throw new Error('Ungültiger CSS-Maßstab');
 return sheets.map(sheet=>{
  if(!Number.isFinite(sheet.heightPx)||sheet.heightPx<=0)throw new Error('Ungültige gemessene A5-Höhe');
  return {id:sheet.id,owner:sheet.owner,section:sheet.section,heightMm:sheet.heightPx/cssPxPerMm};
 });
}
/** A short page is a candidate for compaction only when a following block has the same owner/section. */
export function compactableUnderfilledPages(pages:readonly A5PackedPage[],usableHeightMm=A5_USABLE_HEIGHT_MM):number[] {
 return underfilledA5Pages(pages,usableHeightMm).filter(i=>{
  const current=pages[i],next=pages[i+1];
  return !!next&&current.owner===next.owner&&current.section===next.section&&current.usedMm+next.blocks[0].heightMm<=usableHeightMm;
 });
}

/** Audit page occupancy independently from the packing algorithm. */
export function auditA5PackedPages(pages:readonly A5PackedPage[],usableHeightMm=A5_USABLE_HEIGHT_MM):string[] {
 const errors:string[]=[];
 if(!Number.isFinite(usableHeightMm)||usableHeightMm<=0)return ['Ungültige A5-Druckhöhe'];
 const ids=new Set<string>();
 for(const [index,page] of pages.entries()){
  if(!page.owner.trim()||!page.section.trim()||!page.blocks.length)errors.push('Leere oder unvollständige A5-Seite '+(index+1));
  let total=0;
  for(const block of page.blocks){
   if(ids.has(block.id))errors.push('Doppelter A5-Block '+block.id);
   ids.add(block.id);
   if(block.owner!==page.owner||block.section!==page.section)errors.push('Team- oder Abschnittsvermischung auf A5-Seite '+(index+1));
   if(!Number.isFinite(block.heightMm)||block.heightMm<=0)errors.push('Ungültige A5-Blockhöhe '+block.id);
   total+=block.heightMm;
  }
  if(!Number.isFinite(total)||total>usableHeightMm+0.001)errors.push('A5-Seite '+(index+1)+' überschreitet die Druckhöhe');
  if(Math.abs(total-page.usedMm)>0.001)errors.push('A5-Seitenhöhe stimmt nicht mit den Blöcken überein');
 }
 return errors;
}

/** Measures the rendered border box plus vertical margins; rejects unmeasurable sheets. */
export function measureA5Elements(elements:readonly HTMLElement[],cssPxPerMm=96/25.4):A5Block[] {
 const sheets=elements.map((element,index)=>{
  const style=getComputedStyle(element);
  const marginTop=parseFloat(style.marginTop),marginBottom=parseFloat(style.marginBottom);
  const rect=element.getBoundingClientRect();
  if(!Number.isFinite(marginTop)||!Number.isFinite(marginBottom)||marginTop<0||marginBottom<0)throw new Error('Ungültiger A5-Seitenabstand');
  return {id:'physical-'+index,owner:element.classList.contains('print-organizer-sheet')?'leitung':element.classList.contains('print-label-sheet')?'etiketten':(element.dataset.teamColor??'')+':'+(element.dataset.envelopeId??''),section:element.classList.contains('print-organizer-sheet')?'organizer':element.classList.contains('print-label-sheet')?'fixed-sheet-'+index:element.dataset.sheetKind??'labels',heightPx:Math.max(rect.height,element.scrollHeight)+marginTop+marginBottom};
 });
 return measureA5Sheets(sheets,cssPxPerMm);
}

/** Physical page inventory after measured packing, separate from the logical envelope manifest. */
export interface A5PhysicalManifest {
 totalSheets:number;
 organizerSheets:number;
 childSheets:number;
 labelSheets:number;
 envelopeSheets:Record<string,number>;
}
export function physicalA5Manifest(pages:readonly A5PackedPage[],elements:readonly HTMLElement[]):A5PhysicalManifest {
 const result:A5PhysicalManifest={totalSheets:pages.length,organizerSheets:0,childSheets:0,labelSheets:0,envelopeSheets:{}};
 const lookup=new Map(elements.map((element,index)=>['physical-'+index,element]));
 for(const page of pages){
  const sources=page.blocks.map(block=>lookup.get(block.id));
  if(sources.some(source=>!source))throw new Error('A5-Manifest: Inhaltsblock fehlt');
  const types=new Set(sources.map(source=>source!.classList.contains('print-organizer-sheet')?'organizer':source!.classList.contains('print-label-sheet')?'label':'child'));
  if(types.size!==1)throw new Error('A5-Manifest: Dokumenttypen vermischt');
  const type=[...types][0];
  if(type==='organizer')result.organizerSheets++;
  else if(type==='label')result.labelSheets++;
  else {
   result.childSheets++;
   const envelopeIds=new Set(sources.map(source=>source!.dataset.envelopeId??''));
   if(envelopeIds.size!==1||envelopeIds.has(''))throw new Error('A5-Manifest: Umschläge auf einer Kinderseite vermischt');
   const id=[...envelopeIds][0];
   result.envelopeSheets[id]=(result.envelopeSheets[id]??0)+1;
  }
 }
 return result;
}

/** Create a printable copy without changing React-owned source nodes.
 * Only complete sheets of the same owner and section may share an A5 page.
 * The caller must remove the returned copy after the print dialog closes.
 */
export function buildPackedA5PrintCopy(packet:HTMLElement,options:{compactOrganizer?:boolean;compactAll?:boolean}={}):{copy:HTMLElement;pageCount:number;manifest:A5PhysicalManifest} {
 const originals=Array.from(packet.querySelectorAll<HTMLElement>(':scope > .print-sheet'));
 if(!originals.length)throw new Error('Keine A5-Druckseiten vorhanden');
 const blocks=measureA5Elements(originals);
 // Reserve wrapper and separator space before the browser prints the copy.
 const packingBlocks=blocks.map(block=>({...block,heightMm:block.heightMm+(block.owner==='leitung'?3:2)}));
 const pages=packA5Blocks(packingBlocks,A5_USABLE_HEIGHT_MM+2,options);
 // A single original block must fit on its own page; the separator allowance
 // is only available between blocks and must not hide oversized originals.
 const oversizedOriginals=blocks.filter(block=>block.heightMm>A5_USABLE_HEIGHT_MM);
 if(oversizedOriginals.length)throw new Error('A5-Einzelblatt überschreitet 190 mm: '+oversizedOriginals.map(block=>block.id+' ('+block.heightMm.toFixed(1)+' mm)').join(', '));
 const problems=auditA5PackedPages(pages,A5_USABLE_HEIGHT_MM+2);
 if(problems.length)throw new Error(problems.join('; '));
 const manifest=physicalA5Manifest(pages,originals);
 const byId=new Map(blocks.map((block,index)=>[block.id,originals[index]]));
 const copy=packet.cloneNode(false) as HTMLElement;
 copy.classList.add('print-packet-packed');
 copy.removeAttribute('aria-label');
 copy.setAttribute('aria-label','A5-Druckausgabe');
 for(const page of pages){
  const first=byId.get(page.blocks[0].id);
  if(!first)throw new Error('A5-Druckblock fehlt');
  const sheet=first.cloneNode(false) as HTMLElement;
  // Preserve envelope and sheet-kind attributes: print CSS uses them for
  // compact task typography, and the browser audit uses them for ownership.
  if(page.blocks.some(block=>{
    const source=byId.get(block.id);
    return source?.dataset.envelopeId!==first.dataset.envelopeId ||
      source?.dataset.sheetKind!==first.dataset.sheetKind;
  }))throw new Error('A5-Seite enthält unterschiedliche Umschläge oder Blattarten');
  sheet.classList.add('print-packed-page');
  for(const block of page.blocks){
   const source=byId.get(block.id);
   if(!source)throw new Error('A5-Druckblock fehlt');
   const section=document.createElement('div');
   section.className='print-packed-content';
   for(const child of Array.from(source.children))section.appendChild(child.cloneNode(true));
   sheet.appendChild(section);
  }
  sheet.dataset.packedBlockCount=String(page.blocks.length);
  copy.appendChild(sheet);
 }
 return {copy,pageCount:pages.length,manifest};
}
