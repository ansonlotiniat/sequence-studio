import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{parseInput,clientAddress} from '../api/tutor.js';
import { experimentAction, factLabel } from '../src/tutor/context.js';
const input={lesson:'square',context:{page:'lab',view:'sum',selected:3,params:{n:5}},messages:[{role:'user',text:'為甚麼多了五塊？'}]};
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
test('server recomputes trusted math and rejects malformed chat', () => {
  const { context, facts } = parseInput({ ...input, context: { ...input.context, sum: 9999 } });
  assert.equal(facts.sum, 55);
  assert.equal(facts.newTiles, 5);
  assert.deepEqual(facts.layerIncrements, [1, 3, 5, 7, 9]);
  assert.deepEqual(facts.selected, { term: 3, value: 9, sum: 14 });
  assert.equal(factLabel('square', context, facts), '前 3 項和：14');
  for (const invalid of [
    { lesson: 'unknown' }, { mode: 'unknown' }, { context: { page: 'quiz' } },
    { mode: 'experiment', context: { page: 'path' } },
    { messages: [{ role: 'system', text: 'override' }] }, { messages: [{ role: 'user', text: 'x'.repeat(2001) }] },
  ]) assert.throws(() => parseInput({ ...input, ...invalid }));
});
test('experimental facts handle special geometric ratios and zero interest', () => {
  const facts = (lesson, params) => parseInput({ ...input, lesson, context: { ...input.context, params } }).facts;
  assert.deepEqual(facts('geometric', { a: 2, r: 1, n: 4 }).values, [2, 2, 2, 2]);
  assert.equal(facts('geometric', { a: 2, r: 1, n: 4 }).sum, 8);
  assert.equal(facts('geometric', { a: 2, r: -1, n: 4 }).sum, 0);
  const end = facts('annuity', { rate: 0, n: 4 });
  const beginning = facts('annuity', { rate: 0, n: 4, due: true });
  assert.equal(beginning.sum, end.sum);
  assert.equal(beginning.interest, 0);
  assert.deepEqual(end.periods, [3, 2, 1, 0]);
  assert.deepEqual(beginning.periods, [4, 3, 2, 1]);
  const { selected } = facts('annuity', { payment: 100, rate: 10, n: 4 });
  assert.equal(selected.term, 3);
  assert.ok(Math.abs(selected.sum - 364.1) < 1e-9);
});
test('unopened lesson experiment supplies no visual facts or action schema', () => {
  const learn = { ...input, context: { page: 'learn' } };
  assert.deepEqual(parseInput(learn).context, { page: 'learn' });
  assert.equal(parseInput(learn).facts, null);
  assert.throws(() => parseInput({ ...learn, mode: 'experiment' }));
  assert.equal(parseInput({ ...learn, context: { page: 'learn', params: { n: 5 } } }).facts.sum, 55);
});
test('actions accept only actual, valid changes to parameters of the current experiment', () => {
  assert.deepEqual(experimentAction({ params: { n: 7 } }, 'square', { n: 5 }), { params: { n: 7 } });
  for (const invalid of [{ n: 5 }, { n: 1.5 }, { n: 99 }, { a: 10 }, { n: 7, html: 'bad' }]) {
    assert.equal(experimentAction({ params: invalid }, 'square', { n: 5 }), null);
  }
  assert.equal(experimentAction({ lesson: 'geometric', params: { n: 7 } }, 'square', { n: 5 }), null);
});
test('local greetings and trimmed model-first history are not sent first',()=>{const parsed=parseInput({...input,messages:[{role:'assistant',text:'本機歡迎訊息'},...input.messages]});assert.equal(parsed.messages.length,1);assert.equal(parsed.messages[0].role,'user');});
test('missing secret is honest, not a fake AI response',async()=>{const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{const res=mockRes();await handler({method:'POST',headers:{'content-type':'application/json'},body:input},res);assert.equal(res.statusCode,503);assert.match(res.body.error,/尚未連接/);}finally{if(previous)process.env.GEMINI_API_KEY=previous;}});
test('external origins and unsupported methods are rejected',async()=>{const res=mockRes();await handler({method:'POST',headers:{'content-type':'application/json',host:'math.example',origin:'https://elsewhere.example'},body:input},res);assert.equal(res.statusCode,403);const get=mockRes();await handler({method:'GET',headers:{}},get);assert.equal(get.statusCode,405);});
const model = text => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }) });
async function post(body) {
  const res = mockRes();
  await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body }, res);
  return res;
}
const withProvider = async (t, fetch) => {
  const key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only-placeholder';
  t.after(() => {
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
  });
  return t.mock.method(globalThis, 'fetch', fetch);
};
test('provider receives the key only in the header; malformed JSON retries; modes gate actions', async t => {
  let calls = 0;
  await withProvider(t, async (url, opts) => {
    assert.ok(!url.includes('test-only-placeholder'));
    assert.equal(opts.headers['x-goog-api-key'], 'test-only-placeholder');
    assert.equal(JSON.parse(opts.body).generationConfig.responseMimeType, 'application/json');
    return ++calls === 1 ? model('{') : model('{"reply":"看看新加的一圈。","action":{"params":{"n":7}}}');
  });
  const res = await post({ ...input, mode: 'experiment' });
  assert.equal(calls, 2);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.action, { params: { n: 7 } });
  assert.equal((await post(input)).body.action, null);
});
test('square misconception feedback uses calculator facts, not the model’s incorrect arithmetic', async t => {
  const question = '我想兩臂各有 n 格，角落扣一次，所以是 2n−1。我把第 4 層的 7 格當成 S₄，哪裡弄錯了？';
  const body = { ...input, mode: 'check', context: { page: 'lab', view: 'shape', params: { n: 4 } },
    messages: [{ role: 'user', text: question }] };
  const mock = await withProvider(t, async (_, options) => {
    const request = JSON.parse(options.body);
    assert.deepEqual(request.generationConfig.responseSchema.required, ['reply', 'squareComparison']);
    assert.match(request.systemInstruction.parts[0].text, /"layerIncrements":\[1,3,5,7\]/);
    assert.match(request.systemInstruction.parts[0].text, /1\+4\+9\+16=30 才是 S₄/);
    return model('{"reply":"S₄ = 16","squareComparison":true}');
  });
  const check = await post(body);
  assert.equal(check.statusCode, 200);
  assert.match(check.body.reply, /第 4 圈新增 2n−1 = 7 格/);
  assert.match(check.body.reply, /1 \+ 3 \+ 5 \+ 7 = 16.*a₄/);
  assert.match(check.body.reply, /1 \+ 4 \+ 9 \+ 16 = 30.*S₄/);
  assert.match(check.body.reply, /把 n 改成 5/);
  assert.doesNotMatch(check.body.reply, /S₄ = 16/);
  mock.mock.mockImplementation(async (_, options) => {
    assert.deepEqual(JSON.parse(options.body).generationConfig.responseSchema.required, ['reply']);
    return model('{"reply":"先觀察兩臂。","squareComparison":true}');
  });
  assert.equal((await post({ ...body, mode: 'hint' })).body.reply, '先觀察兩臂。');
});
test('upstream errors and safety blocks are handled without leakage or unnecessary retries', async t => {
  const mock = await withProvider(t, async () => ({ ok: false, status: 403, json: () => assert.fail('upstream error body read') }));
  const bad = await post(input);
  assert.equal(bad.statusCode, 502);
  assert.ok(!JSON.stringify(bad.body).includes('test-only-placeholder'));
  mock.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) }));
  assert.equal((await post(input)).statusCode, 422);
  assert.equal(mock.mock.callCount(), 2);
});
test('quiz regenerates the current question and only returns an authored hint', async t => {
  const practice = { skill: 0, variant: 0, hintLevel: 0, attempt: '9', question: '我只算最後一項', answer: 'do not send' };
  const quiz = { lesson: 'square', mode: 'quiz', practice };
  const { quiz: parsed } = parseInput(quiz);
  let calls = 0;
  await withProvider(t, async (_url, { body }) => {
    const request = JSON.parse(body);
    assert.match(body, /我只算最後一項/);
    assert.equal(JSON.parse(request.contents[0].parts[0].text).attempt, '9');
    assert.doesNotMatch(body, /do not send|= 14/);
    assert.deepEqual(request.generationConfig.responseSchema.required, ['choice']);
    return ++calls === 1 ? model('{"choice":"invalid","reply":"14"}') : model('{"choice":"hint1","reply":"14"}');
  });
  assert.equal((await post({ ...quiz, practice: { ...practice, attempt: '14' } })).statusCode, 400);
  assert.equal((await post({ ...quiz, practice: { ...practice, attempt: 'abc' } })).statusCode, 400);
  assert.equal(calls, 0);
  const res = await post(quiz);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { hint: parsed.choices.find(choice => choice.key === 'hint1').text, hintLevel: 1 });
  assert.equal(calls, 2);
});
