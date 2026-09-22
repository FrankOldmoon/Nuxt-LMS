const fs = require('fs');
const path = require('path');
const { getOjBase } = require('./lib/oj-config.cjs');

// OJ 平台基址来自系统设置（configs 表 lms:oj.url），不硬编码；启动时解析
let BASE = '';
const OUT = path.join(__dirname, '..', 'storage', 'oj_problems');
const HEADERS = { Accept: 'application/json' };

async function getJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

(async () => {
  BASE = await getOjBase();
  console.log(`OJ base: ${BASE}`);
  // 1. Fetch all list pages
  const allPdocs = [];
  for (let page = 1; page <= 2; page++) {
    const data = await getJSON(`${BASE}/p?page=${page}&q=ccc`);
    console.log(`page ${page}: ${data.pdocs.length} problems (total ${data.pcount})`);
    allPdocs.push(...data.pdocs);
  }
  console.log(`collected ${allPdocs.length} pdocs`);
  fs.writeFileSync(path.join(OUT, 'list.json'), JSON.stringify(allPdocs, null, 2));

  // 2. Fetch each detail
  const details = [];
  let i = 0;
  for (const p of allPdocs) {
    i++;
    try {
      const d = await getJSON(`${BASE}/p/${p.docId}`);
      const pdoc = d.pdoc || {};
      let content = {};
      try { content = JSON.parse(pdoc.content || '{}'); } catch {}
      details.push({
        docId: p.docId,
        pid: p.pid,
        title: p.title,
        tag: p.tag,
        difficulty: p.difficulty,
        nSubmit: p.nSubmit,
        nAccept: p.nAccept,
        contentZh: content.zh || '',
        contentEn: content.en || '',
      });
      if (i % 20 === 0) console.log(`fetched ${i}/${allPdocs.length}`);
    } catch (e) {
      console.error(`FAIL docId=${p.docId} pid=${p.pid}: ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'details.json'), JSON.stringify(details, null, 2));
  console.log(`done: ${details.length}/${allPdocs.length} details saved`);
})();
