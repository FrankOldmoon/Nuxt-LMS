/** Unit 2 (CSS Styling) intro + chapters 1104, 1105. */
import { maker, embed, block, callout, bullets, table, chapter, unitIntro } from './lib.mjs'

/* ============================================================ 1103 CSS Styling */

const cssStyling = unitIntro({
  overview: 'This unit is about looking. You will learn to control the colours, the fonts and the spacing of everything on a page.',
  points: [
    '🎨 Choose colours and fonts that make a page easy to read.',
    '📐 Understand the box model and place boxes side by side with flexbox.',
  ],
  objectives: [
    '✅ Pick readable colours and understand where a colour comes from on the page.',
    '✅ Control the size, the shape and the space around any element.',
    '✅ Explain what the box model is and why every element is a box.',
    '✅ (Extra) Build a card that stays readable on both a phone and a desktop.',
  ],
  glossary: [
    ['🎨 CSS Rule', 'A style instruction that pairs a selector with property values that the browser applies to matching elements.'],
    ['🎯 CSS Selector', 'A pattern such as .card or h2 that matches the HTML elements a CSS rule should be applied to.'],
    ['📦 Box Model', 'The rule that every element is a rectangle made of content, padding, border and margin.'],
    ['🎨 Hex Colour', 'A colour written as #rrggbb, where each pair is the strength of red, green and blue.'],
    ['📏 Padding', 'The empty space between the content of an element and its border.'],
    ['📐 Margin', 'The empty space between one element\'s border and the element next to it.'],
  ],
  sections: [
    {
      title: '🗺️ What This Unit Covers',
      summary: 'Two chapters that turn a plain, correct page into a page somebody wants to look at.',
      steps: [
        '📖 Read the chapter list below before you start.',
        '🎨 Work through both chapters in order.',
        '🏆 Finish the extra challenge in the last chapter to earn the unit badge.',
      ],
      body: table(
        ['Chapter', 'What you will do'],
        [
          ['2.1 Colours, Fonts and Text', '🎨 Set colours, fonts, sizes and line spacing so a page is comfortable to read.'],
          ['2.2 The Box Model and Flexbox', '📐 Control padding, border and margin, then lay out boxes in a row.'],
        ]
      ) + callout('💡', 'A page can be perfectly correct HTML and still hard to read. Everything in this unit is about the second problem.'),
    },
  ],
})

/* ============================================================ 1104 Colours, Fonts and Text */

const colourDemo = {
  html: `<div class="card light">
  <h3>Light card</h3>
  <p>Dark text on a light background.</p>
</div>
<div class="card mid">
  <h3>Mid card</h3>
  <p>White text on a mid background.</p>
</div>
<div class="card dark">
  <h3>Dark card</h3>
  <p>Light text on a dark background.</p>
</div>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
.card {
  padding: 20px;
  margin-bottom: 12px;
  border-radius: 10px;
}
.light { background: #f8fafc; color: #0f172a; }
.mid   { background: #0ea5e9; color: #ffffff; }
.dark  { background: #0f172a; color: #f8fafc; }`,
  js: ``,
}

const fontDemo = {
  html: `<p class="serif">This line uses a serif font — the letters have small feet.</p>
<p class="mono">This line uses a monospace font — every letter is the same width.</p>
<p class="big">This line uses a larger size, more line height, and a little letter spacing.</p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  line-height: 1.5;
}
.serif { font-family: Georgia, serif; }
.mono  { font-family: ui-monospace, monospace; }
.big {
  font-size: 22px;
  line-height: 2;
  letter-spacing: 1px;
}`,
  js: ``,
}

