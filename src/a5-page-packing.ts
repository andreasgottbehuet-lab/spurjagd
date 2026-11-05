/** Measured A5 packing; never combines different teams or document sections. */
export const A5_USABLE_HEIGHT_MM = 190;
export interface A5Block { id:string; owner:string; section:string; heightMm:number; keepWithNext?:boolean }
export interface A5PackedPage { owner:string; section:string; blocks:A5Block[]; usedMm:number }
export function packA5Blocks(blocks:readonly A5Block[],usableHeightMm=A5_USABLE_HEIGHT_MM):A5PackedPage[] {
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
  if(!last||!same||last.usedMm+block.heightMm>usableHeightMm||(pair>block.heightMm&&last.usedMm+pair>usableHeightMm)) pages.push({owner:block.owner,section:block.section,blocks:[],usedMm:0});
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

/** Measures the rendered border box plus vertical margins; rejects unmeasurable sheets. */
export function measureA5Elements(elements:readonly HTMLElement[],cssPxPerMm=96/25.4):A5Block[] {
 const sheets=elements.map((element,index)=>{
  const style=getComputedStyle(element);
  const marginTop=parseFloat(style.marginTop),marginBottom=parseFloat(style.marginBottom);
  const rect=element.getBoundingClientRect();
  if(!Number.isFinite(marginTop)||!Number.isFinite(marginBottom)||marginTop<0||marginBottom<0)throw new Error('Ungültiger A5-Seitenabstand');
  return {id:'physical-'+index,owner:element.classList.contains('print-organizer-sheet')?'leitung':element.classList.contains('print-label-sheet')?'etiketten':element.dataset.teamColor??'',section:element.classList.contains('print-organizer-sheet')?'organizer':element.dataset.sheetKind??'labels',heightPx:rect.height+marginTop+marginBottom};
 });
 return measureA5Sheets(sheets,cssPxPerMm);
}
