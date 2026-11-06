/** Monotonic revision timestamp: two saves within one millisecond must not share a revision. */
export function nextProjectRevision(previous:string|null|undefined=null,now=Date.now()):string {
  const last=previous===null||previous===undefined?Number.NEGATIVE_INFINITY:Date.parse(previous);
  if(!Number.isFinite(now)||!Number.isInteger(now)) throw new Error('Ungültiger Zeitstempel.');
  const next=Math.max(now,Number.isFinite(last)?last+1:now);
  if(!Number.isFinite(next)||next>8_640_000_000_000_000) throw new Error('Projektversion außerhalb des gültigen Zeitbereichs.');
  return new Date(next).toISOString();
}
