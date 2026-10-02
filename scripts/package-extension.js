import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';

const root=fileURLToPath(new URL('../apps/extension/',import.meta.url));
const output=fileURLToPath(new URL('../apps/web/public/downloads/recall-extension.zip',import.meta.url));
const allowed=['manifest.json','icons','src','popup.html','popup.css','setup.html','setup.css','account.css'];
const entries=[];
async function collect(relative){
  const location=path.join(root,relative);
  if(['icons','src'].includes(relative)||relative.endsWith('/')){
    for(const item of (await readdir(location,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
      if(item.isSymbolicLink())throw new Error('Extension packages cannot include symbolic links.');
      await collect(`${relative.replace(/\/$/,'')}/${item.name}${item.isDirectory()?'/':''}`);
    }
  }else entries.push({name:Buffer.from(relative),data:await readFile(location)});
}
for(const name of allowed)await collect(name);

// Standard ZIP records with portable forward-slash names. No platform archiver
// or execution-policy override is needed to create this development download.
function crc32(data){
  let checksum=0xffffffff;
  for(const byte of data){checksum^=byte;for(let bit=0;bit<8;bit++)checksum=(checksum>>>1)^((checksum&1)?0xedb88320:0);}
  return (checksum^0xffffffff)>>>0;
}
const files=[],directory=[];let offset=0;
for(const {name,data} of entries){
  const packed=deflateRawSync(data),checksum=crc32(data),local=Buffer.alloc(30),central=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);
  local.writeUInt32LE(checksum,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);
  central.writeUInt32LE(checksum,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  files.push(local,name,packed);directory.push(central,name);offset+=local.length+name.length+packed.length;
}
const index=Buffer.concat(directory),end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,Buffer.concat([...files,index,end]));
console.log(`Packaged ${entries.length} extension files: ${output}`);
