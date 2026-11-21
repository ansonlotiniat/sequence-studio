import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatHistory } from '../src/chat.js';
import { parseInput } from '../api/tutor.js';

test('a follow-up after a long model reply stays valid without changing displayed history', () => {
  const messages = [
    { role: 'user', text: '解釋平方和' },
    { role: 'assistant', text: '中'.repeat(4000) },
    { role: 'user', text: '再給我一個提示' },
  ];
  const history = buildChatHistory(messages);
  assert.equal(messages[1].text.length, 4000);
  assert.equal(history[1].text.length, 2000);
  assert.doesNotThrow(() => parseInput({lesson:'square',messages:history}));
});

test('long Chinese exchanges fit the complete UTF-8 wire request and retain the newest question', () => {
  const messages = Array.from({length:10}, (_,i) => ({role:i%2?'assistant':'user',text:'數'.repeat(2000)}));
  messages.push({role:'assistant',text:'暫時失敗',error:true});
  const newest = {role:'user',text:'請再提示我'.repeat(300)};
  messages.push(newest);
  const history = buildChatHistory(messages);
  const body = {lesson:'annuity',params:{n:12,payment:100000,rate:30,due:true},messages:history};
  assert.ok(new TextEncoder().encode(JSON.stringify(body)).length < 20000);
  assert.deepEqual(history.at(-1),newest);
  assert.equal(history[0].role,'user');
  assert.ok(!history.some(m=>m.text==='暫時失敗'));
  assert.doesNotThrow(()=>parseInput(body));
});
