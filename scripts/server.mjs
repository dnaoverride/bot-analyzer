import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),port=Number(process.env.BOT_ANALYZER_PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=createServer(async(req,res)=>{try{if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}const url=new URL(req.url,'http://127.0.0.1');const path=decodeURIComponent(url.pathname);const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep)||!['.html','.js','.css'].includes(extname(file))){res.writeHead(404).end('Not found');return;}if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404).end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`BotAnalyzer: http://127.0.0.1:${port} (Ctrl+C za kraj)`));
