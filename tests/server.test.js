import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAppServer } from '../server.js';

function request(port, path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
}

test('malformed request targets return 400 without taking the server offline', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  assert.equal(await request(port, '//%'), 400);
  assert.equal(await request(port, '/api/health'), 200);
});

test('Chinese questions survive a UTF-8 character split between HTTP chunks', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const oldFetch=global.fetch, oldKey=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='test-only-placeholder';
  t.after(() => {global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;});
  let received;
  global.fetch=async(_,options)=>{
    received=JSON.parse(options.body).contents.at(-1).parts[0].text;
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({reply:'看看新增的積木。'})}]}}]})};
  };
  const question='為甚麼平方數的差是奇數？';
  const body=Buffer.from(JSON.stringify({lesson:'square',messages:[{role:'user',text:question}]}));
  const split=body.indexOf(Buffer.from('為'))+1;
  const firstChunk=new Promise(resolve=>server.once('request',req=>req.once('data',resolve)));
  let req;
  const status=new Promise((resolve,reject)=>{
    req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/tutor',method:'POST',headers:{'Content-Type':'application/json'}},res=>{
      res.resume();res.on('end',()=>resolve(res.statusCode));
    });
    req.on('error',reject);
    req.write(body.subarray(0,split));
  });
  await firstChunk;
  req.end(body.subarray(split));
  assert.equal(await status,200);
  assert.equal(received,question);
});
