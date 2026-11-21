import { lessons, normalize } from '../src/math.js';
import { calculatedFacts, experimentAction, experimentContext, modes, pageNames, parameterKeys, squareComparisonReply, squareGroupingHint, viewNames } from '../src/tutor/context.js';
import { quizInstruction, quizSchema, replySchema, tutorInstruction } from '../src/tutor/prompt.js';
import { quizHelp } from '../src/tutor/practice.js';

// Best-effort abuse guard per warm process; configure provider quotas and
// Vercel WAF for a durable, cross-instance spending limit in production.
const buckets = new Map();
const lessonIds = lessons.map(l => l.id);
export function parseInput(body) {
  if (!body || !lessonIds.includes(body.lesson)) throw new Error('invalid');
  if (Buffer.byteLength(JSON.stringify(body)) > 20000) throw new Error('invalid');
  const { lesson, mode = 'hint' } = body;
  if (mode === 'quiz') {
    const quiz = quizHelp(lesson, body.practice);
    return { lesson, mode, quiz, messages: [{ role: 'user', parts: [{ text: JSON.stringify({
      attempt: quiz.attempt, question: quiz.question || '為甚麼我答錯？',
    }) }] }] };
  }
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 10) throw new Error('invalid');
  const { page = 'lab', view = 'shape', proof, selected, params = body.params } = body.context ?? {};
  if (!Object.hasOwn(pageNames, page) || !Object.hasOwn(viewNames, view) || !Object.hasOwn(modes, mode) ||
      page === 'quiz') throw new Error('invalid');
  const messages = body.messages.map(m => {
    if (!m || !['user','assistant'].includes(m.role) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 2000) throw new Error('invalid');
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text.trim() }] };
  });
  if (messages.at(-1).role !== 'user') throw new Error('invalid');
  while (messages[0]?.role === 'model') messages.shift();
  const context = experimentContext(lesson, page, page === 'learn' && !params ? null : normalize(params), view, proof, selected);
  if (mode === 'experiment' && !context.params) throw new Error('invalid');
  return { messages, lesson, mode, context, facts: calculatedFacts(lesson, context) };
}

function modelReply(result) {
  const candidate = result?.candidates?.[0];
  if ((candidate?.finishReason && candidate.finishReason !== 'STOP') ||
      !Array.isArray(candidate?.content?.parts)) return null;
  const text = candidate.content.parts.filter(part => typeof part?.text === 'string' && !part.thought).map(part => part.text).join('');
  try { return JSON.parse(text); } catch { return null; }
}
function reply(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
export function clientAddress(req) {
  // Only Vercel's edge overwrites these headers; direct Node clients can forge them.
  const forwarded = process.env.VERCEL === '1'
    ? req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']
    : null;
  return String(forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, {error:'只接受 POST 請求。'}); }
  if (!req.headers['content-type']?.includes('application/json')) return reply(res,415,{error:'請使用 JSON 格式。'});
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try { if (origin && new URL(origin).host !== host) return reply(res,403,{error:'請從本站使用 AI 學伴。'}); }
  catch { return reply(res,403,{error:'無效的來源。'}); }
  let input;
  try { input = parseInput(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); }
  catch { return reply(res,400,{error:'提問格式不正確。練習提示須先提交作答。'}); }
  if (!process.env.GEMINI_API_KEY) return reply(res,503,{error:'AI 學伴尚未連接。你仍可使用本站提示和互動實驗。'});
  const ip = clientAddress(req);
  const now = Date.now();
  for (const [key, value] of buckets) if (now - value.start > 60000) buckets.delete(key);
  const bucket = buckets.get(ip) || {start:now,count:0};
  if (bucket.count >= 10 || buckets.size > 5000) { res.setHeader('Retry-After','60'); return reply(res,429,{error:'提問太快了，請稍等一分鐘，再一起探索。'}); }
  bucket.count++; buckets.set(ip,bucket);
  const model = /^[a-zA-Z0-9.-]+$/.test(process.env.GEMINI_MODEL || '') ? process.env.GEMINI_MODEL : 'gemini-3.5-flash-lite';
  const signal = AbortSignal.timeout(22000);
  const keys = input.mode === 'experiment' ? parameterKeys(input.lesson) : [];
  const canCompareSquare = input.lesson === 'square' && Boolean(input.facts) && ['check', 'explain'].includes(input.mode);
  const squareHintTerms = input.lesson === 'square' && input.mode === 'hint'
    ? input.facts?.values.slice(1).map((_, index) => String(index + 2)) ?? []
    : [];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: input.quiz ? quizInstruction(input.quiz) : tutorInstruction(input, canCompareSquare, squareHintTerms) }] },
    contents: input.messages,
    generationConfig: { temperature: 0.25, maxOutputTokens: 1600, responseMimeType: 'application/json',
      responseSchema: input.quiz ? quizSchema(input.quiz) : replySchema(keys, canCompareSquare, squareHintTerms) },
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body, signal,
      });
      if (!response.ok) {
        console.warn('tutor upstream status', response.status);
        if (response.status >= 500 && !attempt) continue;
        if (response.status === 429) return reply(res, 429, { error: 'AI 額度暫時用完。先試試本站提示，或稍後再提問。' });
        return reply(res, 502, { error: 'AI 暫時連不上。可以重試，或先用本站提示。' });
      }
      const result = await response.json().catch(() => null);
      if (result?.promptFeedback?.blockReason || result?.candidates?.[0]?.finishReason === 'SAFETY') {
        return reply(res, 422, { error: '這次沒有可顯示的回覆。試試用另一種方式問這個數學問題。' });
      }
      const parsed = modelReply(result);
      const hint = input.quiz?.choices.find(choice => choice.key === parsed?.choice);
      if (input.quiz ? !hint : typeof parsed?.reply !== 'string' || !parsed.reply.trim() ||
          (canCompareSquare && typeof parsed.squareComparison !== 'boolean') ||
          (squareHintTerms.length && parsed.squareHintTerm !== 'none' && !squareHintTerms.includes(parsed.squareHintTerm))) {
        console.warn('tutor invalid structured reply');
        if (!attempt) continue;
        return reply(res, 502, { error: 'AI 回覆不完整。可以重試，或先用本站提示。' });
      }
      if (hint) return reply(res, 200, { hint: hint.text, hintLevel: hint.level });
      const grouped = squareHintTerms.includes(parsed.squareHintTerm) &&
        squareGroupingHint(input.facts, input.context, Number(parsed.squareHintTerm));
      return reply(res, 200, {
        reply: grouped || (canCompareSquare && parsed.squareComparison ? squareComparisonReply(input.facts) : parsed.reply.trim().slice(0, 2000)),
        action: keys.length ? experimentAction(parsed.action, input.lesson, input.context.params) : null,
      });
    } catch {
      if (!signal.aborted && !attempt) continue;
      console.warn(signal.aborted ? 'tutor timeout' : 'tutor network error');
      return reply(res, signal.aborted ? 504 : 502, { error: 'AI 暫時未能回覆。可以重試，或先用本站提示。' });
    }
  }
}
