import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([length,type,data,checksum]);}
const glyph=['11110','10001','10001','11110','10100','10010','10001'];
const directory=new URL('../apps/extension/icons/',import.meta.url);await mkdir(directory,{recursive:true});
for(const size of [16,32,48,128]){
  const pixels=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const gx=Math.floor((x-size*.28)/(size*.09)),gy=Math.floor((y-size*.2)/(size*.085));
    const ink=glyph[gy]?.[gx]==='1',offset=y*(size*4+1)+1+x*4;
    pixels.set(ink?[237,243,247,255]:[65,111,224,255],offset);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(new URL(`recall-${size}.png`,directory),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
