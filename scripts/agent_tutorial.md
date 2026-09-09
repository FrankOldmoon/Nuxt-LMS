%%%%% G01
## 🚀 Getting Started

AI agents are the biggest shift in how we work with computers since the smartphone 📱 — and this course teaches you to **drive them well**, not just chat with them.

Using real tools like **WorkBuddy** and **Codex**, you will learn how agents think, how to instruct them, and how to stay safely in the driver's seat.

%%GQ1%%

%%%%% A01
## 🤖 What is an AI Agent?

A **chatbot** answers your messages. An **AI agent** goes further: it can **take actions** — read files, browse the web, run code, edit documents, schedule tasks — to actually *complete* a goal you give it.

### 🔄 The Agent Loop

Agents work in a loop: **Perceive → Think → Act → Observe → Repeat** 🔄

1. 📥 **Perceive** — read your request and the available context (files, web pages, tool results)
2. 🧠 **Think** — break the goal into steps and pick the next action
3. ⚙️ **Act** — call a tool: run a command, write a file, search the web
4. 👀 **Observe** — look at the result, fix mistakes, continue until done

%%Q1%%

### 🆚 Agent vs Chatbot

| | 💬 Chatbot | 🤖 Agent |
| --- | --- | --- |
| Interaction | one question → one answer | multi-step task → finished result |
| Actions | text only | tools: files, web, code, schedules |
| Autonomy | waits for every prompt | plans and iterates on its own |
| Example | "explain recursion" | "build a revision quiz web page and deploy it" |

:::callout icon=💡
Examples you may already know: **WorkBuddy** (desktop AI assistant with agents, skills and automations), **Codex / Claude Code** (coding agents in the terminal), **Copilot** (AI pair programmer in the editor).
:::

%%Q2%%

%%%%% A02
## 🧭 Meet the Agents

The agent landscape can feel crowded — here is a map of the main species 🗺️:

### 🖥️ Desktop assistants

**WorkBuddy**-style agents live on your desktop: they chat, read/write local files, search the web, generate images and documents, run automations and connect to other apps (connectors, MCP servers). Best all-rounder for study and daily work.

### ⌨️ Coding agents (CLI)

**Codex**, **Claude Code**, **Gemini CLI** run in your terminal. They read your whole codebase, plan changes, edit many files and run tests. Best for real software projects.

### 👨‍💻 Editor copilots

**GitHub Copilot**, **Cursor** live inside your editor and autocomplete or refactor as you type. Best for in-the-flow coding help.

### 🌐 Web chat agents

ChatGPT, Claude, Gemini web apps — increasingly agentic (web browsing, file analysis, canvas). Best for quick tasks with zero setup.

:::callout icon=💡
Rule of thumb: **big multi-step work → coding agent CLI; daily study & files → desktop assistant; small quick questions → web chat.**
:::

%%Q3%%

%%Q4%%

%%%%% A03
## 🛠️ Set Up Your First Agent

Getting productive with an agent takes minutes — but setting it up *well* saves hours later.

### 📋 Setup checklist

1. 📥 **Install & sign in** — install the app (or CLI) and log in with your account
2. 🗂️ **Pick a workspace** — agents work best inside a project folder, not your whole disk
3. 🔐 **Review permissions** — see which tools it may use (files, web, shell) and which need your approval
4. 🎯 **Give it a first small task** — start small: "summarise this folder's README"
5. 🔁 **Review the result** — check its work, then give feedback

:::callout icon=⚠️
Start with **low-stakes tasks** on files you can afford to lose. Trust is earned task by task — and keep backups of anything important.
:::

%%Q5%%

### 🗂️ Why a dedicated workspace?

Agents that can see *everything* can also *touch* everything. A project folder gives the agent exactly the context it needs — and limits the blast radius if something goes wrong. 💥→✅

%%Q6%%

%%%%% G02
## 💬 Prompting & Context

The #1 skill of the agent era is not typing speed — it is **communicating goals clearly**. 🎯

A weak prompt gets a weak result. A great prompt reads like a good task briefing: goal, context, constraints, format.

%%GQ2%%

