/**
 * Rebuild the four Activity programs of chapter 217 (course 7) in the
 * "Move one servo" file layout: ang.json + main.py (+ control.html for WiFi).
 *
 * The tuned gait / dance / AI code is lifted verbatim from the current
 * chapter code blocks, so nothing that works on the real robot changes.
 * Only the header (json-driven ANG), the stand() helper and the runner are
 * rewritten.
 *
 *   node make_files.mjs          # write v2/<program>/main.py
 *   node make_files.mjs --dry    # print sizes only
 */
import { readFileSync, writeFileSync } from 'node:fs'
const DRY = process.argv.includes('--dry')
const DIR = '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/scripts/course7_217/v2'
const OLD = '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/scripts/course7_217'

// The tuned gait / dance / AI code comes from the previous single-file
// programs, which are kept next to this folder. Slicing the live chapter
// would break as soon as the chapter is converted, so the source of truth
// for the motion code is the .py file on disk.
const WIFI_SRC = readFileSync(`${OLD}/wifi.py`, 'utf8')
const DANCE_SRC = readFileSync(`${OLD}/dance.py`, 'utf8')
const AI_SRC = readFileSync(`${OLD}/ai.py`, 'utf8')

// ---- slice the tuned parts out of the current sources -------------------
const between = (src, from, to) => {
  const a = src.indexOf(from)
  const b = to ? src.indexOf(to) : src.length
  if (a < 0 || b < 0 || b <= a) throw new Error('bad slice: ' + from + ' .. ' + to)
  return src.slice(a, b).replace(/\s+$/, '') + '\n'
}

