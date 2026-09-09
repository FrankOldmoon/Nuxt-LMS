/**
 * 批量把 10.28.1.155 OJ 题目标题改成英文
 *
 * ⚠️ Hydro edit 接口踩坑大全见 scripts/oj_refine_difficulty.cjs 头部注释
 *    （登录会话 / Accept 头 / form-urlencoded / tag 逗号串 / pid 必带 / 302 需回读验证）。
 *
 * 用法：node scripts/oj_translate_titles.cjs <username> <password>
 * 流程：登录拿会话 → 抓全部题目并备份原 pdoc → 逐题 POST /p/{pid}/edit 改 title
 *       （title + 原内容 + 原 tags 一起提交，防止字段被清空）→ 逐题回读验证
 */
const fs = require('fs')
const path = require('path')

const BASE = 'http://10.28.1.155'
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const BACKUP = path.join(OUT_DIR, 'oj155_title_backup.json')

/* ---------- 中 → 英 标题映射（200 题） ---------- */
const TITLES = {
  P1001: 'Output the Second Variable',
  P1002: 'Print Three Variables on One Line',
  P1003: 'Print Hi',
  P1004: 'Addition and Subtraction',
  P1005: 'Multiplication and Division',
  P1006: 'Quotient and Remainder',
  P1007: 'Rectangle Perimeter and Area',
  P1008: 'Circle Circumference and Area',
  P1009: 'Power Operation',
  P1010: 'Fahrenheit to Celsius',
  P1011: 'Arithmetic Sequence Sum',
  P1012: 'Chickens and Rabbits in a Cage',
  P1013: 'Sum and Average of Three Numbers',
  P1014: 'Hours, Minutes and Seconds Conversion',
  P1015: 'Trapezoid Area',
  P1016: 'Absolute Value',
  P1017: 'The Larger of Two Numbers',
  P1018: 'Odd or Even',
  P1019: 'Pass or Fail',
  P1020: 'Positive, Negative or Zero',
  P1021: 'Grade Evaluation',
  P1022: 'Non-zero Check',
  P1023: 'Point in Rectangle',
  P1024: 'Multiples of 3 or 5',
  P1025: 'Triangle Validity and Classification',
  P1026: 'Sum from 1 to n',
  P1027: 'Factorial of n',
  P1028: 'Sum of Squares from 1 to n',
  P1029: 'Sum of n Numbers',
  P1030: 'Maximum of n Numbers',
  P1031: 'Greatest Common Divisor',
  P1032: 'Collatz Steps',
  P1033: 'Reverse a Number',
  P1034: 'Number of Digits',
  P1035: 'Divisible by k',
  P1036: 'Print in Reverse Order',
  P1037: 'Print in Ascending Order',
  P1038: 'Above Average Count',
  P1039: 'Index of the Maximum',
  P1040: 'Swap Maximum and Minimum',
  P1041: 'Print in Descending Order',
  P1042: 'The Second Largest Number',
  P1043: 'Occurrences of a Number',
  P1044: 'Remove Duplicates',
  P1045: 'The Median',
  P1046: 'String Length',
  P1047: 'String Concatenation',
  P1048: 'First and Last Characters',
  P1049: 'String Repetition',
  P1050: 'The k-th Character',
  P1051: 'Count Vowels',
  P1052: 'Count a Specific Character',
  P1053: 'Uppercase to Lowercase',
  P1054: 'Reverse a String',
  P1055: 'Palindrome Check',
  P1056: 'Substring Extraction',
  P1057: 'Find Character Position',
  P1058: 'Count Uppercase Letters',
  P1059: 'All Digits Check',
  P1060: 'All Letters Check',
  P1061: 'Replace Characters',
  P1062: 'Remove Characters',
  P1063: 'String Comparison',
  P1064: 'Count Words',
  P1065: 'Substring Search',
  P1066: 'Matrix Input and Output',
  P1067: 'Matrix Sum',
  P1068: 'Row Sums',
  P1069: 'Column Sums',
  P1070: 'Main Diagonal Sum',
  P1071: 'Matrix Maximum',
  P1072: 'Row Maximums',
  P1073: 'Matrix Transpose',
  P1074: 'Border Sum',
  P1075: 'Matrix Addition',
  P1076: 'Maximum of Three Numbers',
  P1077: 'Primality Test',
  P1078: 'Binomial Coefficient',
  P1079: 'Leap Year Check',
  P1080: 'Count Divisors',
  P1081: 'Digit Sum',
  P1082: 'Perfect Number Check',
  P1083: 'Perfect Square Check',
  P1084: 'Digit Frequency',
  P1085: 'Narcissistic Number',
  P1086: 'Set Dedup and Sort',
  P1087: 'Intersection of Two Sets',
  P1088: 'Character Frequency',
  P1089: 'The Most Frequent Number',
  P1090: 'Sort Points',
  P1091: 'Closest Point to Origin',
  P1092: 'Bracket Matching',
  P1093: 'Remove Adjacent Duplicates',
  P1094: 'Queue Simulation',
  P1095: 'Josephus Problem',
  P1096: 'Decimal to Binary',
  P1097: 'Fibonacci Term',
  P1098: 'Tower of Hanoi Steps',
  P1099: 'Power of Two Check',
  P1100: 'Print Digits in Reverse',
  P2001: 'Skip Multiples of Three',
  P2002: 'Josephus Problem II',
  P2003: 'Day of the Year',
  P2004: 'Add Minutes to Clock',
  P2005: 'Sum of Consecutive Numbers',
  P2006: 'Count Sevens',
  P2007: 'Trailing Zeros of Factorial',
  P2008: 'Base-k Conversion',
  P2009: 'Digital Root',
  P2010: 'Simple Expression Evaluation',
  P2011: 'Character Triangle',
  P2012: 'Character Rhombus',
  P2013: 'Multiplication Table',
  P2014: 'Character Pyramid',
  P2015: 'Snake Matrix',
  P2016: 'Spiral Matrix Fill',
  P2017: 'Hourglass Pattern',
  P2018: "Pascal's Triangle",
  P2019: 'Zigzag Traversal',
  P2020: 'Spiral Order Output',
  P2021: 'Deduplicate and Sort Array',
  P2022: 'The k-th Smallest Element',
  P2023: 'Median',
  P2024: 'Maximum Adjacent Difference',
  P2025: 'The Mode',
  P2026: 'Compute Ranks',
  P2027: 'Count Inversions',
  P2028: 'Merge Sorted Arrays',
  P2029: 'Score Rankings',
  P2030: 'Pair with Minimum Difference',
  P2031: 'Coin Change (Minimum Coins)',
  P2032: 'Maximum Non-overlapping Intervals',
  P2033: 'Minimum Points Covering Intervals',
  P2034: 'Merge Intervals',
  P2035: 'Fractional Knapsack',
  P2036: 'Activity Selection',
  P2037: 'Queue for Water',
  P2038: 'Merge Fruits',
  P2039: 'Delete Digits for Maximum',
  P2040: 'Cut Wood',
  P2041: 'Climbing Stairs',
  P2042: 'Fibonacci Term II',
  P2043: 'Tower of Hanoi Steps II',
  P2044: 'Lines Dividing a Plane',
  P2045: 'Domino Tiling',
  P2046: 'Fast Power',
  P2047: 'GCD Computation',
  P2048: 'Number Tower Maximum Path',
  P2049: 'Binomial Coefficient II',
  P2050: 'Count Factorizations',
  P2051: 'Sequential Search',
  P2052: 'First Element >= x',
  P2053: 'Last Element <= x',
  P2054: 'Search Insert Position',
  P2055: 'Integer Square Root',
  P2056: 'The k-th Smallest',
  P2057: 'Wood Cutting',
  P2058: 'Sequence Segmentation',
  P2059: 'Jumping Stones',
  P2060: 'Borrowing Classrooms',
  P2061: '1D Range Sum',
  P2062: '2D Submatrix Sum',
  P2063: 'Range Add',
  P2064: 'Difference Array Reconstruction',
  P2065: 'Range Add, Point Query',
  P2066: 'Maximum Subarray Sum',
  P2067: 'Subarrays with Sum k',
  P2068: '2D Difference Array',
  P2069: 'Range Sum Equals Target',
  P2070: 'Prefix Sum Counting',
  P2071: 'Climbing Stairs II',
  P2072: 'Longest Increasing Subsequence',
  P2073: 'Longest Common Subsequence',
  P2074: 'Number Triangle Maximum Path',
  P2075: 'Maximum Subarray Sum II',
  P2076: 'Longest Non-decreasing Subsequence',
  P2077: 'House Robber',
  P2078: 'Edit Distance',
  P2079: 'Longest Palindromic Subsequence',
  P2080: 'Ball Passing Game',
  P2081: '0/1 Knapsack',
  P2082: 'Complete Knapsack',
  P2083: 'Bounded Knapsack',
  P2084: 'Grouped Knapsack',
  P2085: 'Knapsack Counting',
  P2086: 'Exactly Full Minimum Value',
  P2087: 'Knapsack Maximum Value',
  P2088: '2D Cost Knapsack',
  P2089: 'Knapsack with Plan Reconstruction',
  P2090: 'Mixed Knapsack',
  P2091: 'Maze Shortest Path',
  P2092: 'Count Connected Components',
  P2093: 'Flood Fill',
  P2094: 'Number of Islands',
  P2095: 'Maze Reachability',
  P2096: 'Minimum Steps BFS',
  P2097: 'Permutations',
  P2098: 'Combinations',
  P2099: 'Knight Traversal',
  P2100: 'Largest Connected Component',
}

