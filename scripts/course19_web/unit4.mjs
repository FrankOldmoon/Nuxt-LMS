/** Unit 4 (Interactive Web) intro + chapters 1110, 1111. */
import { maker, embed, block, callout, bullets, table, chapter, unitIntro } from './lib.mjs'

/* ============================================================ 1109 Interactive Web */

const interactiveWeb = unitIntro({
  overview: 'This unit is where a page starts answering back. You will learn to write reusable functions, to find pieces of the page, and to react to what people do.',
  points: [
    '🧩 Write functions that take an input and give back an answer.',
    '🔍 Find any element on the page and change what it says.',
    '🖱️ React to clicks, typing and form submission.',
  ],
  objectives: [
    '✅ Write a function that takes parameters and returns a value.',
    '✅ Find an element with `getElementById` and change its text or style.',
    '✅ Attach a handler to a click, an input and a form submit.',
    '✅ (Extra) Build one page that reacts to several kinds of user action.',
  ],
  glossary: [
    ['🧩 Function', 'A named block of code that takes some input, does a job, and can hand a value back.'],
    ['📥 Parameter', 'The named value a function receives when it is called, used inside the function body.'],
    ['📤 Return Value', 'The value a function sends back to whoever called it.'],
    ['🌳 DOM', 'The live tree of every element on a page, which JavaScript can read and change.'],
    ['🖱️ Event', 'Something a person does on a page, such as a click or typing, that the page can listen for.'],
    ['🎛️ Event Handler', 'A function attached to an element, run automatically when that element fires an event.'],
  ],
  sections: [
    {
      title: '🗺️ What This Unit Covers',
      summary: 'Two chapters that turn a page which merely displays things into a page that responds to the person using it.',
      steps: [
        '📖 Read the chapter list below before you start.',
        '🧩 Work through both chapters in order — they build directly on each other.',
        '🏆 Finish the extra challenge in the last chapter to earn the unit badge.',
      ],
      body: table(
        ['Chapter', 'What you will do'],
        [
          ['4.1 Functions and the DOM', '🧩 Package your code into functions, then find and change any element on the page.'],
          ['4.2 Event Handlers', '🖱️ React to clicks, typing and form submission with event listeners.'],
        ]
      ) + callout('💡', 'This unit is the heart of the course. Everything so far has been about making a page; from here on you are making an application.'),
    },
  ],
})

/* ============================================================ 1110 Functions and the DOM */

const fnDemo = {
  html: `<p>Try both of them:</p>
<input id="n1" type="number" value="7" aria-label="first number">
<input id="n2" type="number" value="5" aria-label="second number">
<button onclick="show('sum')">Add</button>
<button onclick="show('double')">Double</button>
<button onclick="show('both')">Show both</button>
<p id="out">—</p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
input, button {
  font-size: 15px;
  padding: 6px 10px;
  margin: 4px 0;
}
#out {
  font-size: 18px;
}`,
  js: `function add(a, b) {
  return a + b
}

function double(n) {
  return n * 2
}

function readValues() {
  return [
    Number(document.getElementById('n1').value),
    Number(document.getElementById('n2').value)
  ]
}

function show(mode) {
  const [a, b] = readValues()
  let text
  if (mode === 'sum') text = 'Sum: ' + add(a, b)
  else if (mode === 'double') text = 'Doubled: ' + double(a) + ', ' + double(b)
  else text = 'Sum: ' + add(a, b) + ' · Doubled: ' + double(a) + ', ' + double(b)
  document.getElementById('out').textContent = text
}`,
}

const domDemo = {
  html: `<h2 id="title">Original title</h2>
<p id="counter">Count: 0</p>
<button id="go">Change the page</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
button {
  padding: 8px 14px;
  font-size: 15px;
}
h2 {
  color: #1d4ed8;
}`,
  js: `const title = document.getElementById('title')
const counter = document.getElementById('counter')
let n = 0

document.getElementById('go').onclick = () => {
  n = n + 1
  title.textContent = 'Changed ' + n + ' time(s)'
  title.style.color = '#dc2626'
  counter.textContent = 'Count: ' + n
}`,
}

