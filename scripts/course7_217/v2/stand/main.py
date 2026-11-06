# Biped robot - standing pose tuner over WiFi
#
# Files on the board:
#   ang.json   the twelve joint angles of the standing pose (edit to tune)
#   main.py    this program
#
# How to use:
#   1. Power the board. It joins WiFi "MINXIN-S" and prints its IP address.
#   2. Open http://<board-ip>/ in a phone or laptop browser.
#   3. Slide any of the twelve servos between 0 and 180, it moves live.
#   4. Press "保存到 ang.json" to write the pose to disk.
#   5. Press "重新读取" to reload ang.json and put the robot back in that pose.
#
# Every other program in this chapter loads the same ang.json, so the pose
# you tune here is the pose they all use.
#
# Tip: move the sliders a little at a time. Twelve servos all moving at once
# pull a lot of current - use a separate 5-6 V supply for the servos, and
# keep the board's ground connected to the servo ground.

from machine import Pin, PWM
import time
import network
import socket

try:
    import json
except ImportError:          # some MicroPython builds expose ujson only
    import ujson as json

ANG_FILE = "ang.json"

WIFI_SSID = "MINXIN-S"
WIFI_PASS = "Minxin520"

# Fallback pose, used if ang.json is missing or malformed.
DEFAULT_ANG = {'leg_r': 30, 'knee_r': 54, 'ankle_r': 91,
               'leg_l': 150, 'knee_l': 142, 'ankle_l': 95,
               'shoulder_r': 32, 'arm_r': 144, 'hand_r': 40,
               'shoulder_l': 150, 'arm_l': 37, 'hand_l': 130}

PINS = {'leg_r': 14, 'knee_r': 13, 'ankle_r': 12,
        'leg_l': 5, 'knee_l': 4, 'ankle_l': 2,
        'shoulder_r': 15, 'arm_r': 25, 'hand_r': 26,
        'shoulder_l': 27, 'arm_l': 32, 'hand_l': 33}


# --------------------------------------------------------------------------
# ang.json helpers
# --------------------------------------------------------------------------

def save_ang(path, ang):
    """Write the twelve angles to disk, three per line, like the chapter."""
    keys = list(PINS)
    rows = []
    for i in range(0, len(keys), 3):
        rows.append('  ' + ', '.join('"%s": %g' % (j, ang[j]) for j in keys[i:i + 3]))
    try:
        with open(path, 'w') as f:
            f.write('{\n' + ',\n'.join(rows) + '\n}\n')
        print("wrote", path)
        return True
    except OSError as e:
        print("cannot write %s (%s)" % (path, e))
        return False


def load_ang(path):
    """Read the pose file. If it is not on the board yet, create it."""
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


# --------------------------------------------------------------------------
# Servos
# --------------------------------------------------------------------------

ANG = load_ang(ANG_FILE)
print("ANG =", ANG)

srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}
pos = dict(ANG)             # last angle written to each joint


def w(joint, deg):
    """Set one joint to an angle in degrees (clamped to 0..180)."""
    deg = int(deg)
    if deg < 0:
        deg = 0
    elif deg > 180:
        deg = 180
    pos[joint] = deg
    srv[joint].duty(int(deg * 0.56) + 25)


def stand():
    # Write every joint to its ANG value.
    for j in PINS:            # PINS order: deterministic, all joints covered
        w(j, ANG[j])


stand()


# --------------------------------------------------------------------------
# WiFi
# --------------------------------------------------------------------------

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    for attempt in range(3):
        if wlan.isconnected():
            break
        print("connecting to %s ... (try %d)" % (WIFI_SSID, attempt + 1))
        try:
            wlan.connect(WIFI_SSID, WIFI_PASS)
        except OSError as e:
            print("connect error:", e)
        t0 = time.time()
        while not wlan.isconnected() and time.time() - t0 < 15:
            time.sleep(0.5)
    if wlan.isconnected():
        ip = wlan.ifconfig()[0]
        print("WiFi ok - open http://%s/ in a browser" % ip)
        return ip
    print("WiFi failed - robot will just hold the standing pose")
    return None


# --------------------------------------------------------------------------
# Tiny HTTP server
# --------------------------------------------------------------------------