%%%%% A04
## 🧠 Anatomy of a Good Prompt

A strong prompt has four parts — the **G.C.C.F.** checklist:

- 🎯 **Goal** — what "done" looks like
- 📚 **Context** — background, files, audience, links
- 🚧 **Constraints** — limits and rules (language, length, style, "don't touch X")
- 📦 **Format** — the shape of the output (table, code, essay, steps)

### 🆚 Weak vs strong

❌ "Write about volcanoes."

✅ "Write a 200-word introduction to volcanoes for Grade 8 geography students (audience). Cover how they form and one famous eruption (goal). Simple vocabulary, no jargon (constraint). End with 3 quiz questions (format)."

:::callout icon=💡
Formula to remember: **Goal + Context + Constraints + Format**. If a result disappoints, check which part was missing from your prompt — it usually is.
:::

%%Q7%%

%%Q8%%

%%%%% A05
## 📚 Giving Context that Matters

Agents are not mind-readers 🙈 — they only know what you tell them plus what their tools can fetch. Great agents feed great context.

### 🍱 What to provide

- 📁 **Files** — "read `draft.md` in this folder and improve section 2"
- 🔗 **Links & sources** — paste the URL or doc you want it to work from
- 🧾 **Examples** — "make it look like this sample" is worth 500 words of description
- 🧑‍🏫 **Audience & purpose** — "for Year 10 students revising for a test"
- ⚙️ **Environment facts** — OS, language version, framework ("Python 3.13, pnpm project")

### 🚫 What to withhold

Secrets: passwords, tokens, personal data of others, anything you would not put on a postcard. ✉️❌

:::callout icon=💡
Desktop agents like WorkBuddy can read your project folder themselves — point them at the folder instead of copy-pasting every file. The agent fetches what it needs.
:::

%%Q9%%

%%Q10%%

%%%%% A06
## 🔁 Iterating with Follow-ups

Agent work is a **conversation, not a vending machine**. The first result is a draft — the magic happens in the follow-ups.

### 🎯 Feedback patterns that work

- ✂️ **Narrow it**: "Good, but make section 2 shorter and cut the jargon"
- 🧪 **Test it**: "Run the code — if it fails, fix it and run again"
- 🔍 **Show your work**: "Explain why you chose this approach"
- ♻️ **Regenerate with a diff**: "Change only the conclusion, keep the rest"
- 🛑 **Course-correct early**: as soon as the direction feels wrong, stop and steer — don't let it finish 20 wrong steps

:::callout icon=⚠️
Long runs drift. If an agent has done many steps without a checkpoint, ask it to **summarise what it did and what's left** — then confirm the plan before continuing.
:::

%%Q11%%

%%Q12%%

%%%%% G03
## 🧰 Core Workflows

Four everyday workflows cover 90% of agent use: **research, writing, coding, data**. 🧰

Master these and the agent becomes a genuine teammate — for revision, projects, clubs and coursework.

%%GQ3%%

%%%%% A07
## 🔍 Research & Summaries

Agents are powerful research assistants — they search, read multiple sources, and synthesise. But they need a *methodology*, not just a topic.

### 📋 A good research prompt

"Research [topic] for a 5-minute class presentation (context). Compare at least 3 sources, note where they disagree (goal). Give me: 1) a 5-bullet summary, 2) a table of source vs claim, 3) 2 questions I should still verify (format). Prefer sites from the last 2 years (constraint)."

### ⚠️ Trust but verify

- ✅ Ask for **sources with links** for every claim
- ✅ Open 1–2 links yourself and spot-check
- ❌ Never cite a source you have not opened — agents sometimes cite plausible-but-wrong links

%%Q13%%

%%Q14%%

%%%%% A08
## ✍️ Writing & Documents

From lab reports to club posters — agents draft, restructure and polish. You supply the thinking; they supply the typing. ⌨️

### 🧭 Workflow that works

1. 🧠 **You outline the ideas** — the argument is *your* job
2. ✍️ **Agent expands** into a structured draft in your required format
3. 🎨 **Agent formats** — headings, tables, slides, even a .docx or .pptx file
4. 👀 **You review every claim** — the agent writes fluently, but *you* own the facts

