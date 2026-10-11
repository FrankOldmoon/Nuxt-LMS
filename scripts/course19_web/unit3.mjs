/** Unit 3 (JavaScript Basics) intro + chapters 1107, 1108. */
import { maker, embed, block, callout, bullets, table, chapter, unitIntro } from './lib.mjs'

/* ============================================================ 1106 JavaScript Basics */

const jsBasics = unitIntro({
  overview: 'This unit is the part that makes a page alive. You will learn to store data, make decisions and repeat work automatically.',
  points: [
    '⚡ Store values in variables and decide what happens next.',
    '🔁 Repeat work with loops over lists of things.',
  ],
  objectives: [
    '✅ Store text and numbers in named variables and update them.',
    '✅ Make a program take a different path with `if` and `else`.',
    '✅ Repeat work with a `for` loop and with `forEach`.',
    '✅ (Extra) Combine a loop, a condition and an array into one small program.',
  ],
  glossary: [
    ['⚡ JavaScript Variable', 'A named container that stores a value so the same data can be reused and changed later in a script.'],
    ['🔢 Number', 'A JavaScript value used for counting and calculating, written without quotation marks.'],
    ['💬 String', 'A JavaScript value used for text, always written inside single or double quotation marks.'],
    ['🔀 Conditional Statement', 'A piece of code that chooses which block runs next by testing whether a value is true or false.'],
    ['🔁 Loop', 'A block of code that the computer runs over and over, once for each item in a list.'],
    ['📋 Array', 'An ordered list of values stored in a single variable, written inside square brackets.'],
  ],
  sections: [
    {
      title: '🗺️ What This Unit Covers',
      summary: 'Two chapters that turn a page that only displays things into a page that calculates and repeats.',
      steps: [
        '📖 Read the chapter list below before you start.',
        '⚡ Work through both chapters in order.',
        '🏆 Finish the extra challenge in the last chapter to earn the unit badge.',
      ],
      body: table(
        ['Chapter', 'What you will do'],
        [
          ['3.1 Variables and Decisions', '⚡ Store values in variables and let the program choose a path with if and else.'],
          ['3.2 Loops and Arrays', '🔁 Store a whole list in one variable and run through it with a loop.'],
        ]
      ) + callout('💡', 'Everything in this unit happens inside the JavaScript pane of the Web Maker. Nothing you write here changes the HTML — it only changes the page once the code runs.'),
    },
  ],
})

/* ============================================================ 1107 Variables and Decisions */

const varsDemo = {
  html: `<p>Name: <b id="name">—</b></p>
<p>Score: <b id="score">—</b></p>
<p>Passed: <b id="passed">—</b></p>
<button onclick="update()">Run the code</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
button {
  padding: 8px 16px;
  font-size: 15px;
}
p {
  font-size: 17px;
}`,
  js: `let name = 'Alex'
let score = 78

function update() {
  const passed = score >= 60
  document.getElementById('name').textContent = name
  document.getElementById('score').textContent = score
  document.getElementById('passed').textContent = passed ? 'Yes' : 'No'
}`,
}

const decisionDemo = {
  html: `<p>Enter your score:</p>
<input id="mark" type="number" value="72">
<button onclick="grade()">Show my grade</button>
<p id="out">—</p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
input, button {
  font-size: 15px;
  padding: 6px 10px;
}
#out {
  font-size: 20px;
  font-weight: bold;
}`,
  js: `function grade() {
  const mark = Number(document.getElementById('mark').value)
  let result

  if (mark >= 90) {
    result = 'A — outstanding'
  } else if (mark >= 75) {
    result = 'B — very good'
  } else if (mark >= 60) {
    result = 'C — passed'
  } else {
    result = 'F — try again'
  }

  document.getElementById('out').textContent = result
}`,
}

