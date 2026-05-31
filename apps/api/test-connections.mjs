/**
 * 大模型连通性测试脚本
 * 用法：node test-connections.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// 解析 .env
const envRaw = readFileSync(join(__dir, '.env'), 'utf-8');
const env = Object.fromEntries(
  envRaw
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const LLM_BASE_URL = env.LLM_BASE_URL;
const LLM_MODEL = env.LLM_MODEL;
const LLM_API_KEY = env.LLM_API_KEY;
const ASR_API_KEY = env.ASR_API_KEY;
const ASR_RESOURCE_ID = env.ASR_RESOURCE_ID;

// ─────────────────────────────────────────────────────────────
// 1. 测试 LLM（豆包 / 火山方舟）
// ─────────────────────────────────────────────────────────────
async function testLLM() {
  console.log('\n【1】测试 LLM 连通性...');
  console.log(`   Base URL : ${LLM_BASE_URL}`);
  console.log(`   Model    : ${LLM_MODEL}`);

  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `你是记账助手，从用户语音文本中提取记账信息，返回JSON数组。
今天日期：${today}。
每条记录：{ type:1支出/2收入, amount:金额, categoryName:分类, remark:备注, billDate:YYYY-MM-DD }
只返回JSON数组，不含其他文字。`;

  const body = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '今天午饭花了15块，打车花了30，工资收入8000' },
    ],
    temperature: 0.1,
    max_tokens: 500,
  };

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`   ✗ HTTP ${res.status}: ${text}`);
    return false;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  console.log(`   ✓ 响应成功，原始内容：\n   ${content}`);

  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    console.log(`   ✓ 解析 ${parsed.length} 条账单：`);
    parsed.forEach((b, i) =>
      console.log(`     [${i + 1}] type=${b.type} amount=${b.amount} category=${b.categoryName} remark=${b.remark}`)
    );
  } else {
    console.warn('   ⚠ 响应内容无法解析为 JSON 数组');
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// 2. 测试 ASR（火山引擎大模型录音文件识别标准版）
//    使用一个公开可访问的微型 MP3 验证鉴权和任务提交
// ─────────────────────────────────────────────────────────────
async function testASR() {
  console.log('\n【2】测试 ASR 连通性...');
  console.log(`   ASR Key       : ${ASR_API_KEY.slice(0, 8)}****`);
  console.log(`   Resource ID   : ${ASR_RESOURCE_ID}`);

  // 使用阿里云 OSS 上的公开中文测试音频（国内可访问）
  const testAudioUrl = 'https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/asr_example.wav';
  const requestId = crypto.randomUUID();

  // 2-1: 提交任务
  console.log(`   提交任务 requestId=${requestId}...`);
  const submitBody = {
    user: { uid: 'test-script' },
    audio: {
      format: 'wav',
      url: testAudioUrl,
      language: 'zh-CN',
      codec: 'raw',
      rate: 16000,
      bits: 16,
      channel: 1,
    },
    request: {
      model_name: 'bigmodel',
      enable_itn: true,
      enable_punc: true,
    },
  };

  const submitRes = await fetch(
    'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ASR_API_KEY,
        'X-Api-Resource-Id': ASR_RESOURCE_ID,
        'X-Api-Request-Id': requestId,
        'X-Api-Sequence': '-1',
      },
      body: JSON.stringify(submitBody),
    }
  );

  const submitText = await submitRes.text();
  let submitData;
  try { submitData = JSON.parse(submitText); } catch { submitData = submitText; }

  if (!submitRes.ok) {
    console.error(`   ✗ 提交失败 HTTP ${submitRes.status}:`, submitData);
    return false;
  }
  console.log(`   ✓ 提交响应 HTTP ${submitRes.status}:`, JSON.stringify(submitData));

  // 2-2: 轮询查询（最多 5 次，每次 3 秒）
  console.log('   开始轮询查询结果（最多等待 15s）...');
  for (let i = 1; i <= 5; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const queryRes = await fetch(
      'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': ASR_API_KEY,
          'X-Api-Resource-Id': ASR_RESOURCE_ID,
          'X-Api-Request-Id': requestId,
        },
        body: '{}',
      }
    );

    const queryText = await queryRes.text();
    let queryData;
    try { queryData = JSON.parse(queryText); } catch { queryData = queryText; }

    // 成功：result.text 有值
    if (queryData?.result?.text != null) {
      console.log(`   ✓ 识别成功！文本："${queryData.result.text}"`);
      return true;
    }

    // 错误：base_resp 有错误码
    const errCode = queryData?.base_resp?.status_code;
    if (errCode != null) {
      const msg = queryData?.base_resp?.status_message ?? '';
      console.error(`   ✗ 查询出错 code=${errCode} msg=${msg}`);
      return false;
    }

    // 空响应：处理中
    console.log(`   [${i}/5] 进行中...`);
  }

  console.log('   ⚠ 超时（15s），但鉴权和提交均正常，任务仍在处理中');
  return true;
}

// ─────────────────────────────────────────────────────────────
// 执行测试
// ─────────────────────────────────────────────────────────────
(async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  兜兜有钱 - 大模型连通性测试');
  console.log('═══════════════════════════════════════════');

  let llmOk = false;
  let asrOk = false;

  try { llmOk = await testLLM(); } catch (e) { console.error('LLM 测试异常:', e.message); }
  try { asrOk = await testASR(); } catch (e) { console.error('ASR 测试异常:', e.message); }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  LLM（豆包语言模型）: ${llmOk ? '✓ 正常' : '✗ 异常'}`);
  console.log(`  ASR（豆包语音识别）: ${asrOk ? '✓ 正常' : '✗ 异常'}`);
  console.log('═══════════════════════════════════════════\n');
})();