def urldecode(s):
    """Minimal %xx decoder - enough for joint names and numbers."""
    s = s.replace('+', ' ')
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == '%' and i + 2 < len(s):
            try:
                out.append(chr(int(s[i + 1:i + 3], 16)))
                i += 3
                continue
            except ValueError:
                pass
        out.append(c)
        i += 1
    return ''.join(out)


def parse_request(req):
    line = req.split("\r\n", 1)[0]
    parts = line.split()
    if len(parts) < 2:
        return None, {}
    target = parts[1]
    path, _, query = target.partition("?")
    params = {}
    for kv in query.split("&"):
        if not kv:
            continue
        k, _, v = kv.partition("=")
        params[urldecode(k)] = urldecode(v)
    return path, params


def send(cl, body, status="200 OK", ctype="text/html; charset=utf-8"):
    if isinstance(body, str):
        body = body.encode()
    hdr = ("HTTP/1.1 %s\r\n"
           "Content-Type: %s\r\n"
           "Content-Length: %d\r\n"
           "Cache-Control: no-store\r\n"
           "Connection: close\r\n\r\n" % (status, ctype, len(body)))
    cl.send(hdr.encode())
    cl.send(body)


def read_request(cl):
    data = b""
    cl.settimeout(2)
    try:
        while b"\r\n\r\n" not in data and len(data) < 2048:
            chunk = cl.recv(512)
            if not chunk:
                break
            data += chunk
    except OSError:
        pass
    return data.decode()


def handle(cl, req):
    global ANG

    path, params = parse_request(req)
    if path is None:
        send(cl, "bad request", "400 Bad Request", "text/plain")
        return

    if path in ("/", "/index.html", "/stand.html"):
        # Build the page with the current angles baked in, so the sliders
        # show ang.json's values (or DEFAULT_ANG) on first paint - no 90 deg flash.
        send(cl, stand_html())

    elif path == "/angles":
        send(cl, json.dumps(pos), ctype="application/json")

    elif path == "/set":
        joint = params.get("joint")
        try:
            deg = float(params.get("deg"))
        except (TypeError, ValueError):
            deg = None
        if joint in PINS and deg is not None:
            w(joint, deg)
            send(cl, json.dumps({"joint": joint, "deg": pos[joint]}),
                 ctype="application/json")
        else:
            send(cl, json.dumps({"error": "bad joint or angle"}),
                 "400 Bad Request", "application/json")

    elif path == "/save":
        # The sliders have already moved the servos, so pos is the live pose.
        for j in PINS:
            ANG[j] = pos[j]
        ok = save_ang(ANG_FILE, ANG)
        send(cl, json.dumps({"ok": ok, "file": ANG_FILE, "angles": ANG}),
             ctype="application/json")

    elif path == "/reload":
        ANG = load_ang(ANG_FILE)
        for j in PINS:
            w(j, ANG[j])
        send(cl, json.dumps({"ok": True, "angles": pos}), ctype="application/json")

    else:
        send(cl, "not found", "404 Not Found", "text/plain")


def serve():
    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(addr)
    s.listen(4)
    s.settimeout(0.5)
    print("listening on port 80")
    while True:
        try:
            cl, remote = s.accept()
        except OSError:
            continue                       # timeout, just loop again
        try:
            handle(cl, read_request(cl))
        except Exception as e:
            print("request error:", e)
        finally:
            try:
                cl.close()
            except Exception:
                pass


# --------------------------------------------------------------------------
# The tuning page, served straight from flash (no stand.html file needed)
# --------------------------------------------------------------------------