const coloursFontsText = chapter({
  overview: 'In this chapter you will learn to control how a page looks: its colours, its fonts and the spacing inside the text.',
  points: [
    '🎨 Set the colour and the background of anything on the page.',
    '🅰️ Change the font, the size and the spacing of a line of text.',
    '🔍 Choose colours that a reader can actually read.',
  ],
  objectives: [
    '✅ Set `color` and `background` for any element and explain which one wins.',
    '✅ Write a colour in hex form and understand what the three pairs mean.',
    '✅ Change `font-family`, `font-size` and `line-height` on a single element.',
    '✅ (Extra) Pick a background and text colour pair that passes a readability check.',
  ],
  glossary: [
    ['🎨 Hex Colour', 'A colour written as #rrggbb, where each pair is the strength of red, green and blue.'],
    ['🎨 CSS Rule', 'A style instruction that pairs a selector with property values that the browser applies to matching elements.'],
    ['🎯 CSS Selector', 'A pattern such as .card or h2 that matches the HTML elements a CSS rule should be applied to.'],
    ['🔤 Font Stack', 'A list of font names in CSS, where the browser uses the first one that is available on the reader\'s computer.'],
    ['📏 Line Height', 'The vertical space between one line of text and the next, given as a number or a percentage.'],
    ['♿ Readability', 'How easily a person can read and understand the text on a page.'],
  ],
  activities: [
    {
      title: 'Colour Comes From Two Places',
      summary: 'Every piece of text has two colours: the colour of the letters, and the colour behind them.',
      steps: [
        '🎨 Read the three cards in the live editor.',
        '🎬 Change one background to a colour and run the page.',
        '🔍 Work out which property makes the text readable.',
      ],
      body: [
        'Two properties do almost all the work: `color` paints the letters, and `background-color` paints the box behind them.',
        '',
        block('css', `.light {
  background-color: #f8fafc;
  color: #0f172a;
}`),
        '',
        'A hex colour is written `#rrggbb`, where `rr`, `gg` and `bb` are the strength of red, green and blue. `#0f172a` is a very dark blue-black.',
        '',
        '### 🎨 Three Cards, Three Colour Schemes',
        '',
        embed(maker(colourDemo), 620),
        '',
        '### 🔍 Which Colour Comes From Where',
        '',
        bullets([
          '🔍 `color` — the **letters**. Try setting it to the same value as the background and the text disappears.',
          '🔍 `background-color` — the **box behind**. Try setting it to `transparent` and the page background shows through.',
          '🎨 `border-color` — the **line around the box**, when the border has a width.',
        ]),
        '',
        callout('⚠️', 'If a style does not apply, the reason is nearly always that a later rule beat it. When two rules both match the same element, the one written **later in the stylesheet** wins.'),
        '',
        '### ✅ A Quick Readability Test',
        '',
        bullets([
          '🎨 Pick a background, then pick a text colour far away from it.',
          '👀 Squint at the page — if you cannot read it, the pair is too close.',
          '✅ **Checkpoint:** all three cards are readable, and you can say which property you changed.',
        ]),
      ].join('\n'),
    },
    {
      title: 'Fonts, Size and Spacing',
      summary: 'The font is only half of it — size and line height decide whether a paragraph feels comfortable or crowded.',
      steps: [
        '🅰️ Compare the three lines of text in the live editor.',
        '🎬 Change the font of the whole page with one rule.',
        '📏 Increase the line height and read the paragraph again.',
      ],
      body: [
        block('css', `body {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}`),
        '',
        'The two fonts after the first one are **fallbacks**. If the reader\'s computer does not have the first font, the browser tries the next — this list is called a font stack.',
        '',
        '### 🅰️ Compare Three Fonts',
        '',
        embed(maker(fontDemo), 620),
        '',
        bullets([
          '📏 `font-size: 22px` — text twice as large, and far more readable on a projector.',
          '📏 `line-height: 2` — twice as much air between the lines. Long text is much easier to read with a line height above 1.5.',
          '🔤 `letter-spacing: 1px` — a tiny gap between letters. Large headings often look better with a little of it.',
        ]),
        '',
        '### 🎬 Set the Font of a Whole Page',
        '',
        'One rule on `body` changes the font for **everything inside it**, because every other element inherits it:',
        '',
        block('css', `body {
  font-family: Georgia, serif;
}
.card h2 {
  font-family: system-ui, sans-serif;
}`),
        '',
        callout('💡', 'Set the font once on `body` and let it flow down. Setting it separately on forty elements is how stylesheets turn into an unreadable mess.'),
        '',
        '✅ **Checkpoint:** the page uses at most two fonts, the paragraph has a line height above 1.5, and the heading is clearly larger than the body text.',
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'One set of three cards that must stay readable on a phone, a laptop and a projector.',
      steps: [
        '🎨 Build three cards in the live editor and style them with classes.',
        '♿ Check that every card passes the readability test.',
        '📐 Make the text bigger and the spacing wider.',
      ],
      body: [
        '### 🎨 Build a Topic Card Row',
        '',
        'Build three cards — one for each of your school subjects. Each card needs its own background colour and a matching readable text colour.',
        '',
        block('css', `.card {
  padding: 24px;
  border-radius: 12px;
  border: none;
}
.math     { background: #0ea5e9; color: #ffffff; }
.science  { background: #22c55e; color: #052e16; }
.history  { background: #f59e0b; color: #1c1917; }`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** give each card a different `border-radius` value and compare which one looks softest.',
          '🏆 **Challenge 2:** add a subtle `box-shadow` so the cards look like they are lifted off the page.',
          '🏆 **Challenge 3:** set the base font size once on `body`, then use `em` units so the cards scale automatically.',
        ]),
        '',
        '### ✅ Final Readability Check',
        '',
        bullets([
          '👀 Every card: can you read the text without squinting?',
          '🅰️ Is the heading at least 1.5× the size of the body text?',
          '📏 Is the line height at least 1.5 on the paragraph?',
          '✅ **Final checkpoint:** three cards, three readable colour pairs, one font stack, and a line height you set deliberately.',
        ]),
      ].join('\n'),
    },
  ],
})

