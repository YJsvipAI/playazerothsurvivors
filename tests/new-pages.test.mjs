// 新页逻辑测：/wow-survivors/ 与 /patch-notes/（Q322-D3）
// 零依赖，node --test 运行。锚定本批验收面：title 直配、canonical、JSON-LD 可解析、
// FAQ 恰 3 问、互链、非官方红线口径、hreflang 不加新条。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

export function jsonLds(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1])); // 任何一段坏 JSON 在此直接抛错=测试失败
}

export function faqCount(html) {
  return (html.match(/<details class="faq"/g) || []).length;
}

const wow = read('wow-survivors/index.html');
const patch = read('patch-notes/index.html');

// ── /wow-survivors/ 别名页（词面：wow survivors 9K + warcraft survivors 7.8K + survivors of azeroth 1.8K）──
test('wow-survivors: title 直配目标词', () => {
  assert.match(wow, /<title>[^<]*WoW Survivors[^<]*<\/title>/);
});

test('wow-survivors: canonical 自指本页', () => {
  assert.match(wow, /<link rel="canonical" href="https:\/\/playazerothsurvivors\.com\/wow-survivors\/">/);
});

test('wow-survivors: 正文自然覆盖另两名（warcraft survivors / survivors of azeroth）', () => {
  assert.match(wow, /Warcraft Survivors/);
  assert.match(wow, /Survivors of Azeroth/);
});

test('wow-survivors: JSON-LD 全部可解析且含 FAQPage', () => {
  const lds = jsonLds(wow);
  assert.ok(lds.length >= 2, `至少两段 JSON-LD，实际 ${lds.length}`);
  assert.ok(lds.some((d) => d['@type'] === 'FAQPage'), '缺 FAQPage');
  const faq = lds.find((d) => d['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 3, 'FAQPage 恰 3 问');
});

test('wow-survivors: 可见 FAQ 恰 3 问', () => {
  assert.equal(faqCount(wow), 3);
});

test('wow-survivors: 红线——明示非暴雪官方（fan-made 口径+商标声明）', () => {
  assert.match(wow, /fan-made/i, '缺 fan-made 口径');
  assert.match(wow, /not an official Blizzard game/i, '缺非官方明示');
  assert.match(
    wow,
    /trademarks of Blizzard Entertainment, Inc/i,
    '缺 Blizzard 商标归属声明'
  );
});

test('wow-survivors: 入口卡链首页 + 类目语境链（builds/tier-list）', () => {
  assert.match(wow, /href="\/#game"/, '缺游戏入口卡');
  assert.match(wow, /href="\/builds\/"/);
  assert.match(wow, /href="\/tier-list\/"/);
});

test('wow-survivors: 与 patch-notes 互链', () => {
  assert.match(wow, /href="\/patch-notes\/"/);
});

test('wow-survivors: hreflang 不加新条（head 内 link 不带 hreflang，防 de/es 断链）', () => {
  const head = wow.slice(0, wow.indexOf('</head>'));
  assert.doesNotMatch(head, /<link[^>]+hreflang=/, 'head 出现 hreflang link=断链风险');
});

// ── /patch-notes/ 更新说明母页 ──
test('patch-notes: title 直配 azeroth survivors patch notes', () => {
  assert.match(patch, /<title>Azeroth Survivors Patch Notes[^<]*<\/title>/);
});

test('patch-notes: canonical 自指本页', () => {
  assert.match(patch, /<link rel="canonical" href="https:\/\/playazerothsurvivors\.com\/patch-notes\/">/);
});

test('patch-notes: JSON-LD 全部可解析且含 FAQPage', () => {
  const lds = jsonLds(patch);
  assert.ok(lds.length >= 2, `至少两段 JSON-LD，实际 ${lds.length}`);
  const faq = lds.find((d) => d['@type'] === 'FAQPage');
  assert.ok(faq, '缺 FAQPage');
  assert.equal(faq.mainEntity.length, 3, 'FAQPage 恰 3 问');
});

test('patch-notes: 可见 FAQ 恰 3 问', () => {
  assert.equal(faqCount(patch), 3);
});

test('patch-notes: 时间线含可证版本节点 v0.87 与 v0.143.0（禁编造锚定）', () => {
  assert.match(patch, /v0\.87/, '缺最早可证节点 v0.87');
  assert.match(patch, /v0\.143\.0/, '缺当前版本 v0.143.0');
  assert.match(patch, /class="timeline"/, '缺时间线结构');
});

test('patch-notes: 与 wow-survivors 互链 + 链首页入口 + download 通道', () => {
  assert.match(patch, /href="\/wow-survivors\/"/);
  assert.match(patch, /href="\/#game"/);
  assert.match(patch, /href="\/download\/"/);
});

test('patch-notes: hreflang 不加新条', () => {
  const head = patch.slice(0, patch.indexOf('</head>'));
  assert.doesNotMatch(head, /<link[^>]+hreflang=/);
});