const functionsDom = chapter({
  overview: 'In this chapter you will learn to package your code into functions, and then use JavaScript to find and change anything on the page.',
  points: [
    '🧩 Write a function that takes input and hands back an answer.',
    '🔍 Find an element on the page and change its text or its style.',
    '🎬 Build one button that changes several parts of the page at once.',
  ],
  objectives: [
    '✅ Write a function with parameters and a `return` value.',
    '✅ Explain why a function should return a value instead of printing it.',
    '✅ Use `getElementById` to find an element and change its text and style.',
    '✅ (Extra) Build a button that updates three different parts of a page.',
  ],
  glossary: [
    ['🧩 Function', 'A named block of code that takes some input, does a job, and can hand a value back.'],
    ['📥 Parameter', 'The named value a function receives when it is called, used inside the function body.'],
    ['📤 Return Value', 'The value a function sends back to whoever called it.'],
    ['🌳 DOM', 'The live tree of every element on a page, which JavaScript can read and change.'],
    ['🎯 Element Reference', 'A variable holding the one element you want to work with, found once and reused.'],
    ['🪟 Window Object', 'The top-level object in the browser, which holds the document and every global function.'],
  ],
  activities: [
    {
      title: 'Functions That Answer Back',
      summary: 'A function takes some input, does one job, and hands a value back to whoever asked.',
      steps: [
        '🧩 Read the two small functions in the live editor.',
        '🎬 Change the input numbers and press all three buttons.',
        '🔍 Find where each answer is written into the page.',
      ],
      body: [
        block('js', `function add(a, b) {
  return a + b
}

const total = add(3, 5)   // total is now 8`),
        '',
        '- 📥 `a` and `b` are **parameters** — the names the function receives.',
        '- 📤 `return a + b` sends the answer back to the line that called the function.',
        '- 🧩 The function does not print anything itself. It only knows how to answer.',
        '',
        '### 🧩 Call One Function From Another',
        '',
        'The demo builds a small calculation out of two simple functions. Notice that `show()` does not do the arithmetic — it asks `add()` and `double()` and writes the answers on the page.',
        '',
        embed(maker(fnDemo), 620),
        '',
        '### 🔍 Why `return` Instead of Printing',
        '',
        table(
          ['Approach', 'Problem'],
          [
            ['Printing inside the function', 'You cannot reuse the answer anywhere else on the page.'],
            ['Returning the value', 'The caller decides what to do with it, and can use it again.'],
          ]
        ),
        '',
        bullets([
          '🧩 Write a function `subtract(a, b)` that returns the difference.',
          '🎬 Wire it into a fourth button, then press all four buttons in one session.',
          '✅ **Checkpoint:** `add` and `subtract` know nothing about the page — all page work happens in the caller.',
        ]),
        '',
        callout('💡', 'A function that only does maths is far easier to test and reuse than one that changes a page. When a function starts reaching into the page, that is usually a sign it should be split in two.'),
      ].join('\n'),
    },
    {
      title: 'Finding and Changing the Page',
      summary: 'The DOM is every element on the page, live. Ask it for an element by id and you can change what it says or how it looks.',
      steps: [
        '🔍 Find the two element references in the live editor.',
        '🎬 Press the button and watch three parts of the page change.',
        '🎨 Change one line of style code and run it again.',
      ],
      body: [
        block('js', `const title = document.getElementById('title')
title.textContent = 'A new title'
title.style.color = 'red'`),
        '',
        bullets([
          '- 🔍 `document.getElementById(\'title\')` looks up the element whose `id` is `title`.',
          '- 📝 `textContent` replaces the text **inside** the element.',
          '- 🎨 `style.color` writes one CSS property straight onto the element.',
        ]),
        '',
        '### 🔍 Two Ways to Find an Element',
        '',
        table(
          ['Method', 'Finds', 'Use when'],
          [
            ['`getElementById(\'x\')`', 'One element by its `id`', 'The `id` is unique — always the fastest choice.'],
            ['`querySelector(\'.card\')`', 'The first match for a CSS selector', 'You want by class or by tag name.'],
          ]
        ),
        '',
        '### 🎬 Change the Page With One Click',
        '',
        embed(maker(domDemo), 620),
        '',
        bullets([
          '🎬 Press the button and watch the heading, its colour and the counter all change at once.',
          '🔍 Find the line that changes the colour, and change it to green.',
          '🧪 Change the id in the HTML to something else without changing the JavaScript — read the error, and see why the two must match.',
          '✅ **Checkpoint:** your code changes the heading text, the heading colour and the paragraph, using one stored reference each.',
        ]),
        '',
        callout('⚠️', '`innerHTML` and `textContent` are not the same. `textContent` shows a `<` as a character; `innerHTML` treats it as the start of a tag. Use `textContent` unless you really do want to insert markup.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'A tip calculator that reads two amounts and shows the result, the percentage and a sentence.',
      steps: [
        '🧩 Write one function per calculation, not one long function.',
        '🔍 Have each function return its answer instead of printing it.',
        '🎨 Show the sentence in a colour that depends on the amount.',
      ],
      body: [
        '### 🎬 Build a Tip Calculator',
        '',
        block('html', `<p>Bill amount: <input id="bill" type="number" value="100"></p>
<p>Tip percent: <input id="tip" type="number" value="10"></p>
<button onclick="calculate()">Calculate</button>
<p id="lines">—</p>
<p id="message">—</p>`),
        '',
        block('js', `function tipAmount(bill, percent) {
  return bill * percent / 100
}

function total(bill, percent) {
  return bill + tipAmount(bill, percent)
}

function messageFor(t) {
  if (t >= 120) return 'That is a generous tip.'
  if (t >= 100) return 'Thank you!'
  return 'A smaller tip today.'
}

function calculate() {
  const bill = Number(document.getElementById('bill').value)
  const percent = Number(document.getElementById('tip').value)

  document.getElementById('lines').textContent =
    'Tip: ' + tipAmount(bill, percent) + ' · Total: ' + total(bill, percent)
  document.getElementById('message').textContent = messageFor(total(bill, percent))
}`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** add a function that splits the total evenly between two people.',
          '🏆 **Challenge 2:** show the message in green, amber or red depending on the percentage.',
          '🏆 **Challenge 3:** show a warning when the tip percent is below 10, without changing the calculation.',
        ]),
        '',
        '✅ **Final checkpoint:** four separate functions, each returning a value, and one function that writes the answers into the page.',
      ].join('\n'),
    },
  ],
})

/* ============================================================ 1111 Event Handlers */

const clickDemo = {
  html: `<button id="one">Count clicks</button>
<p id="out">Clicks: 0</p>
<hr>
<input id="name" placeholder="Type your name">
<button id="shout">Shout it</button>
<p id="greet">—</p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
button, input {
  font-size: 15px;
  padding: 8px 12px;
}
hr {
  margin: 28px 0;
  border: none;
  border-top: 1px solid #e2e8f0;
}`,
  js: `let clicks = 0
const out = document.getElementById('out')

document.getElementById('one').addEventListener('click', function () {
  clicks = clicks + 1
  out.textContent = 'Clicks: ' + clicks
})

const nameBox = document.getElementById('name')

document.getElementById('shout').addEventListener('click', function () {
  document.getElementById('greet').textContent = 'HELLO ' + nameBox.value.toUpperCase() + '!'
})`,
}

const formDemo = {
  html: `<form id="signup">
  <p>Name: <input id="fname" required></p>
  <p>Class: <input id="fclass" required></p>
  <button type="submit">Sign up</button>
</form>
<p id="summary">—</p>
<ul id="list"></ul>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
input, button {
  font-size: 15px;
  padding: 6px 10px;
}
li {
  margin: 4px 0;
}`,
  js: `const names = []

document.getElementById('signup').addEventListener('submit', function (e) {
  e.preventDefault()

  const name = document.getElementById('fname').value
  const cls = document.getElementById('fclass').value

  names.push(name + ' (' + cls + ')')
  render()
  e.target.reset()
})

function render() {
  const list = document.getElementById('list')
  list.innerHTML = ''
  for (const n of names) {
    const li = document.createElement('li')
    li.textContent = n
    list.appendChild(li)
  }
  document.getElementById('summary').textContent =
    names.length + ' signed up'
}`,
}

const eventHandlers = chapter({
  overview: 'In this chapter you will make a page listen to what people do — clicking buttons, typing, and filling in a form.',
  points: [
    '🖱️ Attach a handler to a click and count how many times it happens.',
    '⌨️ Read what somebody has typed into a text box.',
    '📋 Handle a form submit and build a list from the answers.',
  ],
  objectives: [
    '✅ Attach a handler with `addEventListener` and remove it again.',
    '✅ Read the current value of a text box and use it in a calculation.',
    '✅ Handle a form submit, stop the page reloading, and read every field.',
    '✅ (Extra) Build a list that grows as people sign up.',
  ],
  glossary: [
    ['🖱️ Event', 'Something a person does on a page, such as a click or typing, that the page can listen for.'],
    ['🎛️ Event Handler', 'A function attached to an element, run automatically when that element fires an event.'],
    ['📡 Event Listener', 'The call that attaches a handler to an element and a named event.'],
    ['📝 Form Submit', 'The event fired when a person presses the button that sends a form.'],
    ['🚫 preventDefault', 'A method that stops the browser doing its usual next step, such as reloading the page.'],
    ['➕ createElement', 'A DOM method that makes a brand new element which is not yet on the page.'],
  ],
  activities: [
    {
      title: 'Listening for a Click',
      summary: 'An event listener is a promise: "when this thing happens, run this code".',
      steps: [
        '🖱️ Press the counter button five times in the live editor.',
        '🔍 Find the counter variable and watch it grow.',
        '🎯 Change the event name from `click` to something else and predict the result.',
      ],
      body: [
        block('js', `document.getElementById('one').addEventListener('click', function () {
  clicks = clicks + 1
  out.textContent = 'Clicks: ' + clicks
})`),
        '',
        'The listener takes two things: the **name of the event** to wait for, and the **function** to run when it happens.',
        '',
        '### 🖱️ Two Buttons, Two Jobs',
        '',
        embed(maker(clickDemo), 620),
        '',
        'The second button reads the text box and writes a new sentence into the page. The value in a text box is always a **string**, which is why the name gets `.toUpperCase()` applied to it directly.',
        '',
        '### 🎛️ Events You Will Use Most',
        '',
        table(
          ['Event', 'Fires when'],
          [
            ['`click`', 'The element is clicked.'],
            ['`input`', 'The text in a box changes — fires on every keystroke.'],
            ['`change`', 'A box loses focus after its value changed.'],
            ['`submit`', 'A form is sent.'],
            ['`keydown`', 'Any key is pressed.'],
          ]
        ),
        '',
        '### 🔍 Reading What Somebody Typed',
        '',
        block('js', `const box = document.getElementById('name')
box.addEventListener('input', function () {
  console.log('so far:', box.value)
})`),
        '',
        bullets([
          '🎬 Press the counter and watch the variable in the code grow.',
          '⌨️ Type in the name box, then press Shout — the page uses exactly what you typed.',
          '🗑️ Add a listener that stops listening, using `removeEventListener` with the **same** function reference.',
          '✅ **Checkpoint:** you can name the event and the function in your own listener, and explain what runs first.',
        ]),
      ].join('\n'),
    },
    {
      title: 'Forms and New Elements',
      summary: 'A form collects answers. A submit handler reads them, stops the page jumping, and builds something new.',
      steps: [
        '📋 Sign up two people in the live editor.',
        '🔍 Find the line that stops the page from reloading.',
        '🎬 Add a third sign-up and check the count.',
      ],
      body: [
        block('js', `form.addEventListener('submit', function (e) {
  e.preventDefault()
  const name = document.getElementById('fname').value
  // ... do something with the value
})`),
        '',
        bullets([
          '- 📝 `e.preventDefault()` stops the browser reloading the page — without it, everything you built is lost.',
          '- 📋 `form.reset()` clears every field once you have read the answers.',
          '- ➕ `document.createElement(\'li\')` makes a new element that is not on the page yet.',
          '- 🌳 `list.appendChild(li)` puts it into the list, where everyone can see it.',
        ]),
        '',
        '### 📋 Build a Sign-Up List',
        '',
        embed(maker(formDemo), 620),
        '',
        '### 🔍 Why the List Is Built From Scratch',
        '',
        'The `render()` function empties the list and rebuilds it from the array every single time. That looks wasteful, and it is the **simplest correct approach**: the array is the truth, and the page is just a picture of it.',
        '',
        bullets([
          '🎬 Sign two people up — the count updates and both names appear.',
          '🔍 Add a third sign-up and confirm the list grows.',
          '🧩 Change `render()` to also show the class of each person in a second line.',
          '✅ **Checkpoint:** the page never reloads, every field is read, and the list matches the array exactly.',
        ]),
        '',
        callout('💡', 'Keeping data in a variable and redrawing the page from it is called **rendering from state**. Every real web app is built this way, and this is the first time you are doing it.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'An interactive quiz that marks each answer the moment it is chosen.',
      steps: [
        '🎮 Build one question with three options in the live editor.',
        '✅✅ Show correct and wrong feedback as soon as an option is clicked.',
        '🎬 Add a second question and a running score.',
      ],
      body: [
        '### 🎮 Build a One-Question Quiz',
        '',
        block('html', `<h2>Which language styles a page?</h2>
<button class="opt" data-ok="0">HTML</button>
<button class="opt" data-ok="1">CSS</button>
<button class="opt" data-ok="0">JavaScript</button>
<p id="feedback">Pick an answer.</p>`),
        '',
        block('js', `let score = 0
const buttons = document.querySelectorAll('.opt')

for (const btn of buttons) {
  btn.addEventListener('click', function () {
    const feedback = document.getElementById('feedback')
    const right = btn.dataset.ok === '1'

    if (right) {
      score = score + 1
      feedback.textContent = 'Correct! Score: ' + score
      feedback.style.color = '#16a34a'
    } else {
      feedback.textContent = 'Not quite — CSS is the styling language.'
      feedback.style.color = '#dc2626'
    }
  })
}`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** disable the buttons after one click so the question can only be answered once.',
          '🏆 **Challenge 2:** add a second question and keep one running score across both.',
          '🏆 **Challenge 3:** store the questions in an array and build the buttons with a loop instead of writing them by hand.',
        ]),
        '',
        '✅ **Final checkpoint:** each option is one listener, feedback appears immediately, and the score is stored in a variable rather than in the page.',
      ].join('\n'),
    },
  ],
})

export default { 1109: interactiveWeb, 1110: functionsDom, 1111: eventHandlers }
