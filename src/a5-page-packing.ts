/** Measured A5 packing; never combines different teams or document sections. */
export interface A5Block { id:string; owner:string; section:string; heightMm:number; keepWithNext?:boolean }
export interface A5PackedPage { owner:string; section:string; blocks:A5Block[]; usedMm:number }
export function packA5Blocks(blocks:readonly A5Block[],usableHeightMm=192):A5PackedPage[] {
 if(!Number.isFinite(usableHeightMm)||usableHeightMm<=0) throw new Error('Ungültige A5-Druckhöhe');
 const pages:A5PackedPage[]=[];
 if(blocks.some(b=>!b.id.trim()||!b.owner.trim()||!b.section.trim()||!Number.isFinite(b.heightMm)||b.heightMm<=0||b.heightMm>usableHeightMm)) throw new Error('Ungültiger A5-Inhaltsblock');
 if(new Set(blocks.map(b=>b.id)).size!==blocks.length) throw new Error('Doppelte A5-Blockkennung');
 for(let i=0;i<blocks.length;i++){
  const block=blocks[i],next=blocks[i+1],last=pages[pages.length-1];
  const same=last&&last.owner===block.owner&&last.section===block.section;
  const pair=block.keepWithNext&&next&&next.owner===block.owner&&next.section===block.section?block.heightMm+next.heightMm:0;
  if(!last||!same||last.usedMm+block.heightMm>usableHeightMm||(pair>0&&pair<=usableHeightMm&&last.usedMm+pair>usableHeightMm)) pages.push({owner:block.owner,section:block.section,blocks:[],usedMm:0});
  const page=pages[pages.length-1];page.blocks.push(block);page.usedMm+=block.heightMm;
 }
 return pages;
}
export function underfilledA5Pages(pages:readonly A5PackedPage[],usableHeightMm=192):number[] {
 return pages.flatMap((page,i)=>page.usedMm<usableHeightMm/2?[i]:[]);
}