let COOKIE = ''
async function api(p, method = 'GET', body, form) {
  // ⚠️ POST 不能带 Accept: application/json（edit 路由 JSON 响应器会 500 且不落库），
  // 完整踩坑文档见 scripts/oj_refine_difficulty.cjs 头部注释
  const headers = method === 'GET' ? { Accept: 'application/json' } : {}
  if (COOKIE) headers.Cookie = COOKIE
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + p, {
    method,
    headers,
    redirect: 'manual',
    body: body ? JSON.stringify(body) : form ? new URLSearchParams(form) : undefined,
  })
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (setCookie.length) COOKIE = setCookie.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } } catch { return { status: res.status, text } }
}

;(async () => {
  const [uname, password] = process.argv.slice(2)
  if (!uname || !password) {
    console.error('用法: node scripts/oj_translate_titles.cjs <username> <password>')
    process.exit(1)
  }

  // 1. 登录
  const login = await api('/login', 'POST', null, { uname, password })
  if (login.status >= 300 && login.status < 400 && !COOKIE) throw new Error('登录跳转但未拿到会话 cookie')
  const me = await api('/')
  console.log('登录 OK，cookie 长度:', COOKIE.length)

  // 2. 抓全部题目（3 页）
  const problems = []
  for (let page = 1; page <= 3; page++) {
    const { json } = await api(`/p?page=${page}`)
    problems.push(...json.pdocs.map((d) => ({ pid: d.pid, docId: d.docId, title: d.title })))
  }
  console.log(`共 ${problems.length} 道题`)

  // 3. 需要改的题（当前标题是中文的）
  const todo = problems.filter((p) => TITLES[p.pid] && p.title !== TITLES[p.pid])
  const skipped = problems.filter((p) => !TITLES[p.pid])
  if (skipped.length) console.log(`⚠️ 无映射、跳过: ${skipped.map((p) => p.pid).join(', ')}`)
  console.log(`待修改: ${todo.length} 道`)

  // 4. 备份原 pdoc（title + content + tag）
  const backup = {}
  for (const p of todo) {
    const { json } = await api(`/p/${p.pid}`)
    const d = json.pdoc
    backup[p.pid] = { title: d.title, content: d.content, tag: d.tag }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2))
  console.log(`原数据已备份: ${BACKUP}（${Object.keys(backup).length} 题）`)

  // 5. 试改第一题并验证（⚠️ Hydro 的 edit 会覆盖 pid，必须把原 pid 一起提交）
  const first = todo[0]
  const b = backup[first.pid]
  await api(`/p/${first.pid}/edit`, 'POST', null, { pid: first.pid, title: TITLES[first.pid], content: b.content, tag: b.tag.join(',') })
  const check = await api(`/p/${first.pid}`)
  const changed = check.json.pdoc.title === TITLES[first.pid]
  const intact = check.json.pdoc.content === b.content
  const pidOk = check.json.pdoc.pid === first.pid
  if (!changed || !intact || !pidOk) {
    throw new Error(`试改失败：title 改动=${changed}，content 完好=${intact}，pid 完好=${pidOk}。终止，未批量执行。`)
  }
  console.log(`试改成功: ${first.pid} → "${TITLES[first.pid]}"，content 完好`)

  // 6. 批量执行
  let ok = 0
  const failed = []
  for (const p of todo) {
    const bb = backup[p.pid]
    try {
      await api(`/p/${p.pid}/edit`, 'POST', null, { pid: p.pid, title: TITLES[p.pid], content: bb.content, tag: bb.tag.join(',') })
      const v = await api(`/p/${p.pid}`)
      if (v.json.pdoc.title === TITLES[p.pid]) ok++
      else failed.push(p.pid)
    } catch (e) {
      failed.push(p.pid)
      console.error(`FAIL ${p.pid}: ${e.message}`)
    }
  }
  console.log(`\n完成: ${ok}/${todo.length} 成功${failed.length ? '，失败: ' + failed.join(',') : ''}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