:::callout icon=💡
Desktop agents can output real files (.docx / .pptx / .xlsx / HTML). Ask for the file, not just text — then edit it yourself like any other draft.
:::

%%Q15%%

%%Q16%%

%%%%% A09
## 💻 Coding with Agents

Coding agents can generate, explain, refactor and debug — but they shine brightest when **you stay the architect**. 🏗️

### 🧩 Four core moves

- 🆕 **Generate**: "Write a Python script that renames all .png files in a folder to date-based names. Include error handling and comments."
- 📖 **Explain**: "Open `main.py` and explain what it does, line by line, for a beginner"
- 🔧 **Refactor**: "This function repeats logic 3 times — extract a helper, don't change behaviour"
- 🐞 **Debug**: "This throws `KeyError: 'name'` when input is empty — find the root cause, then fix it"

:::callout icon=💡
For bugs, always paste the **exact error message** and the **steps to reproduce**. "It doesn't work" sends the agent guessing; a stack trace sends it straight to the cause.
:::

### 🧪 The golden rule

Ask the agent to **run the code and show the output** — a program that "looks right" and a program that *runs right* are different things.

%%Q17%%

%%Q18%%

%%%%% A10
## 📊 Data & Analysis

Give an agent a messy spreadsheet and a question, and it can clean, compute, chart and explain. 📈

### 🧭 A solid analysis loop

1. 📥 **Point at the data** — "this CSV has 500 rows of test scores"
2. 🎯 **State the question** — "which class improved most from test 1 to test 2?"
3. 🧹 **Ask for cleaning first** — show missing values, duplicates, weird formats *before* computing
4. 📊 **Ask for the artifact** — a chart, a summary table, an updated .xlsx
5. 🔍 **Ask for the caveat** — "what could make this conclusion wrong?"

:::callout icon=⚠️
Always ask "what are the limitations of this analysis?" — averages hide outliers, small samples lie, and a confident tone is not evidence.
:::

%%Q19%%

%%Q20%%

%%%%% G04
## ⚡ Agentic Superpowers

Beyond chatting: agents can **use tools, gain skills, run on schedules and remember you**. ⚡

These are the features that turn a clever chatbot into a genuine assistant — learn them deliberately.

%%GQ4%%

%%%%% A11
## 🔐 Tools & Permissions

Every agent action goes through a **tool**: read a file, run a shell command, fetch a web page, send a message. With tools comes responsibility — that's why agents ask for **permission**.

### 🎚️ The permission ladder

- 👀 **Read-only** — viewing files, searching the web (low risk)
- ✍️ **Write** — creating/editing files in your workspace (check the diff!)
- ⚙️ **Execute** — running commands (highest risk — read before you approve)
- 🌍 **External** — posting, emailing, paying (almost always confirm first)

### 🛡️ Good habits

- 🔍 Actually **read what you're approving** — "rm", "force push", "delete" deserve a pause
- 🧱 Keep agents in a **sandbox/workspace**, not your whole home folder
- 🚫 Never approve actions you don't understand — ask the agent to explain first

%%Q21%%

%%Q22%%

%%%%% A12
## 🧩 Skills & Customisation

Agents ship with general ability — **skills** give them specific playbooks. 🧩

A skill is a packaged instruction set (often with scripts) the agent loads when a task matches: "make a PowerPoint", "build an Excel report", "follow our lab-report format".

### 🛠️ Ways to customise

- 📦 **Install skills** from a marketplace — instant expert workflows
- 🧑‍⚕️ **Pick an expert/persona** — a writing coach, a data analyst, a code reviewer
- 📝 **Custom instructions** — your standing preferences: "always answer in both English and Chinese", "I use macOS and pnpm"
- 📄 **Project files** (like `AGENTS.md`) — conventions the agent reads every time it works in that project

:::callout icon=💡
If you find yourself re-explaining the same workflow every session — that is a skill waiting to be created. Teach once, reuse forever.
:::

%%Q23%%

%%Q24%%

%%%%% A13
## ⏰ Automations & Schedules