const WIFI_MOTIONS = between(WIFI_SRC, 'def goahead', '# ---------- 4. The web page')
const DANCE_MOVES = between(DANCE_SRC, 'def bow', '# ---------- 3. The show')
  // the old file carried Chinese move names in the comments; drop them, the
  // function name already says which move it is
  .replace(/^(def \w+\(\):)\s*# [^\n]*? - /gm, (m, head) => head.padEnd(41) + '# ')
const DANCE_SHOW = between(DANCE_SRC, '# ---------- 3. The show')
const AI_BODY = between(AI_SRC, 'def ramp', '# ---------- 5. Run')

// ---- shared header ------------------------------------------------------
const FILES2 = `#   ang.json   the twelve joint angles of the standing pose (edit to tune)
#   main.py    this program`

const SAME_FILE = `# ang.json is the same file as in Activity 1. Calibrate once, and every
# program after it stands up correctly.`

const HEADER = (title, files, extra, imports = '', note = SAME_FILE, machine = 'Pin, PWM') => `# Biped robot - ${title}
#
# Files on the board:
${files}
#
${note}
${extra}
from machine import ${machine}
${imports}import time

try:
    import json
except ImportError:          # some MicroPython builds expose ujson only
    import ujson as json

ANG_FILE = "ang.json"

# Fallback pose, used if ang.json is missing or malformed.
DEFAULT_ANG = {'leg_r': 30, 'knee_r': 54, 'ankle_r': 91,
               'leg_l': 150, 'knee_l': 142, 'ankle_l': 95,
               'shoulder_r': 32, 'arm_r': 144, 'hand_r': 40,
               'shoulder_l': 150, 'arm_l': 37, 'hand_l': 130}

PINS = {'leg_r': 14, 'knee_r': 13, 'ankle_r': 12,
        'leg_l': 5, 'knee_l': 4, 'ankle_l': 2,
        'shoulder_r': 15, 'arm_r': 25, 'hand_r': 26,
        'shoulder_l': 27, 'arm_l': 32, 'hand_l': 33}


def save_ang(path, ang):
    """Write the twelve angles to disk, three per line, like the chapter."""
    keys = list(PINS)
    rows = []
    for i in range(0, len(keys), 3):
        rows.append('  ' + ', '.join('"%s": %g' % (j, ang[j]) for j in keys[i:i + 3]))
    try:
        with open(path, 'w') as f:
            f.write('{\\n' + ',\\n'.join(rows) + '\\n}\\n')
        print("wrote", path)
    except OSError as e:
        print("cannot write %s (%s) - edit it on another machine" % (path, e))


def load_ang(path):
    """Read the pose file. If it is not on the board yet, create it.

    The first run writes ang.json with the default angles, so there is always
    a real file to open and edit. A file that exists but does not parse is
    left alone: the program uses the defaults and says so.
    """
    try:
        with open(path) as f:
            data = json.load(f)
    except OSError:
        print("no %s on the board - creating it with the default angles" % path)
        save_ang(path, DEFAULT_ANG)
        return dict(DEFAULT_ANG)
    except ValueError as e:
        print("bad JSON in %s (%s), using defaults" % (path, e))
        return dict(DEFAULT_ANG)

    # Start from defaults so a partially filled file still works.
    ang = dict(DEFAULT_ANG)
    ang.update({k: v for k, v in data.items() if k in PINS})

    missing = [j for j in PINS if j not in data]
    if missing:
        print("ang.json missing:", missing, "- defaults used for those")
    return ang


ANG = load_ang(ANG_FILE)
print("ANG =", ANG)
`

const HW = `
srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}
pos = dict(ANG)             # last angle written to each joint


def w(joint, deg):
    """Set one joint to an angle in degrees."""
    pos[joint] = int(deg)
    srv[joint].duty(int(deg * 0.56) + 25)
`

const STAND_SMOOTH = `

LEAN = 0                                 # >0 leans the body forward
STAND = dict(ANG)                        # the pose every move starts and ends in
STAND['leg_r'] = ANG['leg_r'] + LEAN
STAND['leg_l'] = ANG['leg_l'] - LEAN
pos.update(STAND)


def stand():
    """Ease every joint back to STAND, all at the same time."""
    while pos != STAND:
        for j in PINS:
            if pos[j] < STAND[j]:
                w(j, pos[j] + 1)
            elif pos[j] > STAND[j]:
                w(j, pos[j] - 1)
        time.sleep_ms(8)
`

// ============================ Stand (Activity 1) ========================
// Same header, same file loading, same w(): only stand() is simpler here,
// because Activity 1 has no gait to smooth between.
const STAND_NOTE = `# Calibrate once here. Every other program in this chapter loads this same
# file, so the pose you tune now is the pose they all use.`

const stand = HEADER('standing pose only', FILES2, `#
# One program, one job: read the twelve angles, write them once to every joint,
# then hold still. To tune: edit ang.json on the board, reset, run again.
#
# The first run creates ang.json if it is missing, so there is always a file
# to open and edit.
`, '', STAND_NOTE) + HW + `

def stand():
    # Write every joint to its ANG value.
    for j in PINS:            # PINS order: deterministic, all joints covered
        w(j, ANG[j])


stand()

while True:
    time.sleep(1)
`

// ============================ WiFi ======================================
const WIFI_FILES = `#   ang.json      the twelve joint angles of the standing pose (edit to tune)
#   control.html  the page the phone shows (edit it, then reload the page)
#   main.py       this program`

const wifi = HEADER('Program 2: WiFi remote', WIFI_FILES, `#
# How to use:
#   1) Put your WiFi name and password in WIFI_SSID / WIFI_PASS.
#   2) Save main.py and control.html to the board. ang.json is created on the
#      first run if it is not there yet.
#   3) Run main.py and read the IP address in the Shell, e.g. 192.168.1.23
#   4) Type that address into the phone browser. The phone must be on the
#      same WiFi - the robot has no internet access.
`, 'import network\nimport socket\n') + `
# ---------- 1. Tuning ----------
LEAN = 0          # extra forward lean while walking; 0 = the same pose as Activity 1
SPEED = 2         # gait speed, larger value = slower
AHEAD_R = 12      # side tilt (right) used to free the left foot when walking forward
AHEAD_L = 12      # side tilt (left) used to free the right foot when walking forward
BACK_R = 12       # side tilt used when walking backwards
BACK_L = 12
KICK_DEG = 14     # body tilt while kicking
RISE_DEG = 17     # thigh tuck angle used when standing up from the floor

WIFI_SSID = 'MINXIN-S'
WIFI_PASS = 'Minxin520'

PAGE_FILE = 'control.html'
` + HW + `
LEG_R = ANG['leg_r'] + LEAN   # right leg angle in the standing pose
LEG_L = ANG['leg_l'] - LEAN   # left leg angle in the standing pose
pos['leg_r'], pos['leg_l'] = LEG_R, LEG_L


def stand(force=False):
    """Ease every servo back to the standing pose, all at the same time.

    With force=True the standing angles are written again even if the code
    already thinks the robot is standing, so /reset really re-drives the servos.
    """
    target = dict(ANG)
    target['leg_r'], target['leg_l'] = LEG_R, LEG_L
    while pos != target:
        for j in PINS:
            if pos[j] < target[j]:
                w(j, pos[j] + 1)
            elif pos[j] > target[j]:
                w(j, pos[j] - 1)
        time.sleep_ms(10)
    if force:
        for j in PINS:
            w(j, target[j])


# ---------- 2. Motions ----------
` + WIFI_MOTIONS + `

# ---------- 3. The control page comes from control.html ----------
# The page is a normal file on the board, not a string inside this program.
# edit control.html, reload the page, and the buttons change - no upload of
# main.py needed.
FALLBACK_PAGE = """<!DOCTYPE html><html><body style="font-family:sans-serif">
<h3>control.html is missing</h3>
<p>Copy control.html to the board next to main.py, then reload this page.</p>
</body></html>"""


def load_page(path):
    """Read the page from flash; serve a short hint if it is not there."""
    try:
        with open(path) as f:
            return f.read()
    except OSError:
        print("no %s on the board, serving the fallback page" % path)
        return FALLBACK_PAGE


# ---------- 4. Run: connect, then answer one request at a time ----------
for j in PINS:                              # snap every servo to the standing pose
    w(j, pos[j])

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(WIFI_SSID, WIFI_PASS)
for _ in range(20):                         # wait up to 10 s for the link
    if wlan.isconnected():
        break
    time.sleep_ms(500)
print('connected:', wlan.isconnected())
print('open http://%s/' % wlan.ifconfig()[0])

s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(('0.0.0.0', 80))
s.listen(3)

while True:
    conn, addr = s.accept()
    conn.settimeout(2)                      # never block forever on an idle socket
    try:
        req = conn.recv(1024).decode()
    except OSError:                         # browser pre-connect that sent nothing
        conn.close()
        continue
    if not req:
        conn.close()
        continue
    path = req.split(' ')[1] if ' ' in req else '/'

    if path == '/':                         # the page itself
        page = load_page(PAGE_FILE)
        conn.send('HTTP/1.1 200 OK\\r\\nContent-Type: text/html; charset=utf-8\\r\\n'
                  'Content-Length: %d\\r\\nCache-Control: no-store\\r\\n'
                  'Connection: close\\r\\n\\r\\n' % len(page))
        conn.send(page)
        conn.close()
        continue

    # Answer first, move second: the phone gets its reply while the robot
    # is still standing still.
    conn.send('HTTP/1.1 204 No Content\\r\\nCache-Control: no-store\\r\\n'
              'Connection: close\\r\\n\\r\\n')
    conn.close()

    if path == '/reset':                    # back to the standing pose
        stand(True)
    elif path == '/go':
        goahead()
    elif path == '/back':
        goback()
    elif path == '/left':
        for _ in range(5):
            turnleft()
    elif path == '/right':
        for _ in range(5):
            turnright()
    elif path == '/punch':
        punch()
    elif path == '/kick':
        kick()
    elif path == '/pushup':
        pushup()
    stand()                                 # every action ends exactly like /reset
    time.sleep_ms(10)
`

// ============================ Dance =====================================
const dance = HEADER('Program 3: dance show', FILES2, `#
# Seven moves, each one a plain loop, plus a show() that strings them
# together. Change the order in show() and you have a new performance.
#
# How to use:
#   1) Save main.py to the board and run it. ang.json is created on the first
#      run if it is missing.
#   2) The robot stands up, dances one round, then repeats.
#   3) Put the robot on a table with 1 m of clear space around it.
#
# Warning: the first move folds the body forward 70 deg. If your robot tends
# to fall forward, raise LEAN above 0 before dancing.
`) + HW + STAND_SMOOTH + `

# ---------- 2. The moves ----------
` + DANCE_MOVES + `

# ---------- 3. The show ----------
# One line per move. Reorder them, repeat them, delete them - that is the
# whole choreography language.
def show():
    stand()
    nod()
    nod()
    twist()
    twist()
    flap()
    toe_tap()
    toe_tap()
    toe_tap()
    toe_tap()
    peacock()
    lotus()
    lotus()
    bow()
    stand()


# ---------- 4. Run ----------
stand()
time.sleep(1)

while True:
    show()
    time.sleep(2)
`

// ============================ AI ========================================
const AI_FILES = `#   ang.json     the twelve joint angles of the standing pose (edit to tune)
#   main.py      this program
#   ssd1306.py   the OLED driver that import ssd1306 needs`

const ai = HEADER('Program 4: talk to it', AI_FILES, `#
# The AI is NOT in this program. The AI module does the listening and the
# thinking, then sends one short phrase over UART. This program only has to
# recognise that phrase and act.
#
# How to use:
#   1) Save main.py and ssd1306.py to the board (same folder), then run main.py.
#      ang.json is created on the first run if it is missing.
#   2) Wire the AI module to UART2: its TX -> GPIO16 (RX), its RX -> GPIO17,
#      and share GND. Baud rate 115200.
#   3) Paste the prompt of the chapter into the AI module.
#   4) Say the wake phrase and watch the OLED face change, then the arm move.
`, 'import ssd1306\n', SAME_FILE, 'Pin, PWM, UART, I2C') + HW + `
LEAN = 0                                  # >0 leans the body forward
LEG_R = ANG['leg_r'] + LEAN
LEG_L = ANG['leg_l'] - LEAN
pos['leg_r'], pos['leg_l'] = LEG_R, LEG_L
` + AI_BODY + `
# ---------- 5. Run ----------
stand()
face('idle')
print('ready')

while True:
    listen()
    time.sleep_ms(20)            # 50 checks per second is plenty for speech
`

const files = [
  [`${DIR}/stand/main.py`, stand],
  [`${DIR}/wifi/main.py`, wifi],
  [`${DIR}/dance/main.py`, dance],
  [`${DIR}/ai/main.py`, ai],
]

for (const [path, body] of files) {
  const lines = body.split('\n').length
  console.log(`${path.split('/v2/')[1].padEnd(14)} ${String(lines).padStart(4)} lines  ${body.length} chars`)
  if (!DRY) writeFileSync(path, body)
}

// sanity: the ang.json handling must be identical in all four programs
const SHARED_FROM = 'ANG_FILE = "ang.json"'
const SHARED_TO = 'print("ANG =", ANG)\n'
const shared = files.map(([path, body]) => {
  const a = body.indexOf(SHARED_FROM)
  const b = body.indexOf(SHARED_TO)
  if (a < 0 || b < 0) throw new Error('shared block not found in ' + path)
  return { path, block: body.slice(a, b + SHARED_TO.length) }
})
const first = shared[0].block
for (const s of shared.slice(1)) {
  if (s.block !== first) {
    console.log('  MISMATCH: ang.json handling differs in ' + s.path)
    first.split('\n').forEach((line, i) => {
      const other = s.block.split('\n')[i]
      if (line !== other) console.log(`    line ${i + 1}:\n      A: ${line}\n      B: ${other}`)
    })
    process.exitCode = 1
  }
}
if (!process.exitCode) console.log(`  ang.json block identical in all ${files.length} programs (${first.length} chars)`)

// sanity: no CJK anywhere except the AI command table, no tabs
for (const [path, body] of files) {
  const cjk = (body.match(/[\u4e00-\u9fff]/g) || []).length
  if (cjk && !path.includes('/ai/')) console.log('  WARNING cjk in ' + path + ': ' + cjk)
  if (body.includes('\t')) console.log('  WARNING tab in ' + path)
}
console.log(DRY ? '\n(dry)' : '\nwritten')
