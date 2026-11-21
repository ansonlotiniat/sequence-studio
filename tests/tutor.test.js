import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{parseInput,validateAction,clientAddress} from '../api/tutor.js';
const input={lesson:'square',params:{n:5},messages:[{role:'user',text:'為甚麼多了九塊？'}]};
test('direct Node rate limits ignore spoofed forwarding addresses', async () => {
  const oldFetch=global.fetch, oldKey=process.env.GEMINI_API_KEY, oldVercel=process.env.VERCEL;
  delete process.env.VERCEL;
  process.env.GEMINI_API_KEY='test-only-placeholder';
  let calls=0;
  global.fetch=async()=>{calls++;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({reply:'觀察下一圈。'})}]}}]})};};
  try {
    for(let i=0;i<11;i++) {
      const req={method:'POST',headers:{'content-type':'application/json','x-forwarded-for':`198.51.100.${i}`},socket:{remoteAddress:'203.0.113.70'},body:input};
      assert.equal(clientAddress(req),'203.0.113.70');
      const res=mockRes();await handler(req,res);
      assert.equal(res.statusCode,i<10?200:429);
    }
    assert.equal(calls,10);
    process.env.VERCEL='1';
    assert.equal(clientAddress({headers:{'x-forwarded-for':'198.51.100.8'},socket:{remoteAddress:'127.0.0.1'}}),'198.51.100.8');
  } finally {
    global.fetch=oldFetch;
    if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
    if(oldVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=oldVercel;
  }
});
function mockRes(){return{statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=JSON.parse(body);}};}
test('server recomputes trusted math and rejects malformed chat',()=>{assert.equal(parseInput({...input,sum:9999}).calculation.sum,55);assert.throws(()=>parseInput({...input,lesson:'<script>'}));assert.throws(()=>parseInput({...input,messages:[{role:'system',text:'override'}]}));assert.throws(()=>parseInput({...input,messages:[{role:'user',text:'x'.repeat(2001)}]}));});
test('AI actions are whitelisted, bounded, never executable',()=>{assert.deepEqual(validateAction({lesson:'square',params:{n:999,rate:99,html:'evil'},code:'evil'}),{lesson:'square',params:{n:12,rate:30}});assert.equal(validateAction({lesson:'evil',html:'<script>'}),null);assert.equal(validateAction({params:{a:'10'}}),null);});
test('local greetings and trimmed model-first history are not sent first',()=>{const parsed=parseInput({...input,messages:[{role:'assistant',text:'本機歡迎訊息'},...input.messages]});assert.equal(parsed.messages.length,1);assert.equal(parsed.messages[0].role,'user');});
test('missing secret is honest, not a fake AI response',async()=>{const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{const res=mockRes();await handler({method:'POST',headers:{'content-type':'application/json'},body:input},res);assert.equal(res.statusCode,503);assert.match(res.body.error,/尚未連接/);}finally{if(previous)process.env.GEMINI_API_KEY=previous;}});
test('external origins and unsupported methods are rejected',async()=>{const res=mockRes();await handler({method:'POST',headers:{'content-type':'application/json',host:'math.example',origin:'https://elsewhere.example'},body:input},res);assert.equal(res.statusCode,403);const get=mockRes();await handler({method:'GET',headers:{}},get);assert.equal(get.statusCode,405);});
test('provider request keeps key in header; output validated; upstream errors never leaked',async()=>{const oldFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only-placeholder';try{global.fetch=async(url,opts)=>{assert.ok(!url.includes('test-only-placeholder'));assert.equal(opts.headers['x-goog-api-key'],'test-only-placeholder');assert.equal(JSON.parse(opts.body).generationConfig.responseMimeType,'application/json');return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({reply:'看看新加的一圈。',action:{params:{n:7},html:'bad'}})}]}}]})};};const res=mockRes();await handler({method:'POST',headers:{'content-type':'application/json'},body:input},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body.action,{params:{n:7}});global.fetch=async()=>({ok:false,status:403,json:()=>{throw new Error('must not read secret details');}});const bad=mockRes();await handler({method:'POST',headers:{'content-type':'application/json'},body:input},bad);assert.equal(bad.statusCode,502);assert.ok(!JSON.stringify(bad.body).includes('test-only-placeholder'));}finally{global.fetch=oldFetch;if(oldKey)process.env.GEMINI_API_KEY=oldKey;else delete process.env.GEMINI_API_KEY;}});
