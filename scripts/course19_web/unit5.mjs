/** Unit 5 (Projects) intro + chapters 1113, 1114. */
import { maker, embed, block, callout, bullets, table, chapter, unitIntro } from './lib.mjs'

/* ============================================================ 1112 Projects */

const projects = unitIntro({
  overview: 'This unit is where everything comes together. You will build two complete applications from an empty editor, using every skill from the course.',
  points: [
    '🎮 Build a quiz app that marks answers and keeps a score.',
    '📝 Build a todo list that adds, completes and removes tasks.',
  ],
  objectives: [
    '✅ Plan an app as three layers: data, logic and display.',
    '✅ Build a quiz that marks each answer immediately and keeps a running score.',
    '✅ Build a list that adds, completes and removes items.',
    '✅ (Extra) Add one feature to either project that was not in the original plan.',
  ],
  glossary: [
    ['📦 State', 'The data a program is holding right now, usually stored in variables or an array.'],
    ['🎨 Render', 'Drawing the page from the current state, so the screen always matches the data.'],
    ['🧩 Component', 'A reusable piece of a page that has its own data and its own behaviour.'],
    ['🎯 Feature', 'One thing an app can do, such as marking a quiz answer or removing a task.'],
    ['💾 Local Storage', 'A small store inside the browser that keeps data after the page is closed.'],
    ['🐛 Bug', 'A problem where the code runs but does the wrong thing, or stops working part-way.'],
  ],
  sections: [
    {
      title: '🗺️ What This Unit Covers',
      summary: 'Two chapters, each one complete application built from nothing.',
      steps: [
        '📖 Read the chapter list below before you start.',
        '🧩 Build each project yourself before reading the walkthrough.',
        '🏆 Add your own feature to at least one of them.',
      ],
      body: table(
        ['Chapter', 'What you build'],
        [
          ['5.1 Project: Quiz App', '🎮 A quiz that takes input, marks each answer and keeps a score.'],
          ['5.2 Project: Todo List', '📝 A list that adds, completes, removes and remembers your tasks.'],
        ]
      ) + callout('💡', 'For both projects the structure is the same: keep the answers in a variable, write one function that draws the page from it, and let a button call that function again.'),
    },
  ],
})

/* ============================================================ 1113 Project: Quiz App */

const quizDemo = {
  html: `<div id="quiz"></div>
<p id="score">Score: 0</p>
<button id="again">Start again</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  max-width: 520px;
}
.question {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
}
button {
  display: block;
  width: 100%;
  text-align: left;
  font-size: 15px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}
button.right { border-color: #16a34a; background: #dcfce7; }
button.wrong { border-color: #dc2626; background: #fee2e2; }
#score { font-weight: bold; }
#again { width: auto; margin-top: 8px; }`,
  js: `const questions = [
  {
    q: 'Which language structures a page?',
    options: ['HTML', 'CSS', 'JavaScript'],
    answer: 0
  },
  {
    q: 'Which property changes the colour of text?',
    options: ['colour', 'color', 'font'],
    answer: 1
  },
  {
    q: 'What does a for loop do?',
    options: ['Runs once', 'Repeats a block', 'Deletes code'],
    answer: 1
  }
]

let index = 0
let score = 0

function render() {
  const box = document.getElementById('quiz')
  box.innerHTML = ''

  if (index >= questions.length) {
    box.textContent = 'Finished! You scored ' + score + ' out of ' + questions.length + '.'
    return
  }

  const item = questions[index]
  const title = document.createElement('p')
  title.className = 'question'
  title.textContent = (index + 1) + '. ' + item.q
  box.appendChild(title)

  item.options.forEach(function (text, i) {
    const btn = document.createElement('button')
    btn.textContent = text
    btn.addEventListener('click', function () {
      if (i === item.answer) {
        btn.classList.add('right')
        score = score + 1
      } else {
        btn.classList.add('wrong')
      }
      document.getElementById('score').textContent = 'Score: ' + score
      index = index + 1
      setTimeout(render, 500)
    })
    box.appendChild(btn)
  })
}

document.getElementById('again').addEventListener('click', function () {
  index = 0
  score = 0
  document.getElementById('score').textContent = 'Score: 0'
  render()
})

render()`
}

