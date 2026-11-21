import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import tutor from './api/tutor.js';
import health from './api/health.js';
try { process.loadEnvFile(); } catch {}
const root = resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.json':'application/json'};
export function createAppServer() {
return http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  let path;
  try { path = new URL(req.url,'http://localhost').pathname; }
  catch { res.statusCode=400;res.end('Invalid URL');return; }
  if(path === '/api/health') return health(req,res);
  if(path === '/api/tutor') {
    let size=0,body='';
    try { for await(const chunk of req) { size+=chunk.length;if(size>20000){res.statusCode=413;res.end(JSON.stringify({error:'請求太長。'}));return;}body+=chunk; } req.body=body;return await tutor(req,res); }
    catch {res.statusCode=400;res.end(JSON.stringify({error:'無效的請求。'}));return;}
  }
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.end();return;}
  try {
    const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));
    if(!file.startsWith(root+sep)){res.statusCode=403;res.end();return;}
    const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.statusCode=200;res.end(req.method==='HEAD'?undefined:data);
  }catch{res.statusCode=404;res.end('Not found');}
});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT)||3000;
  createAppServer().listen(port,'0.0.0.0',()=>console.log(`Sequence Studio listening on port ${port}`));
}
