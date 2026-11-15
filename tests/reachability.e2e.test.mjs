// e2e spec 1：挂载与全站内链可达性（Q322-D3）
// 从首页出发 BFS 全部站内链接，逐个映射磁盘文件验证存在——挂载点改动不产生死链。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const read = (p) => readFileSync(join(root, p), 'utf8');
const ORIGIN = 'https://playazerothsurvivors.com';

// href → 磁盘路径；返回 null = 站外/资源外类型，跳过
function linkToDisk(href, baseDir) {
  let u;
  try {
    u = new URL(href, baseDir); // baseDir 已是完整 URL 前缀（crawl 侧拼好 ORIGIN）
  } catch {
    return null;
  }
  if (u.origin !== ORIGIN) return null;
  if (u.protocol === 'mailto:' || u.protocol === 'tel:') return null;
  let path = decodeURIComponent(u.pathname);
  if (/\.(css|js|svg|png|jpe?g|webp|ico|xml|txt|webmanifest)$/i.test(path)) {
    path = path.replace(/^\//, '');
  } else {
    path = path.replace(/\/+$/, '');
    path = path === '' ? 'index.html' : `${path}/index.html`;
  }
  return path.replace(/^\//, '');
}

function crawl(startRel) {
  const seen = new Set();
  const queue = [startRel];
  const broken = [];
  while (queue.length) {
    const page = queue.shift();
    if (seen.has(page)) continue;
    seen.add(page);
    const html = read(page);
    const baseDir = page === 'index.html' ? `${ORIGIN}/` : `${ORIGIN}/${page.replace(/index\.html$/, '')}`;
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const target = linkToDisk(m[1], baseDir);
      if (target === null) continue;
      const disk = resolve(root, target);
      if (!disk.startsWith(root) || !existsSync(disk)) {
        broken.push(`${page} → ${m[1]}`);
        continue;
      }
      if (target.endsWith('.html')) queue.push(target.replace(/\\/g, '/'));
    }
  }
  return { pages: seen.size, broken };
}

test('e2e: 首页出发全站内链零死链（挂载点不产生 404）', () => {
  const { pages, broken } = crawl('index.html');
  assert.ok(pages >= 27, `爬取页面数应 ≥27（既有 27 页基线），实际 ${pages}`);
  assert.deepEqual(broken, [], `死链清单：\n${broken.join('\n')}`);
});

test('e2e: 首页已挂两新页（wow-survivors + patch-notes）', () => {
  const home = read('index.html');
  assert.match(home, /href="\/wow-survivors\/"/, '首页未挂 /wow-survivors/');
  assert.match(home, /href="\/patch-notes\/"/, '首页未挂 /patch-notes/');
});

test('e2e: builds / tier-list 类目页语境链指向两新页', () => {
  const builds = read('builds/index.html');
  const tier = read('tier-list/index.html');
  assert.match(builds, /href="\/wow-survivors\/"/, 'builds 缺 wow-survivors 语境链');
  assert.match(builds, /href="\/patch-notes\/"/, 'builds 缺 patch-notes 语境链');
  assert.match(tier, /href="\/wow-survivors\/"/, 'tier-list 缺 wow-survivors 语境链');
  assert.match(tier, /href="\/patch-notes\/"/, 'tier-list 缺 patch-notes 语境链');
});

test('e2e: 两新页互为可达（wow-survivors ⇄ patch-notes）', () => {
  assert.match(read('wow-survivors/index.html'), /href="\/patch-notes\/"/);
  assert.match(read('patch-notes/index.html'), /href="\/wow-survivors\/"/);
});

test('e2e: 游戏入口锚 #game 在首页真实存在（两新页入口卡不落空）', () => {
  const home = read('index.html');
  assert.match(home, /id="game"/, '首页缺 id="game" 锚');
  assert.match(home, /id="play"/, '首页缺 id="play" 锚');
});
