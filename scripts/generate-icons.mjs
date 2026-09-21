import fs from 'node:fs';
import zlib from 'node:zlib';

const crc = data => {
  let value = 0xffffffff;
  for (const byte of data) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0); }
  const result = Buffer.alloc(4); result.writeUInt32BE((value ^ 0xffffffff) >>> 0); return result;
};
const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]), size = Buffer.alloc(4); size.writeUInt32BE(data.length); return Buffer.concat([size, body, crc(body)]); };
const lines = [[160,310,222,195],[222,195,286,310],[286,310,160,310],[160,310,240,228],[240,228,322,228],[322,228,355,310],[310,170,278,170],[310,170,322,228],[206,195,244,195]];
function color(x, y) {
  if (Math.hypot(x - 352, y - 137) < 28) return [255,210,119];
  if ([160,355].some(cx => Math.abs(Math.hypot(x - cx, y - 310) - 62) < 8)) return [255,255,255];
  for (const [ax,ay,bx,by] of lines) {
    const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    if (Math.hypot(x-ax-t*dx,y-ay-t*dy)<8) return [255,255,255];
  }
  return [8,127,140];
}
for (const size of [192,512]) {
  const rows = Buffer.alloc(size*(size*3+1));
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const samples=[[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([dx,dy])=>color((x+dx)/size*512,(y+dy)/size*512));
    for(let c=0;c<3;c++) rows[y*(size*3+1)+1+x*3+c]=Math.round(samples.reduce((sum,p)=>sum+p[c],0)/4);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
  fs.writeFileSync(`assets/icon-${size}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
}
