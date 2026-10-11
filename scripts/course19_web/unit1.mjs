/** Unit 1 (Getting Started) intro + chapters 1101, 1102. */
import { maker, embed, block, callout, bullets, table, chapter, unitIntro, steps } from './lib.mjs'

/* ============================================================ 1100 Getting Started */

const gettingStarted = unitIntro({
  overview: 'This unit takes you from opening the Web Maker for the first time to laying out a page with images and lists.',
  points: [
    '🎬 Meet the Web Maker and run your very first page.',
    '🖼️ Practise text, lists and links in HTML.',
    '🖼️ Add images and arrange them in a simple layout.',
  ],
  objectives: [
    '✅ Know that a web page is built from three kinds of code: HTML, CSS and JavaScript.',
    '✅ Use headings, paragraphs, lists and links to structure a page.',
    '✅ Place images with a caption and control their size.',
    '✅ (Extra) Arrange several boxes side by side with plain CSS.',
  ],
  glossary: [
    ['🏗️ HTML Tag', 'A markup symbol such as h1 or p that tells the browser how to structure one piece of content.'],
    ['🎨 CSS Rule', 'A style instruction that pairs a selector with property values that the browser applies to matching elements.'],
    ['⚡ JavaScript Variable', 'A named container that stores a value so the same data can be reused and changed later in a script.'],
    ['🖼️ Image Alt Text', 'A short description written inside an image tag that is read aloud when the picture cannot be seen.'],
    ['🔗 Hyperlink', 'A clickable link that moves the reader from one page to another address on the web.'],
    ['📐 Page Layout', 'The arrangement of the separate boxes on a page, from a single column to a side-by-side row.'],
  ],
  sections: [
    {
      title: '🗺️ What This Unit Covers',
      summary: 'Three chapters that build one small website from an empty page to a laid-out page with pictures.',
      steps: [
        '📖 Read the chapter list below before you start.',
        '🎬 Work through the chapters in order — each one builds on the last.',
        '🏆 Finish the extra challenge in the last chapter to earn the unit badge.',
      ],
      body: table(
        ['Chapter', 'What you will do'],
        [
          ['1.1 Web Basic', '🎬 Run your first page and learn what the three code panes are for.'],
          ['1.2 Text, Lists and Links', '📝 Build a reading page with headings, lists and working links.'],
          ['1.3 Images and Layout', '🖼️ Add pictures with captions and place boxes side by side.'],
        ]
      ) + callout('💡', 'Every chapter in this unit has a live editor embedded in the page. You type real code and it runs immediately — nothing here is a screenshot.'),
    },
  ],
})

/* ============================================================ 1101 Text, Lists and Links */

const listDemo = {
  html: `<h1>How to Bake Bread</h1>
<p>Bread is one of the oldest foods people make.</p>
<h2>You need</h2>
<ul>
  <li>500 g flour</li>
  <li>300 ml warm water</li>
  <li>1 spoon of salt</li>
</ul>
<h2>Steps</h2>
<ol>
  <li>Mix everything.</li>
  <li>Knead for 10 minutes.</li>
  <li>Bake for 40 minutes.</li>
</ol>
<p><a href="https://en.wikipedia.org/wiki/Bread">Read more on Wikipedia</a></p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  line-height: 1.6;
}
h1 {
  color: #b45309;
}
li {
  margin: 4px 0;
}
a {
  color: #2563eb;
}`,
  js: ``,
}

const linkDemo = {
  html: `<h2>My favourite sites</h2>
<ul>
  <li><a href="https://en.wikipedia.org">Wikipedia</a> — facts about everything</li>
  <li><a href="https://www.w3.org">W3C</a> — the people who write HTML rules</li>
</ul>
<p>
  Open in a new tab:
  <a href="https://developer.mozilla.org" target="_blank">MDN Web Docs</a>
</p>
<p id="tip">Tip: hover the links to see where they go.</p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
a {
  color: #2563eb;
}
#tip {
  color: #64748b;
  font-size: 14px;
}`,
  js: ``,
}

