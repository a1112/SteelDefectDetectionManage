// Lossless RGB output for Apple AppIcon inputs, compositing existing alpha on white.
// Uses only Node built-ins. This does not edit the project source image.
import { inflateSync, deflateSync } from 'node:zlib';
function crc(bytes) { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function chunk(type, bytes) { const t = Buffer.from(type), out = Buffer.alloc(12 + bytes.length); out.writeUInt32BE(bytes.length); t.copy(out, 4); bytes.copy(out, 8); out.writeUInt32BE(crc(Buffer.concat([t, bytes])), 8 + bytes.length); return out; }
function paeth(a,b,c) { const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c); return pa<=pb && pa<=pc ? a : pb<=pc ? b : c; }
export function opaquePng(bytes) {
  const width=bytes.readUInt32BE(16), height=bytes.readUInt32BE(20), type=bytes[25], channels=type===6?4:3;
  if (width > 1024 || height > 1024 || bytes[24]!==8 || ![2,6].includes(type) || bytes[26]!==0 || bytes[27]!==0 || bytes[28]!==0) throw new Error('AppIcon conversion supports non-interlaced 8-bit RGB/RGBA PNG only');
  const ids=[];
  for (let pos=8; pos+12<=bytes.length;) { const length=bytes.readUInt32BE(pos), name=bytes.toString('ascii',pos+4,pos+8), data=bytes.subarray(pos+8,pos+8+length); if(pos+length+12>bytes.length || crc(bytes.subarray(pos+4,pos+8+length))!==bytes.readUInt32BE(pos+8+length)) throw new Error('Invalid PNG chunk/CRC'); if(name==='IDAT')ids.push(data); if(name==='tRNS')throw new Error('RGB transparency chunk requires explicit conversion'); pos+=length+12; }
  if (type===2) return bytes;
  const stride=width*channels, raw=inflateSync(Buffer.concat(ids),{maxOutputLength:(stride+1)*height});
  if(raw.length!==(stride+1)*height)throw new Error('Invalid PNG pixel data');
  const output=Buffer.alloc((width*3+1)*height), pixels=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++) { const filter=raw[y*(stride+1)]; if(filter>4)throw new Error('Invalid PNG filter'); for(let x=0;x<stride;x++){ const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y && x>=channels?pixels[(y-1)*stride+x-channels]:0; const predictor=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]; pixels[y*stride+x]=(raw[y*(stride+1)+1+x]+predictor)&255; } for(let x=0;x<width;x++){ const i=y*stride+x*4, alpha=pixels[i+3];for(let c=0;c<3;c++)output[y*(width*3+1)+1+x*3+c]=Math.round((pixels[i+c]*alpha+255*(255-alpha))/255); } }
  const ihdr=Buffer.from(bytes.subarray(16,29)); ihdr[9]=2;
  return Buffer.concat([bytes.subarray(0,8),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(output,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