const variablesDecisions = chapter({
  overview: 'In this chapter you will learn to store data in variables and to make a program choose between different outcomes.',
  points: [
    '⚡ Store text and numbers in named variables and update them.',
    '🔍 Tell the difference between a string and a number.',
    '🔀 Make the program take a different path with if and else.',
  ],
  objectives: [
    '✅ Create variables with `let` and `const` and explain when to use each.',
    '✅ Write a number and a string correctly and spot the difference.',
    '✅ Run an `if / else if / else` chain and change the threshold.',
    '✅ (Extra) Read a score from a text box and turn it into a grade.',
  ],
  glossary: [
    ['⚡ JavaScript Variable', 'A named container that stores a value so the same data can be reused and changed later in a script.'],
    ['💬 String', 'A JavaScript value used for text, always written inside single or double quotation marks.'],
    ['🔢 Number', 'A JavaScript value used for counting and calculating, written without quotation marks.'],
    ['🔀 Conditional Statement', 'A piece of code that chooses which block runs next by testing whether a value is true or false.'],
    ['🎚️ Boolean', 'A value with only two possible states, true or false, used for every decision a program makes.'],
    ['🔄 Type Conversion', 'Turning a value from one type into another, such as changing text into a number with Number.'],
  ],
  activities: [
    {
      title: 'Storing Things in Variables',
      summary: 'A variable is a labelled box. You put a value in, and you can change or read it at any time.',
      steps: [
        '⚡ Read the two values and the one name in the live editor.',
        '🎬 Change the score to 45 and run the code.',
        '🔍 Predict whether the page still says "Yes" before you run it.',
      ],
      body: [
        block('js', `let name = 'Alex'
let score = 78`),
        '',
        '| Keyword | Meaning |',
        '| --- | --- |',
        '| `let` | A value that **will** change later — a score, a name, a counter. |',
        '| `const` | A value that will **not** change. Use this by default. |',
        '',
        '### 💬 Strings and Numbers Look Similar',
        '',
        'The quotation marks are what separate them. These two lines are not the same:',
        '',
        block('js', `let a = 78     // a number
let b = '78'   // a string of two characters

a + a   // 156 — numbers are added
b + b   // 7878 — strings are joined together`),
        '',
        '⚠️ This is the single most common bug in beginner JavaScript: reading a value from a text box always gives you a **string**, so `score >= 60` compares the wrong thing. Wrap it in `Number()` first.',
        '',
        '### ⚡ Run a Variable Watcher',
        '',
        embed(maker(varsDemo), 620),
        '',
        'The function reads the variables and writes them into the page. Change the score and press the button again — the page updates because the code ran again.',
        '',
        bullets([
          '🎬 Change `score` to 45 and run. Predict first, then check.',
          '🔧 Change `let score = 78` to `const score = 78` and try to change it with `score = 45` in the function — read the error message.',
          '✅ **Checkpoint:** you can explain why `Number()` is needed for values that come from a text box.',
        ]),
      ].join('\n'),
    },
    {
      title: 'Making Decisions',
      summary: '`if` asks a yes-or-no question. `else` covers the answer you did not expect.',
      steps: [
        '🔀 Read the four-way decision in the live editor.',
        '🎬 Type 45 into the box and press the button.',
        '🎬 Change the `60` threshold to `80` and run it again.',
      ],
      body: [
        block('js', `if (score >= 60) {
  result = 'passed'
} else {
  result = 'failed'
}`),
        '',
        'A condition uses **comparison** operators, and the value is a **boolean**:',
        '',
        table(
          ['Operator', 'Reads as', 'Example'],
          [
            ['`===`', 'is exactly equal to', "`grade === 'A'`"],
            ['`!==`', 'is not equal to', "`grade !== 'A'`"],
            ['`>=`', 'is greater than or equal to', '`score >= 60`'],
            ['`<`', 'is less than', '`score < 60`'],
          ]
        ),
        '',
        '⚠️ Always use `===` and `!==`, never `==` and `!=`. The single-equals version quietly converts types and produces bugs that are very hard to find.',
        '',
        '### 🔀 Build a Grade Checker',
        '',
        embed(maker(decisionDemo), 620),
        '',
        '### 🔍 Read the Chain From the Top',
        '',
        'The four `if / else if / else` blocks are checked **in order**, and the first true one wins. The chain above works because `90` is tested before `75` — if you swap them, everyone gets an A.',
        '',
        bullets([
          '🎬 Enter `45` and press the button — you get the final `else`.',
          '🔧 Change the `60` to `80`, then try a score of `72` again.',
          '✅ **Checkpoint:** you can point to the line that runs for a score of `92`, and say why the later blocks are skipped.',
        ]),
        '',
        callout('💡', 'An `if / else` chain is just a series of yes-or-no questions. When a chain gets longer than about four branches, it is usually time for a different tool — such as a lookup table.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'A number-guessing game that stores your guess, checks it, and tells you what to do next.',
      steps: [
        '🎮 Build the game in the live editor.',
        '🔍 Add a third hint for guesses that are too low.',
        '🎬 Make the game say how many tries you needed.',
      ],
      body: [
        '### 🎮 Build a Guessing Game',
        '',
        'The computer picks a secret number. The player types a guess, and the program stores it, checks it, and gives a hint.',
        '',
        block('js', `const secret = 42
let tries = 0

function guess() {
  const input = document.getElementById('guess')
  const value = Number(input.value)
  const out = document.getElementById('out')

  tries = tries + 1

  if (value === secret) {
    out.textContent = 'Correct! You needed ' + tries + ' tries.'
  } else if (value > secret) {
    out.textContent = 'Too high — try a smaller number.'
  } else {
    out.textContent = 'Too low — try a bigger number.'
  }

  input.value = ''
}`),
        '',
        block('html', `<p>Guess a number between 1 and 100</p>
<input id="guess" type="number">
<button onclick="guess()">Guess</button>
<p id="out">—</p>`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** start a `tries` counter and report it when the player wins.',
          '🏆 **Challenge 2:** pick a new random secret number each game with `Math.floor(Math.random() * 100) + 1`.',
          '🏆 **Challenge 3:** stop counting the tries and show the last guess as well.',
        ]),
        '',
        '✅ **Final checkpoint:** your game stores the guess in a variable, uses a comparison, and gives different feedback for high, low and correct.',
      ].join('\n'),
    },
  ],
})

/* ============================================================ 1108 Loops and Arrays */

const arrayDemo = {
  html: `<p>Fruits in the basket:</p>
<p id="list">—</p>
<button onclick="show()">Show the list</button>
<button onclick="longest()">Which name is longest?</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
button {
  padding: 8px 14px;
  font-size: 15px;
  margin-right: 8px;
}
#list {
  font-size: 18px;
}`,
  js: `const fruits = ['apple', 'banana', 'cherry']

function show() {
  let text = ''
  for (let i = 0; i < fruits.length; i++) {
    text += fruits[i] + ' · '
  }
  document.getElementById('list').textContent = text
}

function longest() {
  let best = fruits[0]
  for (const f of fruits) {
    if (f.length > best.length) {
      best = f
    }
  }
  document.getElementById('list').textContent = 'Longest: ' + best
}`,
}

const counterDemo = {
  html: `<p>Multiples of 3 up to 30:</p>
<p id="out">—</p>
<button onclick="run()">Run the loop</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
button {
  padding: 8px 14px;
  font-size: 15px;
}
#out {
  line-height: 1.8;
}`,
  js: `function run() {
  let text = ''
  for (let n = 3; n <= 30; n = n + 3) {
    text += n + '  '
  }
  document.getElementById('out').textContent = text
}`,
}

const loopsArrays = chapter({
  overview: 'In this chapter you will learn to keep a whole list of things in one variable, and to repeat work once for each item.',
  points: [
    '📋 Store several values in one array.',
    '🔁 Run through an array with a for loop.',
    '🎬 Repeat an action on every item with forEach.',
  ],
  objectives: [
    '✅ Create an array and read an item out of it by its position.',
    '✅ Write a `for` loop that visits every item in an array.',
    '✅ Use `forEach` when you only need each item, not its position.',
    '✅ (Extra) Find the largest or longest value in an array with one loop.',
  ],
  glossary: [
    ['📋 Array', 'An ordered list of values stored in a single variable, written inside square brackets.'],
    ['🔁 Loop', 'A block of code that the computer runs over and over, once for each item in a list.'],
    ['🔢 Index', 'The position of an item in an array, counting from zero for the first item.'],
    ['📐 Length', 'The number of items in an array, read with the length property.'],
    ['🎯 Iterator', 'The variable that holds the current position while a loop walks through a list.'],
    ['📦 Spread', 'The three dots that turn an array into separate values, used to pass a list into a function.'],
  ],
  activities: [
    {
      title: 'A List in One Variable',
      summary: 'An array keeps many values in order, and you can reach any one of them by its position.',
      steps: [
        '📋 Read the array and count its items in the live editor.',
        '🔍 Predict what `fruits[0]` and `fruits[1]` are.',
        '🎬 Push a new fruit onto the end of the list.',
      ],
      body: [
        block('js', `const fruits = ['apple', 'banana', 'cherry']

fruits[0]          // 'apple'  — counting starts at zero
fruits[2]          // 'cherry'
fruits.length      // 3 — how many items there are
fruits.push('date')  // adds an item to the end`),
        '',
        '⚠️ **Counting starts at zero.** With three items the valid positions are 0, 1 and 2. Asking for `fruits[3]` gives `undefined` — the code does not crash, it just quietly gives you nothing.',
        '',
        '### 📋 Read a List Out Loud',
        '',
        embed(maker(arrayDemo), 620),
        '',
        '### 🔍 What `length` Is Doing',
        '',
        'The `for` loop in the demo uses three moving parts:',
        '',
        block('js', `for (let i = 0; i < fruits.length; i++) {
  // i starts at 0
  // keep going while i is smaller than the number of items
  // add 1 to i each time round
}`),
        '',
        bullets([
          '🔍 `let i = 0` — where the counter starts.',
          '🔍 `i < fruits.length` — the condition that keeps the loop running.',
          '🔍 `i++` — the small step at the end of every turn.',
          '✅ **Checkpoint:** you can say why the loop runs exactly three times.',
        ]),
      ].join('\n'),
    },
    {
      title: 'Loops That Do the Work',
      summary: 'A loop lets you write something once and run it many times — over a list, or over a range of numbers.',
      steps: [
        '🔁 Count the multiples of three in the live editor.',
        '🎬 Change the starting number to 5 and run the page.',
        '💡 Compare the `for` loop with a `forEach` loop.',
      ],
      body: [
        block('js', `for (let n = 3; n <= 30; n = n + 3) {
  text += n + '  '
}`),
        '',
        'The same shape works for a range of numbers as for a list of items — only the condition and the step change.',
        '',
        '### 🔁 Run a Number Loop',
        '',
        embed(maker(counterDemo), 620),
        '',
        '### 🎬 forEach: The Shorter Way',
        '',
        'When you only need each item and not its position, `forEach` says the same thing in one line:',
        '',
        block('js', `fruits.forEach(function (fruit) {
  console.log(fruit)
})`),
        '',
        '| Choose | When |',
        '| --- | --- |',
        '| `for` loop | You need the position, or the loop is over numbers. |',
        '| `forEach` | You need each item in turn and nothing else. |',
        '',
        '### 🏆 Why Loops Matter',
        '',
        bullets([
          '🖱️ Without a loop, ten items mean ten almost-identical lines of code.',
          '🔁 With a loop, ten items mean one block that works for any number of them.',
          '✅ **Checkpoint:** your loop can handle a list of 3 items and a list of 30 with the same code.',
        ]),
        '',
        callout('💡', 'A `for` loop with `text += something` inside is the most common way to build a piece of text from a list. You will use it constantly in the projects unit.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'A class list that reports the highest score, the average, and every name above the average.',
      steps: [
        '📋 Build the score list in the live editor.',
        '🔁 Write one loop that finds the highest score.',
        '🎬 Show only the names scoring above the average.',
      ],
      body: [
        '### 📋 Build a Class Score Report',
        '',
        'Store the scores in an array, then use loops to work them out. Try not to repeat yourself — each number should be read from the array, never typed again.',
        '',
        block('js', `const scores = [72, 88, 65, 95, 54, 81]

function highest() {
  let best = scores[0]
  for (const s of scores) {
    if (s > best) {
      best = s
    }
  }
  return best
}

function average() {
  let total = 0
  for (const s of scores) {
    total = total + s
  }
  return total / scores.length
}`),
        '',
        '### 🏆 Three Extra Challenges',
        '',
        bullets([
          '🏆 **Challenge 1:** add a loop that counts how many scores are below 60.',
          '🏆 **Challenge 2:** find the highest score **and** the name that goes with it.',
          '🏆 **Challenge 3:** sort the scores from highest to lowest before printing them.',
        ]),
        '',
        '### 🔍 Challenge Hint',
        '',
        'Sorting without a built-in function means comparing neighbouring items and swapping them when they are in the wrong order. That is called a bubble sort, and writing it yourself is one of the best exercises in this unit.',
        '',
        '✅ **Final checkpoint:** your report uses a loop for every calculation, and no score is written twice in the code.',
      ].join('\n'),
    },
  ],
})

export default { 1106: jsBasics, 1107: variablesDecisions, 1108: loopsArrays }