const quizApp = chapter({
  overview: 'In this chapter you will build a complete quiz app that marks each answer and keeps a running score.',
  points: [
    '🧩 Keep your questions in an array and draw the page from them.',
    '🎮 Mark each answer the moment it is chosen.',
    '🏆 Finish the app with a score, a restart button and your own extra feature.',
  ],
  objectives: [
    '✅ Store a list of questions as objects with a question, options and an answer.',
    '✅ Build the page from the array with a loop instead of writing buttons by hand.',
    '✅ Mark right and wrong answers and keep the score in a variable.',
    '✅ (Extra) Add a feature of your own and explain how you added it.',
  ],
  glossary: [
    ['📦 State', 'The data a program is holding right now, usually stored in variables or an array.'],
    ['🎨 Render', 'Drawing the page from the current state, so the screen always matches the data.'],
    ['🧱 Object', 'A single value that holds several named pieces, written with keys and values inside braces.'],
    ['🆔 Index', 'The position of an item in an array, counting from zero for the first item.'],
    ['🎯 Feature', 'One thing an app can do, such as marking a quiz answer or removing a task.'],
    ['🐛 Bug', 'A problem where the code runs but does the wrong thing, or stops working part-way.'],
  ],
  activities: [
    {
      title: 'Plan Before You Build',
      summary: 'A project is easier when you decide what it holds and what it does before you write any code.',
      steps: [
        '🧩 Read the three layers of the app in the live editor.',
        '🔍 Find the data, the logic and the display in the code.',
        '📝 Write down your own three layers before you start.',
      ],
      body: [
        'Every app in this course has the same three layers. Learning to spot them makes any new project much easier:',
        '',
        table(
          ['Layer', 'Job', 'In this app'],
          [
            ['Data', 'Holds the facts', 'The `questions` array and the `score` variable.'],
            ['Logic', 'Decides what happens', 'Comparing the chosen answer with the right one.'],
            ['Display', 'Draws the page', 'The `render()` function writing buttons onto the page.'],
          ]
        ),
        '',
        '### 🧱 One Question Is One Object',
        '',
        block('js', `{
  q: 'Which language structures a page?',
  options: ['HTML', 'CSS', 'JavaScript'],
  answer: 0
}`),
        '',
        'An object holds several named values in one place. The name `answer` stores the **position** of the right option, not the text — that is why checking is a single comparison.',
        '',
        '### 🎨 Draw the Page From the Data',
        '',
        block('js', `item.options.forEach(function (text, i) {
  const btn = document.createElement('button')
  btn.textContent = text
  box.appendChild(btn)
})`),
        '',
        'This is the line that makes the app scale: with 3 options or 30, the same loop builds the buttons. Nothing is written out by hand.',
        '',
        '### 🧩 Write Your Own Plan',
        '',
        bullets([
          '📝 **Data:** what does your quiz need to remember?',
          '📝 **Logic:** what happens when an answer is clicked?',
          '📝 **Display:** which elements does your page need?',
          '✅ **Checkpoint:** you have all three written down before writing any code.',
        ]),
        '',
        callout('💡', 'Programs are always: read some data, decide something, then draw the result. If your code ever feels tangled, find which of those three steps it is skipping.'),
      ].join('\n'),
    },
    {
      title: 'Build the Quiz',
      summary: 'The finished app: three questions, instant feedback, a running score and a restart button.',
      steps: [
        '🎮 Answer all three questions in the live editor.',
        '🔍 Find where the score is increased.',
        '🔁 Press Start again and confirm the quiz resets properly.',
      ],
      body: [
        embed(maker(quizDemo), 640),
        '',
        '### 🔍 Three Parts Worth Studying',
        '',
        '- 🎯 **Checking the answer** — `i === item.answer` compares the position clicked with the right position. Everything else is just showing the result.',
        '- 🎨 **Building the buttons** — one `forEach` loop creates a button, gives it a click handler, and adds it to the page.',
        '- 🔁 **Moving on** — `index = index + 1` then `render()` rebuilds the page for the next question. The function does not know what a question is; it only reads the data.',
        '',
        bullets([
          '🎮 Play the whole quiz and watch the score change after every answer.',
          '🔁 Press **Start again** — the score returns to 0 and question one comes back.',
          '🧪 Set `index` to start at 1 and predict what the app shows on load, then check.',
          '✅ **Checkpoint:** the app never reloads the page, and the score on screen always matches the `score` variable.',
        ]),
        '',
        '### 🐛 Two Bugs Worth Breaking on Purpose',
        '',
        table(
          ['Try this', 'What happens', 'Why'],
          [
            ['Remove `index = index + 1`', 'The same question appears forever.', 'The render step never sees new data.'],
            ['Change `answer: 0` to `answer: \'HTML\'`', 'Nothing is ever marked right.', 'The comparison needs a position, not text.'],
          ]
        ),
        '',
        'Breaking code on purpose and reading the error is the fastest way to learn what each line is doing.',
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'Add two features that were not in the original plan, then show the app to a classmate.',
      steps: [
        '🏆 Add a running "question 2 of 3" counter.',
        '🏆 Add a shuffle button that mixes the questions.',
        '📸 Screenshot your finished app with the final score showing.',
      ],
      body: [
        '### 🏆 Add Your Own Features',
        '',
        bullets([
          '🏆 **Challenge 1:** show "Question 2 of 3" above the buttons, updated by `render()`.',
          '🏆 **Challenge 2:** add a **Shuffle** button that mixes the `questions` array before starting.',
          '🏆 **Challenge 3:** keep a high score in a variable and show "Best: 2 / 3" under the score.',
        ]),
        '',
        '### 🔍 How to Shuffle',
        '',
        'You do not need to write the shuffling yourself — one line does it:',
        '',
        block('js', `questions.sort(() => Math.random() - 0.5)`),
        '',
        'And to reverse the order, so the player cannot simply learn the answer positions:',
        '',
        block('js', `questions.reverse()`),
        '',
        '### 📸 Finish and Check',
        '',
        bullets([
          '🎮 Play the app all the way through without any error in the console.',
          '🔁 Restart twice in a row and confirm the score is really zero at the start.',
          '💬 Show a classmate and ask them one question about a line of your code.',
          '✅ **Final checkpoint:** three questions, instant feedback, a running score, a restart button, and at least two features that are yours.',
        ]),
      ].join('\n'),
    },
  ],
})

/* ============================================================ 1114 Project: Todo List */

const todoDemo = {
  html: `<h2>My tasks</h2>
<input id="task" placeholder="What needs doing?">
<button id="add">Add task</button>
<ul id="list"></ul>
<p id="info">Nothing left to do.</p>
<button id="clear">Clear finished</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  max-width: 480px;
}
input, button {
  font-size: 15px;
  padding: 8px 12px;
}
#add { background: #2563eb; color: white; border: none; border-radius: 6px; }
li {
  margin: 8px 0;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
li.done span { text-decoration: line-through; color: #94a3b8; }
li button { padding: 2px 8px; }
#clear { margin-top: 8px; }`,
  js: `let tasks = [
  { text: 'Read chapter 1', done: false },
  { text: 'Build a quiz app', done: true }
]

function addTask() {
  const box = document.getElementById('task')
  const text = box.value.trim()
  if (text === '') return
  tasks.push({ text: text, done: false })
  box.value = ''
  render()
}

function toggle(i) {
  tasks[i].done = !tasks[i].done
  render()
}

function remove(i) {
  tasks.splice(i, 1)
  render()
}

function clearDone() {
  tasks = tasks.filter(t => !t.done)
  render()
}

function render() {
  const list = document.getElementById('list')
  list.innerHTML = ''

  tasks.forEach(function (task, i) {
    const li = document.createElement('li')
    if (task.done) li.classList.add('done')

    const span = document.createElement('span')
    span.textContent = task.text
    span.style.cursor = 'pointer'
    span.addEventListener('click', () => toggle(i))
    li.appendChild(span)

    const del = document.createElement('button')
    del.textContent = '✕'
    del.addEventListener('click', () => remove(i))
    li.appendChild(del)

    list.appendChild(li)
  })

  const left = tasks.filter(t => !t.done).length
  document.getElementById('info').textContent = left + ' task(s) left'
}

document.getElementById('add').addEventListener('click', addTask)
document.getElementById('task').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask()
})
document.getElementById('clear').addEventListener('click', clearDone)

render()`
}

const todoApp = chapter({
  overview: 'In this chapter you will build a to-do list that adds tasks, marks them done, removes them, and remembers everything you typed.',
  points: [
    '🧩 Keep every task in one array, each with its text and its state.',
    '✅ Click a task to mark it done, and remove it with the ✕ button.',
    '💾 Make the list survive a page refresh with local storage.',
  ],
  objectives: [
    '✅ Store tasks as objects with a `text` and a `done` value.',
    '✅ Add, toggle and remove tasks, redrawing the page after every change.',
    '✅ Show how many tasks are still not finished.',
    '✅ (Extra) Save the list in local storage so it survives a refresh.',
  ],
  glossary: [
    ['📦 State', 'The data a program is holding right now, usually stored in variables or an array.'],
    ['🎨 Render', 'Drawing the page from the current state, so the screen always matches the data.'],
    ['💾 Local Storage', 'A small store inside the browser that keeps data after the page is closed.'],
    ['✂️ splice', 'An array method that removes items at a given position, and returns them.'],
    ['🔍 filter', 'An array method that builds a new array with only the items that pass a test.'],
    ['🧱 Object', 'A single value that holds several named pieces, written with keys and values inside braces.'],
  ],
  activities: [
    {
      title: 'Tasks as Data',
      summary: 'Each task is one object with two values: what it says, and whether it is finished.',
      steps: [
        '🧱 Read the shape of one task in the live editor.',
        '🔍 Find where a new task is added to the array.',
        '🎬 Add a task with an empty box and predict what happens.',
      ],
      body: [
        block('js', `let tasks = [
  { text: 'Read chapter 1', done: false },
  { text: 'Build a quiz app', done: true }
]`),
        '',
        '- 🧱 Each item is an object with a `text` and a `done` flag.',
        '- 🎨 `done: true` means the task is finished — the page draws it with a line through it.',
        '- ⚠️ The array is the truth. The list on screen is only a picture of it, drawn by `render()`.',
        '',
        '### 🔍 Why the Page Is Redrawn Every Time',
        '',
        'Notice what every button does: it **changes the array**, then calls `render()`. Nothing ever edits the page directly. That one rule is why this app never gets out of step with its data.',
        '',
        '### 🎬 Add, Toggle and Remove',
        '',
        embed(maker(todoDemo), 640),
        '',
        bullets([
          '✍️ Add three tasks, then mark one of them done by clicking its text.',
          '🗑️ Remove one with the ✕ button and watch the count change.',
          '🧹 Press **Clear finished** and check that only the unfinished tasks remain.',
          '✅ **Checkpoint:** the "task(s) left" line always matches what you can see.',
        ]),
        '',
        '### 🔍 Three Array Methods Worth Knowing',
        '',
        block('js', `tasks.push(item)                 // add one to the end
tasks.splice(i, 1)             // remove the item at position i
tasks.filter(t => !t.done)     // keep only items that pass the test`),
        '',
        callout('💡', '`filter` and `splice` both give you back a **new** array or a removed value. If your page does not update, check that you assigned the result back to the variable.'),
      ].join('\n'),
    },
    {
      title: 'Never Lose a Task',
      summary: 'A refresh throws away every variable — unless you save the array somewhere that survives.',
      steps: [
        '💾 Add two tasks and then refresh the page in the live editor.',
        '🔍 Find the two lines that save and load the list.',
        '🎬 Refresh again and confirm your tasks are still there.',
      ],
      body: [
        'Everything you have built so far lives in a variable, and a variable disappears when the page closes. **Local storage** is a small space inside the browser that does not.',
        '',
        '⚠️ Local storage only holds **text**, so an array must be converted with `JSON.stringify` and read back with `JSON.parse`.',
        '',
        block('js', `function save() {
  localStorage.setItem('tasks', JSON.stringify(tasks))
}

function load() {
  const raw = localStorage.getItem('tasks')
  if (raw === null) {
    return [
      { text: 'Read chapter 1', done: false },
      { text: 'Build a quiz app', done: true }
    ]
  }
  return JSON.parse(raw)
}

let tasks = load()

function render() {
  save()
  // ... then draw the page as before
}`),
        '',
        '### 💾 Add Saving to Your Own List',
        '',
        bullets([
          '📝 Add a `save()` function that stores the array in local storage.',
          '📝 Call it from the end of `render()` so every change is saved.',
          '📝 Read the array back at the start instead of writing it out by hand.',
          '🎬 Refresh the page and confirm your tasks are still there.',
          '✅ **Checkpoint:** add a task, refresh, and it is still on the list.',
        ]),
        '',
        '### ⚠️ Why the Check Matters',
        '',
        block('js', `if (raw === null) {
  return [ ...starting values... ]
}`),
        '',
        'The very first time somebody opens your app there is nothing stored, so `localStorage.getItem` returns `null`. Without this check, `JSON.parse(null)` throws and the whole app appears broken.',
        '',
        callout('💡', 'Local storage is per browser and per device. Clearing your browsing data wipes it, so never use it for anything that really matters — it is perfect for a practice list, and nothing more.'),
      ].join('\n'),
    },
    {
      extra: true,
      title: 'Finish more',
      summary: 'Add filters, edit-in-place, and a way to reorder your tasks.',
      steps: [
        '🎬 Add an "All / To do / Done" filter row.',
        '✏️ Make the text of a task editable by clicking twice on it.',
        '📸 Screenshot your finished list with at least five tasks.',
      ],
      body: [
        '### 🏆 Add Your Own Features',
        '',
        bullets([
          '🏆 **Challenge 1:** add a filter row — All, To do, Done — and store the current filter in a variable.',
          '🏆 **Challenge 2:** let a person rename a task by clicking on the text and typing a new one.',
          '🏆 **Challenge 3:** add a **Move up** button so the order can be changed by hand.',
        ]),
        '',
        '### 🔍 A Hint for the Filter',
        '',
        'The filter is just another thing stored in the array of state, and one extra line in `render()`:',
        '',
        block('js', `let filter = 'all'

const visible = tasks.filter(function (t) {
  if (filter === 'done') return t.done
  if (filter === 'todo') return !t.done
  return true
})`),
        '',
        'Then draw `visible` instead of `tasks`. ⚠️ Remember that `filter` and `splice` return **new** arrays — if the list stops updating, check that you assigned the result.',
        '',
        '### 📸 Finish and Check',
        '',
        bullets([
          '🎬 Add five tasks, complete two, and filter between the three views.',
          '💾 Refresh the page — your list and your filter choice should both survive.',
          '💬 Ask a classmate to add a task on your screen and watch it appear.',
          '✅ **Final checkpoint:** tasks can be added, completed, filtered, removed and renamed, and all of it survives a refresh.',
        ]),
      ].join('\n'),
    },
  ],
})

export default { 1112: projects, 1113: quizApp, 1114: todoApp }