const textListsLinks = chapter({
  overview: 'In this chapter you will build a reading page with headings, lists and links that actually work.',
  points: [
    '🖼️ Learn which heading level to use for which kind of title.',
    '📝 Build bulleted and numbered lists in a live editor.',
    '🔗 Turn words into links, including links that open a new tab.',
  ],
  objectives: [
    '✅ Pick the right heading level so a page has a clear title structure.',
    '✅ Build bulleted lists with `<ul>` and numbered lists with `<ol>`.',
    '✅ Add a hyperlink and control whether it opens in a new tab.',
    '✅ (Extra) Style the links so a reader knows exactly where they go.',
  ],
  glossary: [
    ['🖼️ Image Alt Text', 'A short description written inside an image tag that is read aloud when the picture cannot be seen.'],
    ['🔗 Hyperlink', 'A clickable link that moves the reader from one page to another address on the web.'],
    ['📐 Page Layout', 'The arrangement of the separate boxes on a page, from a single column to a side-by-side row.'],
    ['🔢 Ordered List', 'A list whose items are numbered in order, created with the ol tag.'],
    ['🔘 Button', 'A clickable element that runs a piece of JavaScript when the user presses it.'],
    ['🪟 Browser Tab', 'One open page inside the browser, each with its own address and its own scroll position.'],
  ],
  activities: [
    {
      title: 'Headings and Paragraphs',
      summary: 'Headings are the signposts of a page — there are six sizes, and each one means a different level.',
      steps: [
        '🖼️ Read how h1 to h3 change the size and weight of the text.',
        '🎬 Edit the title in the live editor and run the page.',
        '📝 Change your title into an h2 and notice what happens to the page.',
      ],
      body: [
        'A page usually has **one** `h1` — the main title. Everything below it is an `h2`, and below that an `h3`.',
        '',
        block('html', `<h1>How to Bake Bread</h1>
<p>Bread is one of the oldest foods people make.</p>
<h2>You need</h2>
<h3>Ingredients</h3>`),
        '',
        callout('⚠️', 'Skipping a level — going from h1 straight to h3 — makes the page hard to navigate for anyone using a screen reader. Always step down one level at a time.'),
        '',
        '### 🎬 Build a Reading Page',
        '',
        'The live editor below shows a complete page. Notice how the browser draws each heading smaller than the one above it — you did not set those sizes yourself.',
        '',
        embed(maker(listDemo), 620),
        '',
        '- ✅ **Checkpoint:** your page has one `h1`, two `h2` headings, and a numbered list of exactly three steps.',
        '- 💡 Try making a `<li>` into a `<ul>` item\'s parent — what happens if you forget the closing `</ul>`?',
      ].join('\n'),
    },
    {
      title: 'Bulleted and Numbered Lists',
      summary: 'Two kinds of list: `<ul>` for things with no order, `<ol>` for steps that must be followed in order.',
      steps: [
        '🎬 Compare the ingredient list with the steps list in the editor.',
        '📝 Add one more item to each list and run the page.',
        '🖼️ Swap one `<ul>` for a `<ol>` and compare the result.',
      ],
      body: [
        'Use the right list for the job: ingredients have **no** order, so they use `<ul>`; steps **must** be followed in order, so they use `<ol>`.',
        '',
        block('html', `<ul>
  <li>500 g flour</li>
  <li>300 ml warm water</li>
</ul>

<ol>
  <li>Mix everything.</li>
  <li>Knead for 10 minutes.</li>
</ol>`),
        '',
        '### 🎬 Read Both Kinds of List',
        '',
        'The `<ul>` items get a bullet dot; the `<ol>` items get numbers. The browser does the numbering — you never type "1." yourself.',
        '',
        callout('💡', 'Want a letter list instead of numbers, or no marker at all? That is a CSS job: set `list-style-type` on the list. You will meet it in the next unit.'),
        '',
        '### 📝 Practise With Your Own Words',
        '',
        bullets([
          '📝 Write a bulleted list of five things you bring to school.',
          '📝 Write a numbered list of four steps for making a cup of tea.',
          '✅ **Checkpoint:** the first list has dots, the second list has numbers, and neither has a number typed by hand.',
        ]),
      ].join('\n'),
    },
    {
      title: 'Links That Work',
      summary: 'A link is just a word wrapped in a tag that carries an address — the browser turns it blue and clickable for you.',
      steps: [
        '🔗 Add one link to the live editor and run the page.',
        '🖱️ Ctrl-click (or Cmd-click) a link so it opens in a new tab.',
        '🎬 Add `target="_blank"` to one link and compare the behaviour.',
      ],
      body: [
        'The `a` tag is the shortest one you will meet: it needs an address, written in `href`.',
        '',
        block('html', `<a href="https://en.wikipedia.org">Wikipedia</a>`),
        '',
        '### 🔗 Build a Link List',
        '',
        embed(maker(linkDemo), 620),
        '',
        '- 💡 **Hover** a link and the browser shows the address in the corner — that is how you check a link before you click it.',
        '- ⚠️ Always write `https://` in the address. Without it the browser guesses, and the link often breaks.',
        '',
        '### 🎬 Add a Link of Your Own',
        '',
        bullets([
          '🔗 Add a link to a page you like, with your own words as the link text.',
          '🖼️ Make the link open in a new tab with `target="_blank"`.',
          '✅ **Checkpoint:** all three links work, and exactly one of them opens a new tab.',
        ]),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'One page that uses every text tool in this chapter, written by you from an empty file.',
      steps: [
        '🎬 Start from the blank editor and build the page without copying.',
        '📸 Read your page top to bottom and check every tag is closed.',
        '💬 Compare your page with a classmate\'s and swap one idea each.',
      ],
      body: [
        '### 🎬 Build a Club Page',
        '',
        'Create a page about a club you would like to start. It must contain:',
        '',
        bullets([
          '🖼️ One `h1` title and at least two `h2` headings.',
          '📝 One bulleted list and one numbered list.',
          '🔗 Two links, and one of them opens in a new tab.',
          '🎨 At least two CSS rules of your own choosing.',
        ]),
        '',
        block('html', `<h1>Robotics Club</h1>

<h2>What we do</h2>
<ul>
  <li>Build a line-following robot</li>
  <li>Compete in the school challenge</li>
</ul>

<h2>How to join</h2>
<ol>
  <li>Come to room 12 on Wednesday</li>
  <li>Bring the form from the office</li>
</ol>

<p><a href="https://example.com/robotics">Read the club page</a></p>`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** add a short paragraph under every `h2` so no heading stands alone.',
          '🏆 **Challenge 2:** put a link inside a list item, and make the whole list one visual block with a background colour.',
          '🏆 **Challenge 3:** nest a bulleted list inside one numbered item to show sub-steps.',
        ]),
        '',
        '✅ **Final checkpoint:** your page has a title, two kinds of list, two working links, and no unclosed tags.',
      ].join('\n'),
    },
  ],
})