Agents can work **while you sleep**: scheduled tasks that fetch, summarise, generate and deliver on a timetable. ⏰

### 🌅 Great first automations

- 📰 **Daily briefing** — every morning: "summarise today's top AI news, one paragraph each"
- 📊 **Weekly digest** — every Friday: "collect my club's messages and draft the weekly update"
- 🔔 **One-time reminders** — "next Tuesday 3pm, remind me to start the physics IA draft"

### 🧠 Design rules

- ✅ Make the prompt **self-contained** — future runs can't see this conversation
- ✅ Deliver the **final result** (a report, an image), not just raw data
- ✅ Start **paused/manual**, check the first outputs, then let it run

%%Q25%%

%%Q26%%

%%%%% A14
## 🧠 Memory & Personalisation

Good agents get better over time — because they **remember**. Memory has layers:

- 🪪 **Profile memory** — learns your preferences implicitly (tone, common projects)
- 📝 **Explicit memory** — "remember I prefer concise answers with tables" — rules it must follow
- 🗂️ **Project memory** — notes tied to a specific project folder: decisions, conventions, progress

:::callout icon=💡
Tell the agent your *stable* facts once ("I'm a Year 12 IB student, I use Python and macOS") and it stops re-asking. Correct it when it misremembers — memory is editable, not permanent.
:::

### ⚖️ The trade-off

More memory = more personalised, but also more sensitive. Know what your agent stores, and clean it up when it drifts. 🧹

%%Q27%%

%%Q28%%

%%%%% G05
## 💻 Coding Agents Deep-Dive

Terminal coding agents — **Codex, Claude Code, Gemini CLI** — are the heavy machinery of the agent world. 🏗️

They can read entire repositories, plan multi-file changes, run tests and commit. With great power comes the need for a great workflow.

%%GQ5%%

%%%%% A15
## ⌨️ CLI Agents: Codex, Claude Code & Friends

Coding agents run in your terminal, inside your project folder. Unlike chat, they **act**: read files, edit code, run commands.

### 🔄 The core loop

1. 📋 **Plan first** — "read the repo and propose a plan; don't change anything yet"
2. ✅ **Approve the plan** — read it, correct it, then green-light
3. ⚙️ **Apply** — the agent edits files, runs tests, iterates on failures
4. 👀 **Review the diff** — you check every change before it becomes final

:::callout icon=💡
Many CLI agents have explicit modes: **plan / read-only** vs **apply / full-access**. Start in plan mode for anything unfamiliar — reading is free, wrong edits are not.
:::

### 🗂️ The AGENTS.md file

Projects often include an `AGENTS.md` (or `CLAUDE.md`) — instructions the agent reads automatically: build commands, code style, "never touch the migrations folder". Write one for your project and every session starts smarter.

%%Q29%%

%%Q30%%

%%%%% A16
## 🗂️ Working with a Codebase

Real repos are big. Agents handle them well *if you hand them well-posed tasks*. 🗂️

### 🎯 Task hygiene

- ✂️ **Small, focused tasks** beat "improve the app": "add validation to the signup form"
- 📍 **Point at locations**: "in `server/api/`, the update endpoint" — saves minutes of wandering
- 🧪 **Define "done"**: "all existing tests pass + add one new test"
- 🌿 **One branch per task** — agents + git = safety net; commit before big refactors

### 🔁 Let it verify

The best agents **run the tests themselves** and loop until green. Ask for it explicitly: "after changes, run `pnpm test` and fix failures."

:::callout icon=⚠️
Commit (or back up) before letting an agent refactor broadly. A diff against a known-good state is your undo button.
:::

%%Q31%%

%%Q32%%

%%%%% A17
## 🔍 Reviewing AI-Generated Code

AI code is written fast — **your review is the quality gate**. 🚧

Read AI code the way you'd review a teammate's pull request: with respect, but with suspicion.

### 🕵️ What to look for