STAND_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Biped Servo Tuner</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         margin: 0; padding: 16px 16px 90px; background: #111; color: #eee; }
  h1   { font-size: 17px; margin: 0 0 10px; font-weight: 600; }
  .sub { font-size: 12px; color: #777; margin-bottom: 12px; line-height: 1.5; }
  .row { display: grid; grid-template-columns: 108px 1fr 46px;
         align-items: center; gap: 10px; padding: 7px 0;
         border-bottom: 1px solid #1e1e1e; }
  .name { font-size: 13px; color: #8cc; line-height: 1.25; }
  .name i { font-style: normal; font-size: 11px; color: #567; }
  input[type=range] { width: 100%; height: 26px; accent-color: #3c9; }
  .val { font-size: 13px; text-align: right; color: #fc6;
         font-variant-numeric: tabular-nums; }
  .bar { position: fixed; left: 0; right: 0; bottom: 0;
         background: #181818; border-top: 1px solid #2a2a2a;
         padding: 12px 16px; display: flex; gap: 10px; align-items: center; }
  button { font-size: 14px; padding: 11px 16px; border: 0; border-radius: 8px;
           background: #2b7a4b; color: #fff; }
  button.alt { background: #2a4a6a; }
  button:active { transform: scale(0.97); }
  #msg { font-size: 12px; color: #8c8; }
</style>
</head>
<body>
<h1>Biped Servo Tuner</h1>
<div class="sub">Drag a slider (0&ndash;180&deg;) to move one servo live.
When the pose looks right, press &ldquo;Save to ang.json&rdquo;.</div>
<div id="list"></div>

<div class="bar">
  <button id="save">Save to ang.json</button>
  <button id="reload" class="alt">Reload</button>
  <span id="msg"></span>
</div>

<script>
const JOINTS = [
  ["leg_r",      "R hip",      "leg_r"],
  ["knee_r",     "R knee",     "knee_r"],
  ["ankle_r",    "R ankle",    "ankle_r"],
  ["leg_l",      "L hip",      "leg_l"],
  ["knee_l",     "L knee",     "knee_l"],
  ["ankle_l",    "L ankle",    "ankle_l"],
  ["shoulder_r", "R shoulder", "shoulder_r"],
  ["arm_r",      "R arm",      "arm_r"],
  ["hand_r",     "R hand",     "hand_r"],
  ["shoulder_l", "L shoulder", "shoulder_l"],
  ["arm_l",      "L arm",      "arm_l"],
  ["hand_l",     "L hand",     "hand_l"]
];

/* __ANG__ is replaced by the board with the live pose (ang.json or DEFAULT_ANG). */
const ANG0 = __ANG__;

const el = {};
const box = document.getElementById('list');
const msg = document.getElementById('msg');

for (const [j, label, code] of JOINTS) {
  let start = ANG0[j];
  if (start === undefined) start = 90;
  start = Math.round(Number(start));
  if (!isFinite(start)) start = 90;
  if (start < 0) start = 0;
  if (start > 180) start = 180;
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML =
    '<span class="name">' + label + '<br><i>' + code + '</i></span>' +
    '<input type="range" min="0" max="180" step="1" value="' + start + '">' +
    '<span class="val">' + start + '</span>';
  box.appendChild(row);
  const inp = row.querySelector('input');
  const val = row.querySelector('.val');
  el[j] = { inp: inp, val: val, timer: null };
  inp.addEventListener('input', function () { onMove(j); });
}

/* Live move: at most one request per joint every 60 ms. */
function onMove(j) {
  const e = el[j];
  e.val.textContent = e.inp.value;
  if (e.timer) return;
  e.timer = setTimeout(function () {
    e.timer = null;
    fetch('/set?joint=' + j + '&deg=' + e.inp.value).catch(function () {});
  }, 60);
}

async function refresh() {
  msg.textContent = 'Reading current angles...';
  try {
    const r = await fetch('/angles');
    const ang = await r.json();
    for (const [j] of JOINTS) {
      if (ang[j] === undefined) continue;
      el[j].inp.value = ang[j];
      el[j].val.textContent = ang[j];
    }
    msg.textContent = 'Angles loaded';
  } catch (e) {
    msg.textContent = 'Read failed';
  }
}

document.getElementById('save').onclick = async function () {
  msg.textContent = 'Saving...';
  try {
    // Flush anything still waiting in a throttle timer.
    for (const [j] of JOINTS) {
      const e = el[j];
      clearTimeout(e.timer);
      e.timer = null;
      await fetch('/set?joint=' + j + '&deg=' + e.inp.value);
    }
    const r = await fetch('/save');
    const d = await r.json();
    msg.textContent = d.ok ? 'Saved to ang.json' : 'Save failed';
  } catch (e) {
    msg.textContent = 'Save failed';
  }
};

document.getElementById('reload').onclick = refresh;

msg.textContent = 'Pose loaded';
</script>
</body>
</html>
"""


def stand_html():
    """Inject the live pose into the page so the sliders start at the real
    angles (ang.json, or DEFAULT_ANG when the file is missing).
    A plain replace() is used because the CSS already contains '%' signs."""
    return STAND_HTML.replace('__ANG__', json.dumps(pos))


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

if connect_wifi() is None:
    # No network: keep holding the standing pose so the robot stays safe.
    while True:
        time.sleep(1)

serve()
