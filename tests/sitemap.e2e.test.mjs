// e2e spec 2：sitemap 一致性（Q322-D3）
// 30 条（27 既有 + Q284 追加 3 页），每条 loc 映射磁盘存在，本批 lastmod 更新锚定。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const xml = readFileSync(join(root, 'sitemap.xml'), 'utf8');

export const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('sitemap: 总条数 = 30（27 既有 + Q284 三新页，零回归）', () => {
  assert.equal(locs.length, 30, `实际 ${locs.length} 条`);
});

test('sitemap: 两新页在图', () => {
  assert.ok(locs.includes('https://playazerothsurvivors.com/wow-survivors/'), '缺 wow-survivors');
  assert.ok(locs.includes('https://playazerothsurvivors.com/patch-notes/'), '缺 patch-notes');
});

test('sitemap: 每条 loc 映射磁盘文件真实存在', () => {
  const missing = [];
  for (const loc of locs) {
    const path = new URL(loc).pathname.replace(/\/+$/, '');
    const rel = path === '' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`;
    if (!existsSync(resolve(root, rel))) missing.push(`${loc} → ${rel}`);
  }
  assert.deepEqual(missing, [], `sitemap 幽灵条目：\n${missing.join('\n')}`);
});

test('sitemap: XML 良构（url 配对、loc 数与 url 数一致）', () => {
  assert.match(xml, /<urlset[\s\S]*<\/urlset>/);
  const opens = (xml.match(/<url>/g) || []).length;
  const closes = (xml.match(/<\/url>/g) || []).length;
  assert.equal(opens, closes, `url 开闭不配对 ${opens}/${closes}`);
  assert.equal(opens, locs.length, 'url 数与 loc 数不一致');
});

test('sitemap: 本批挂载三页 lastmod 已更新 2026-11-16', () => {
  for (const path of ['/', '/builds/', '/tier-list/']) {
    const re = new RegExp(
      `<url><loc>https://playazerothsurvivors\\.com${path.replace(/\//g, '\\/')}</loc><lastmod>2026-11-16</lastmod>`
    );
    assert.match(xml, re, `${path} lastmod 未更新`);
  }
});

test('sitemap: 两新页 lastmod 保持 Q284 落图日 2026-11-14（新页字节未动）', () => {
  for (const path of ['/wow-survivors/', '/patch-notes/']) {
    const re = new RegExp(
      `<url><loc>https://playazerothsurvivors\\.com${path.replace(/\//g, '\\/')}</loc><lastmod>2026-11-14</lastmod>`
    );
    assert.match(xml, re, `${path} lastmod 被意外改动`);
  }
});
