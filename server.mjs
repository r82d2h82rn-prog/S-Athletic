import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'dist');
const server=http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep))throw Error('outside root');
 if((await stat(file)).isDirectory()){
 if(!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'});res.end();return;}
 file=path.join(file,'index.html');
 }
 const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','mjs':'text/javascript; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json','txt':'text/plain; charset=utf-8','md':'text/plain; charset=utf-8'})[file.split('.').pop()]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.NATHLETIC_PORT||4173),'0.0.0.0',()=>console.log('http://127.0.0.1:'+server.address().port));