/* ============================================================ 1102 Images and Layout */

const imgDemo = {
  html: `<div class="card">
  <img
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Coloured_ink_three_dots.jpg/320px-Coloured_ink_three_dots.jpg"
    alt="Three dots of coloured ink">
  <h2>Coloured ink</h2>
  <p>One small image can say a lot, if you describe it well.</p>
</div>
<div class="card">
  <img
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/320px-Fronalpstock_big.jpg"
    alt="A mountain range under a blue sky">
  <h2>Mountain</h2>
  <p>Always write alt text that a screen reader can say out loud.</p>
</div>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
.card {
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.card img {
  width: 100%;
  border-radius: 8px;
}
.card h2 {
  margin: 12px 0 4px;
  font-size: 18px;
}`,
  js: ``,
}

const flexDemo = {
  html: `<div class="row">
  <div class="box box-a">A</div>
  <div class="box box-b">B</div>
  <div class="box box-c">C</div>
</div>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
.row {
  display: flex;
  gap: 16px;
}
.box {
  flex: 1;
  padding: 32px 0;
  text-align: center;
  color: white;
  border-radius: 10px;
}
.box-a { background: #ef4444; }
.box-b { background: #22c55e; }
.box-c { background: #3b82f6; }`,
  js: ``,
}

const imagesLayout = chapter({
  overview: 'In this chapter you will add pictures that describe themselves, then place boxes side by side on the page.',
  points: [
    '🖼️ Place images and write alt text that a screen reader can read.',
    '📐 Control image size and shape with CSS.',
    '🎬 Arrange three boxes in a row with flexbox.',
  ],
  objectives: [
    '✅ Insert an image and give it alt text that describes the picture.',
    '✅ Control the width, the rounding and the border of an image with CSS.',
    '✅ Use `display: flex` and `gap` to place boxes side by side.',
    '✅ (Extra) Build a three-card row that stays readable on a narrow screen.',
  ],
  glossary: [
    ['🖼️ Image Alt Text', 'A short description written inside an image tag that is read aloud when the picture cannot be seen.'],
    ['📐 Page Layout', 'The arrangement of the separate boxes on a page, from a single column to a side-by-side row.'],
    ['📏 Aspect Ratio', 'The relationship between the width and the height of a picture, which must be kept or the picture is stretched.'],
    ['↔️ Flexbox', 'A CSS layout system that places boxes in a row or a column and shares the space between them.'],
    ['📏 Gap', 'The empty space placed between two neighbouring boxes in a flexbox row or column.'],
    ['📱 Responsive', 'A page whose layout adapts to the width of the screen it is being shown on.'],
  ],
  activities: [
    {
      title: 'Pictures That Describe Themselves',
      summary: 'An image tag needs three things: where the picture is, how it should look, and what it means.',
      steps: [
        '🖼️ Read the three parts of an image tag.',
        '🎬 Change the width of one picture in the live editor.',
        '📝 Write alt text for a picture of your own choice.',
      ],
      body: [
        'An image tag looks like this:',
        '',
        block('html', `<img src="photo.jpg" alt="A robot on a table" width="320">`),
        '',
        '| Part | What it does |',
        '| --- | --- |',
        '| `src` | The address of the picture file |',
        '| `alt` | The description read aloud if the picture cannot be seen |',
        '| `width` | How wide the picture is drawn, in pixels |',
        '',
        '### 🖼️ Try Real Images',
        '',
        embed(maker(imgDemo), 620),
        '',
        '### 🎬 Control Size and Shape',
        '',
        'The width is best set in **CSS**, not in the tag, so the same picture can look right on a big screen and a small one:',
        '',
        block('css', `.card img {
  width: 100%;
  border-radius: 8px;
}`),
        '',
        'Setting only `width` and never `height` keeps the aspect ratio, so the picture never stretches. ⚠️ Setting both is the usual cause of a squashed-looking photo.',
        '',
        bullets([
          '🎬 Set the width to `100%` and watch the picture fill its card.',
          '📝 Add a second CSS rule that rounds the corners more strongly.',
          '✅ **Checkpoint:** both pictures fill their cards, have rounded corners, and each has a meaningful `alt`.',
        ]),
      ].join('\n'),
    },
    {
      title: 'Boxes Side by Side',
      summary: 'Flexbox turns a stack of boxes into a row, and `gap` controls how much air sits between them.',
      steps: [
        '🎬 Run the three-box row in the live editor.',
        '🔍 Find the two CSS rules that create the row.',
        '🎬 Change `gap` to `40px` and run the page again.',
      ],
      body: [
        'Flexbox is one line of CSS that changes how a group of boxes is arranged:',
        '',
        block('css', `.row {
  display: flex;
  gap: 16px;
}`),
        '',
        '- 📏 `display: flex` puts the boxes in a **row** by default.',
        '- 🎨 `gap: 16px` leaves 16 pixels of empty space **between** them.',
        '- `flex: 1` on each box makes all three share the leftover width equally.',
        '',
        '### 🎬 Build a Three-Box Row',
        '',
        embed(maker(flexDemo), 620),
        '',
        '### 🔍 Change One Thing at a Time',
        '',
        bullets([
          '🎬 Change `gap` to `40px` — the boxes stay the same size, the space between them grows.',
          '🎬 Remove `flex: 1` — the boxes shrink to the width of their letters.',
          '🎬 Add `flex-wrap: wrap` to the row and shrink your browser window — the boxes drop onto a second line instead of overflowing.',
          '✅ **Checkpoint:** you can explain in one sentence why the three boxes are the same width.',
        ]),
        '',
        callout('💡', '`flex-wrap: wrap` is the one line that makes a flexbox row survive a narrow phone screen. Add it to every row of boxes you build from now on.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'A three-card gallery that combines images, alt text, flexbox and wrapping.',
      steps: [
        '🎬 Build a row of three picture cards in the live editor.',
        '📐 Make the row wrap neatly on a narrow screen.',
        '📸 Check every card has an alt text and a caption.',
      ],
      body: [
        '### 🎬 Build a Card Gallery',
        '',
        'Create a gallery of three cards. Each card needs a picture, a caption below it, and a background colour.',
        '',
        block('html', `<div class="row">
  <div class="card">
    <img src="one.jpg" alt="First project">
    <h3>Project one</h3>
  </div>
  <div class="card">
    <img src="two.jpg" alt="Second project">
    <h3>Project two</h3>
  </div>
  <div class="card">
    <img src="three.jpg" alt="Third project">
    <h3>Project three</h3>
  </div>
</div>`),
        '',
        block('css', `.row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.card {
  flex: 1 1 240px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}
.card img {
  width: 100%;
  border-radius: 8px;
}`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** make the first card twice as wide as the others with `flex: 2 1 240px`.',
          '🏆 **Challenge 2:** add a fourth card and set the row to wrap automatically on a narrow screen.',
          '🏆 **Challenge 3:** add a slow zoom on hover using `transition: transform 0.3s`.',
        ]),
        '',
        '✅ **Final checkpoint:** three cards sit in a row, wrap instead of overflowing when the screen is narrow, and every image has alt text.',
      ].join('\n'),
    },
  ],
})

export default { 1100: gettingStarted, 1101: textListsLinks, 1102: imagesLayout }