/* ============================================================ 1105 The Box Model and Flexbox */

const boxDemo = {
  html: `<div class="demo">
  <div class="margin">
    <div class="border">
      <div class="padding">
        <div class="content">content</div>
      </div>
    </div>
  </div>
</div>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #f1f5f9;
}
.margin {
  background: #fde68a;
  padding: 24px;
}
.border {
  background: #fbbf24;
  border: 6px solid #d97706;
  padding: 16px;
}
.padding {
  background: #86efac;
  padding: 16px;
}
.content {
  background: #2563eb;
  color: white;
  padding: 16px;
  border-radius: 6px;
  text-align: center;
}`,
  js: ``,
}

const sizingDemo = {
  html: `<div class="fixed">width: 200px</div>
<div class="padded">padding: 40px</div>
<div class="rounded">border-radius: 40px</div>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}
.fixed {
  width: 200px;
  background: #bfdbfe;
  padding: 12px;
  border: 2px solid #3b82f6;
}
.padded {
  background: #bbf7d0;
  padding: 40px;
  border: 2px solid #22c55e;
}
.rounded {
  background: #fde68a;
  border: 2px solid #f59e0b;
  border-radius: 40px;
  padding: 12px 32px;
}`,
  js: ``,
}

const boxModelFlexbox = chapter({
  overview: 'In this chapter you will learn that every element is a box, and how to control the space inside and around it.',
  points: [
    '📦 Open the box model and see what padding, border and margin really do.',
    '📐 Control the size of a box with width, height and box-sizing.',
    '🎬 Put boxes in a row and a column with flexbox.',
  ],
  objectives: [
    '✅ Draw the box model from memory: content, padding, border, margin.',
    '✅ Tell padding and margin apart with one example each.',
    '✅ Use `box-sizing: border-box` so a width means what you expect.',
    '✅ (Extra) Build a row of boxes that wraps instead of overflowing.',
  ],
  glossary: [
    ['📦 Box Model', 'The rule that every element is a rectangle made of content, padding, border and margin.'],
    ['📏 Padding', 'The empty space between the content of an element and its border.'],
    ['📐 Margin', 'The empty space between one element\'s border and the element next to it.'],
    ['📏 Border', 'The line drawn around the edge of an element, which has a width, a style and a colour.'],
    ['↔️ Flexbox', 'A CSS layout system that places boxes in a row or a column and shares the space between them.'],
    ['📏 Gap', 'The empty space placed between two neighbouring boxes in a flexbox row or column.'],
  ],
  activities: [
    {
      title: 'Every Element Is a Box',
      summary: 'Content, padding, border, margin — four layers, drawn from the inside out, around every single element.',
      steps: [
        '📦 Read the four layers of the box model in the live editor.',
        '🎬 Change the green padding and watch the box grow.',
        '🔍 Point to each layer and say what it separates.',
      ],
      body: [
        'This is the single most useful idea in CSS. Every element on the page — a heading, a paragraph, a picture — is a rectangle made of four layers:',
        '',
        table(
          ['Layer', 'What it separates'],
          [
            ['content', 'The text or the image itself.'],
            ['padding', 'The content and the border. Space **inside** the box.'],
            ['border', 'A visible line drawn around the padding.'],
            ['margin', 'The box and the next box. Space **outside**.'],
          ]
        ),
        '',
        '### 📦 See All Four Layers',
        '',
        embed(maker(boxDemo), 620),
        '',
        'The demo nests four boxes, one inside the next, so each colour shows one layer. Blue is the content, green is the padding, orange is the border, and the pale yellow outside is the margin.',
        '',
        '### 🎬 Change One Layer at a Time',
        '',
        bullets([
          '🎬 Change the green `padding` from 16px to 40px. The box gets **bigger**.',
          '🎬 Change the yellow `margin` from 24px to 0px. The box moves **closer** to its neighbours, but it does not change size.',
          '✅ **Checkpoint:** you can say "padding is inside, margin is outside" without looking it up.',
        ]),
        '',
        callout('💡', 'Padding and margin are the two most-used tools in CSS. Almost every spacing problem you meet later is solved by one of these two properties.'),
      ].join('\n'),
    },
    {
      title: 'Sizing a Box',
      summary: 'Width, height and `box-sizing` decide how big a box is — and one line stops the padding from pushing it wider than you asked.',
      steps: [
        '🎬 Compare the three boxes in the live editor.',
        '🔍 Find the rule that changes how a width is measured.',
        '🎬 Add `box-sizing: border-box` to one box and measure the difference.',
      ],
      body: [
        'By default a CSS `width` measures **only the content**. Any padding and border are added on top, so a box declared `width: 200px` with 40px of padding is really 284px wide on screen.',
        '',
        block('css', `.padded {
  width: 200px;
  padding: 40px;
}`),
        '',
        'Adding `box-sizing: border-box` changes the rule so the width includes padding and border:',
        '',
        block('css', `* {
  box-sizing: border-box;
}`),
        '',
        '### 🎬 Compare Three Boxes',
        '',
        embed(maker(sizingDemo), 620),
        '',
        '- 🔍 The first box has a fixed `width: 200px` — it stays the same size whatever you put inside it.',
        '- 🔍 The second box has big `padding` and no width — it grows with the padding instead.',
        '- 🔍 The third box has a large `border-radius` — 40px is more than half its height, so the corners turn into a pill shape.',
        '',
        bullets([
          '🎬 Set all three boxes to `width: 200px` and watch the second one overflow its row.',
          '🎬 Add `box-sizing: border-box` to the page and watch them all line up.',
          '✅ **Checkpoint:** every box is now exactly the width you asked for, padding included.',
        ]),
        '',
        callout('💡', 'Most real stylesheets start with `* { box-sizing: border-box; }` for exactly this reason. Add it to your own pages too.'),
      ].join('\n'),
    },
    {
      title: 'Rows and Columns with Flexbox',
      summary: 'One property turns a stack into a row — and three more decide where everything sits inside it.',
      steps: [
        '🎬 Build a row of three boxes in the live editor.',
        '🔍 Change `flex-direction` to `column` and run the page.',
        '🎬 Add `flex-wrap: wrap` and shrink the window.',
      ],
      body: [
        block('css', `.row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}`),
        '',
        '| Property | What it controls |',
        '| --- | --- |',
        '| `display: flex` | Turns the element into a flex container |',
        '| `flex-direction` | `row` or `column` — the main direction |',
        '| `justify-content` | Space along the main direction |',
        '| `align-items` | Space across the cross direction |',
        '| `gap` | A fixed space between neighbours |',
        '| `flex-wrap` | Whether the row wraps when it runs out of room |',
        '',
        '### 🎬 Change the Direction',
        '',
        bullets([
          '🎬 Set `flex-direction: column` and watch the three boxes stack downwards.',
          '🎬 Change `justify-content` to `space-between` and see the boxes spread apart.',
          '🎬 Add `flex-wrap: wrap` and make the browser window narrower.',
          '✅ **Checkpoint:** you can predict what happens before you run the page.',
        ]),
        '',
        callout('⚠️', 'On a phone screen there is very little room. Any row of boxes you build should include `flex-wrap: wrap`, or the boxes will be squashed and unreadable.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'A profile card built with the box model, so you can control every part of the space around it.',
      steps: [
        '🎨 Build a card with a header, a photo area and some text.',
        '📐 Control the space with padding on the inside and margin on the outside.',
        '📱 Make it fit a narrow screen without a horizontal scrollbar.',
      ],
      body: [
        '### 🎨 Build a Profile Card',
        '',
        block('html', `<div class="card">
  <div class="photo">JS</div>
  <h2>Your Name</h2>
  <p>Class 7A</p>
  <p class="tag">Coding Club</p>
</div>`),
        '',
        block('css', `.card {
  width: 260px;
  box-sizing: border-box;
  margin: 24px;
  padding: 20px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  text-align: center;
}
.photo {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1e3a8a;
}`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** add a second tag under the first and set the gap between them with margin.',
          '🏆 **Challenge 2:** place two profile cards side by side with flexbox and `flex-wrap: wrap`.',
          '🏆 **Challenge 3:** add a hover rule that lifts the card by 4px using `transform: translateY(-4px)`.',
        ]),
        '',
        '✅ **Final checkpoint:** the card is exactly the width you declared, has padding inside and margin outside, and never overflows a narrow screen.',
      ].join('\n'),
    },
  ],
})

export default { 1103: cssStyling, 1104: coloursFontsText, 1105: boxModelFlexbox }
