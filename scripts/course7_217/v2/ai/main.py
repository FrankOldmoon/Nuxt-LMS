# Biped robot - Program 4: talk to it
#
# Files on the board:
#   ang.json     the twelve joint angles of the standing pose (edit to tune)
#   main.py      this program
#   ssd1306.py   the OLED driver that import ssd1306 needs
#
# ang.json is the same file as in Activity 1. Calibrate once, and every
# program after it stands up correctly.
#
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

from machine import Pin, PWM, UART, I2C
import ssd1306
import time

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
            f.write('{\n' + ',\n'.join(rows) + '\n}\n')
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

srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}
pos = dict(ANG)             # last angle written to each joint


def w(joint, deg):
    """Set one joint to an angle in degrees."""
    pos[joint] = int(deg)
    srv[joint].duty(int(deg * 0.56) + 25)

LEAN = 0                                  # >0 leans the body forward
LEG_R = ANG['leg_r'] + LEAN
LEG_L = ANG['leg_l'] - LEAN
pos['leg_r'], pos['leg_l'] = LEG_R, LEG_L
def ramp(target, steps=20, ms=15):
    """Move several joints to new angles at the same time.

    target is a dict like {'shoulder_r': 140, 'hand_r': 90}. Joints that are
    not in target keep their angle. The move is spread over `steps` frames so
    the servos glide instead of jumping - a jump risks a fall.
    """
    start = {j: pos[j] for j in target}
    for i in range(1, steps + 1):
        for j, d in target.items():
            w(j, start[j] + (d - start[j]) * i / steps)
        time.sleep_ms(ms)


def stand(steps=18):
    """Back to the standing pose, whatever the robot was doing before."""
    target = dict(ANG)
    target['leg_r'] = LEG_R
    target['leg_l'] = LEG_L
    ramp(target, steps, 12)


# ---------- 2. A face that shows what the robot thinks ----------
i2c = I2C(scl=Pin(22), sda=Pin(23))
oled = ssd1306.SSD1306_I2C(128, 64, i2c)


def face(mood='idle'):
    """Draw one of three moods with plain rectangles and lines - no bitmaps."""
    oled.fill(0)
    if mood == 'happy':
        oled.fill_rect(40, 24, 10, 4, 1)          # eyes, half closed
        oled.fill_rect(78, 24, 10, 4, 1)
        oled.hline(50, 44, 6, 1)                  # a smile made of three lines
        oled.hline(56, 47, 16, 1)
        oled.hline(72, 44, 6, 1)
    elif mood == 'angry':
        oled.line(38, 20, 52, 27, 1)              # slanted brows
        oled.line(90, 20, 76, 27, 1)
        oled.fill_rect(42, 32, 10, 6, 1)
        oled.fill_rect(76, 32, 10, 6, 1)
        oled.hline(52, 50, 24, 1)                 # flat mouth
    else:                                         # idle
        oled.fill_rect(42, 24, 10, 10, 1)
        oled.fill_rect(76, 24, 10, 10, 1)
        oled.hline(54, 46, 20, 1)
    oled.show()


# ---------- 3. Six actions the voice can trigger ----------
def wave():
    ramp({'shoulder_r': ANG['shoulder_r'] + 130, 'arm_r': 95})
    for _ in range(3):
        ramp({'hand_r': 70}, 6, 20)
        ramp({'hand_r': 110}, 6, 20)
    stand()


def bow():
    ramp({'leg_r': ANG['leg_r'] + 45, 'leg_l': ANG['leg_l'] - 45,
          'knee_r': ANG['knee_r'] + 22, 'knee_l': ANG['knee_l'] - 22,
          'shoulder_r': ANG['shoulder_r'] + 45})
    time.sleep_ms(500)
    stand()


def kick():
    ramp({'leg_r': LEG_R + 12, 'leg_l': LEG_L - 12})        # lean back a little
    ramp({'knee_r': ANG['knee_r'] + 55}, 12, 20)            # wind up
    ramp({'knee_r': ANG['knee_r'], 'ankle_r': ANG['ankle_r'] + 25}, 6, 8)   # kick!
    time.sleep_ms(400)
    stand()


def punch():
    ramp({'shoulder_r': ANG['shoulder_r'] + 110,
          'shoulder_l': ANG['shoulder_l'] - 110,
          'arm_r': ANG['arm_r'] - 60, 'arm_l': ANG['arm_l'] + 60})
    for _ in range(2):
        ramp({'arm_r': ANG['arm_r'], 'arm_l': ANG['arm_l']}, 5, 6)     # out
        ramp({'arm_r': ANG['arm_r'] - 60, 'arm_l': ANG['arm_l'] + 60}, 5, 6)
    stand()


def squat():
    ramp({'leg_r': ANG['leg_r'] + 30, 'leg_l': ANG['leg_l'] - 30,
          'knee_r': ANG['knee_r'] + 30, 'knee_l': ANG['knee_l'] - 30})
    time.sleep_ms(600)
    stand()


def dance():
    bow()
    wave()
    kick()


# ---------- 4. What the AI module says -> what the robot does ----------
# (phrase to look for, face to show, action to run)
# The phrase is in Chinese because the AI module speaks Chinese. If you set the
# module up in English, just edit the left column.
CMDS = (('挥手', 'happy', wave),
        ('鞠躬', 'happy', bow),
        ('踢球', 'angry', kick),
        ('打拳', 'angry', punch),
        ('蹲下', 'idle', squat),
        ('跳舞', 'happy', dance),
        ('起立', 'idle', stand))

uart = UART(2, 115200)          # GPIO16 = RX, GPIO17 = TX on the ESP32


def listen():
    """Read one line from the AI module, run the first matching command."""
    if not uart.any():
        return
    try:
        line = uart.readline().decode('utf-8').strip()
    except Exception:            # half a line, wrong baud rate, noise
        return
    if not line:
        return
    print('heard:', line)
    for key, mood, action in CMDS:
        if key in line:
            face(mood)
            action()
            face('idle')
            return

# ---------- 5. Run ----------
stand()
face('idle')
print('ready')

while True:
    listen()
    time.sleep_ms(20)            # 50 checks per second is plenty for speech
