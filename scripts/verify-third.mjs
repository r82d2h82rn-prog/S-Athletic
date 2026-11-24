import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export async function verifyThird(){
 const root=new URL('../stages/third/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 for(const f of manifest.files){const bytes=await readFile(new URL('upstream/'+f.path,root)),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(actual!==f.gitBlob)throw Error('3rd snapshot changed: '+f.path);}
 const three=new URL('../vendor/three/',import.meta.url),expected={'three.module.min.js':'20d3c112761a519c7780a5ccc9f72a40937fa83b','three.core.min.js':'70c40977daa0f6e1e312c6b58e9bfe49cb5a87a4'};
 for(const [name,sha]of Object.entries(expected)){const bytes=await readFile(new URL(name,three)),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(actual!==sha)throw Error('Three.js vendor mismatch: '+name);}
 if(!(await readFile(new URL('LICENSE-three.txt',three),'utf8')).includes('MIT'))throw Error('Three.js license is missing');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const m=await verifyThird();console.log(`Verified ${m.files.length} unchanged original 3rd files + Three.js r180.`);}