- 🐞 **Correctness** — does it actually solve *your* problem, or a nearby one?
- 🧱 **Hallucinated APIs** — functions/libraries that don't exist; run the code to find out
- 🔓 **Security** — hardcoded secrets, unsanitised input, SQL string concatenation
- 🧹 **Consistency** — does it follow the project's existing style and patterns?
- 📦 **Over-engineering** — 300 lines and a design pattern where 10 lines would do

:::callout icon=💡
You ship it, you own it. "The AI wrote it" will not survive as an excuse — in school or in industry.
:::

%%Q33%%

%%Q34%%

%%%%% G06
## 🛡️ Best Practices & Safety

Agents are powerful — and power without judgement is how accidents happen. 🛡️

This final group: verify outputs, protect data, keep your integrity, and keep yourself **in the loop**.

%%GQ6%%

%%%%% A18
## 👻 Hallucinations & Verification

Agents sometimes state wrong things **confidently** — invented facts, fake citations, non-existent APIs. This is called **hallucination**, and it is the #1 hazard of AI work. 👻

### 🕵️ Verification habits

- ✅ **Ask for sources**, then open them yourself
- ✅ **Test claims against reality** — run the code, check the formula, look at the date
- ⚠️ **Extra suspicion for**: numbers, dates, quotations, citations, legal/medical claims, "recent" news
- 🔁 **Cross-check** important facts with a second source (or a second agent!)

:::callout icon=⚠️
Confidence is not correctness. An agent that says "definitely" and an agent that says "probably" can be equally wrong — verify by *default*, not by exception.
:::

%%Q35%%

%%Q36%%

%%%%% A19
## 🔒 Privacy & Data Safety

Everything you paste into a cloud service leaves your control. Treat prompts like postcards ✉️, not diaries.

### 🚫 Never share with an agent

- 🔑 Passwords, API keys, tokens
- 🪪 Other people's personal data (classmates' grades, ID numbers)
- 📄 Confidential documents you have no right to share
- 🏫 School/clinic systems data covered by policy or law

### ✅ Do instead

- 🧻 **Redact** — replace secrets with placeholders ("API_KEY=***")
- 💻 Use **local/offline modes** for sensitive work when available
- 🗑️ Know how to **delete** your history and memory
- 🏫 Follow your **school's AI policy** — it exists for a reason

%%Q37%%

%%Q38%%

%%%%% A20
## 🎓 Academic Integrity & AI

Your school's rule is simple to find and vital to follow — but the *thinking* behind it matters everywhere: **AI can assist your learning; it must not replace it.** 🎓

### 🚦 The traffic-light test

- 🟢 **Usually fine** — explaining a concept you're stuck on, generating practice questions, giving feedback on *your* draft, helping debug *your* code
- 🟡 **Depends on rules** — brainstorming topics, summarising sources, translating your own text
- 🔴 **Usually not** — submitting AI writing as your own, AI-generated code for graded work without permission, fabricated citations

### 📝 Always do this

- 📖 Read the assignment's AI policy *before* starting
- 🙋 **Declare AI use** when required — how you used it, for what
- 🧠 Keep evidence of *your* process (drafts, notes) — that is what's being assessed

:::callout icon=💡
The exam hall has no AI. Build your own understanding first; use agents to *extend* it — practice, feedback, exploration — never to *fake* it.
:::

%%Q39%%

%%Q40%%

%%%%% A21
## 👨‍✈️ Human in the Loop

The best agent users are not the ones who delegate the most — they are the ones who **stay the pilot**. 👨‍✈️

### 🧭 The pilot's checklist

1. 🧠 **Understand before you accept** — if you can't explain the agent's output, you can't stand behind it
2. 🎯 **You set the goal** — agents optimise what you ask for; a wrong goal executed perfectly is still wrong
3. ⚖️ **You make the judgement calls** — ethics, taste, trade-offs, "should we even do this?"
4. 🔍 **You verify the result** — tests, sources, common sense
5. 📚 **You learn from the process** — watch *how* the agent solves things; steal the techniques

:::callout icon=🎯
Final thought: agents make capable people *more* capable. The skill you are really building in this course — clear goals, good context, careful verification — is the skill of a competent professional, with or without AI. Now go build something! 🚀
:::

%%Q41%%

%%Q42%%
