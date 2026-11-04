# Biped robot - Program 2: WiFi remote
#
# Files on the board:
#   ang.json      the twelve joint angles of the standing pose (edit to tune)
#   control.html  the page the phone shows (edit it, then reload the page)
#   main.py       this program
#
# ang.json is the same file as in Activity 1. Calibrate once, and every
# program after it stands up correctly.
#
# How to use:
#   1) Put your WiFi name and password in WIFI_SSID / WIFI_PASS.
#   2) Save main.py and control.html to the board. ang.json is created on the
#      first run if it is not there yet.
#   3) Run main.py and read the IP address in the Shell, e.g. 192.168.1.23
#   4) Type that address into the phone browser. The phone must be on the
#      same WiFi - the robot has no internet access.

from machine import Pin, PWM
import network
import socket
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

srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}
pos = dict(ANG)             # last angle written to each joint


def w(joint, deg):
    """Set one joint to an angle in degrees."""
    pos[joint] = int(deg)
    srv[joint].duty(int(deg * 0.56) + 25)

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
def goahead(steps=5):
    """Walk forward the given number of full gait cycles."""
    stand()
    w('leg_r', LEG_R - 2)
    w('leg_l', LEG_L + 2)
    time.sleep_ms(200)

    # Shift the weight, step with the left leg.
    for a in range(AHEAD_R):
        w('ankle_r', ANG['ankle_r'] - a)
        w('ankle_l', ANG['ankle_l'] - 5 - a)
        time.sleep_ms(SPEED * 10 + 30)
    time.sleep_ms(SPEED * 100 + 200)
    w('ankle_l', ANG['ankle_l'] - AHEAD_R)
    time.sleep_ms(SPEED * 50)
    for a in range(13):
        w('leg_r', LEG_R - a - 2)
        w('knee_r', ANG['knee_r'] - a)
        w('leg_l', LEG_L - a - 4)
        w('knee_l', ANG['knee_l'] - a + 4)
        w('shoulder_r', ANG['shoulder_r'] + 2 * a)
        time.sleep_ms(SPEED * 10 + 30)

    # Level the body, shift to the other side, step with the right leg.
    for a in range(AHEAD_R):
        w('ankle_r', ANG['ankle_r'] - AHEAD_R + a)
        w('ankle_l', ANG['ankle_l'] - AHEAD_R + a)
        time.sleep_ms(SPEED * 20 + 20)
    time.sleep_ms(SPEED * 100 + 500)
    for a in range(AHEAD_L):
        w('ankle_l', ANG['ankle_l'] + a)
        w('ankle_r', ANG['ankle_r'] + 5 + a)
        time.sleep_ms(SPEED * 10 + 30)
    time.sleep_ms(SPEED * 100 + 200)
    w('ankle_r', ANG['ankle_r'] + AHEAD_L)
    time.sleep_ms(SPEED * 50)
    for a in range(13):
        w('leg_r', LEG_R - 15 + a)
        w('knee_r', ANG['knee_r'] - 13 + a)
        w('leg_l', LEG_L - 13 + a - 2)
        w('knee_l', ANG['knee_l'] - 13 + a)
        w('shoulder_r', ANG['shoulder_r'] - 2 * a + 52)
        w('shoulder_l', ANG['shoulder_l'] - 2 * a)
        time.sleep_ms(SPEED * 10 + 20)

    # Remaining gait cycles.
    for _ in range(steps):
        for a in range(13):
            w('leg_r', LEG_R + a - 2)
            w('knee_r', ANG['knee_r'] + a - 3)
            w('leg_l', LEG_L + a - 2)
            w('knee_l', ANG['knee_l'] + a - 3)
            w('shoulder_r', ANG['shoulder_r'] - 2 * a + 26)
            w('shoulder_l', ANG['shoulder_l'] - 2 * a - 26)
            time.sleep_ms(SPEED * 10 + 20)
        for a in range(AHEAD_L):
            w('ankle_r', ANG['ankle_r'] + AHEAD_L - a)
            w('ankle_l', ANG['ankle_l'] + AHEAD_L - a)
            time.sleep_ms(SPEED * 20 + 20)
        time.sleep_ms(SPEED * 100 + 500)
        for a in range(AHEAD_R):
            w('ankle_r', ANG['ankle_r'] - a)
            w('ankle_l', ANG['ankle_l'] - 5 - a)
            time.sleep_ms(SPEED * 20 + 20)
        time.sleep_ms(SPEED * 100)
        w('ankle_l', ANG['ankle_l'] - AHEAD_R)
        time.sleep_ms(SPEED * 50)
        for a in range(13):
            w('leg_r', LEG_R + 13 - a - 2)
            w('knee_r', ANG['knee_r'] + 13 - a)
            w('leg_l', LEG_L + 13 - a - 4)
            w('knee_l', ANG['knee_l'] + 13 - a + 4)
            w('shoulder_r', ANG['shoulder_r'] + 2 * a)
            w('shoulder_l', ANG['shoulder_l'] + 2 * a - 52)
            time.sleep_ms(SPEED * 10 + 20)

        for a in range(13):
            w('leg_r', LEG_R - a - 2)
            w('knee_r', ANG['knee_r'] - a)
            w('leg_l', LEG_L - a + 1)
            w('knee_l', ANG['knee_l'] - a + 4)
            w('shoulder_r', ANG['shoulder_r'] + 26 + 2 * a)
            w('shoulder_l', ANG['shoulder_l'] + 2 * a - 26)
            time.sleep_ms(SPEED * 10 + 20)
        for a in range(AHEAD_R):
            w('ankle_r', ANG['ankle_r'] - AHEAD_R + a)
            w('ankle_l', ANG['ankle_l'] - AHEAD_R + a)
            time.sleep_ms(SPEED * 20 + 20)
        time.sleep_ms(SPEED * 100 + 500)
        for a in range(AHEAD_L):
            w('ankle_l', ANG['ankle_l'] + a)
            w('ankle_r', ANG['ankle_r'] + 5 + a)
            time.sleep_ms(SPEED * 20 + 20)
        time.sleep_ms(SPEED * 100 + 200)
        w('ankle_r', ANG['ankle_r'] + AHEAD_L)
        time.sleep_ms(50)
        for a in range(13):
            w('leg_r', LEG_R - 13 + a - 2)
            w('knee_r', ANG['knee_r'] - 13 + a - 3)
            w('leg_l', LEG_L - 13 + a - 2)
            w('knee_l', ANG['knee_l'] - 13 + a)
            w('shoulder_r', ANG['shoulder_r'] - 2 * a + 52)
            w('shoulder_l', ANG['shoulder_l'] - 2 * a)
            time.sleep_ms(SPEED * 10 + 20)

    stand()


def goback(steps=5):
    """Walk backwards the given number of full gait cycles."""
    stand()
    for a in range(3):
        w('leg_r', LEG_R + a)
        w('leg_l', LEG_L - a)
        time.sleep_ms(50)

    for a in range(BACK_R):
        w('ankle_r', ANG['ankle_r'] - a)
        w('ankle_l', ANG['ankle_l'] - 5 - a)
        time.sleep_ms(SPEED * 10 + 20)
    time.sleep_ms(SPEED * 100 + 200)
    w('ankle_l', ANG['ankle_l'] - BACK_R)
    time.sleep_ms(SPEED * 50 + 50)
    for a in range(15):
        w('leg_r', LEG_R + a + 3)
        w('knee_r', ANG['knee_r'] + a)
        w('knee_l', ANG['knee_l'] - a / 3)
        w('shoulder_l', ANG['shoulder_l'] - 2 * a)
        time.sleep_ms(SPEED * 10 + 20)

    for a in range(BACK_R):
        w('ankle_r', ANG['ankle_r'] - BACK_R + a)
        w('ankle_l', ANG['ankle_l'] - BACK_R + a)
        time.sleep_ms(SPEED * 20 + 20)
    w('knee_l', ANG['knee_l'])
    time.sleep_ms(SPEED * 100 + 500)
    for a in range(BACK_L):
        w('ankle_l', ANG['ankle_l'] + a)
        w('ankle_r', ANG['ankle_r'] + 5 + a)
        time.sleep_ms(SPEED * 20 + 20)
    time.sleep_ms(SPEED * 100 + 200)
    w('ankle_r', ANG['ankle_r'] + BACK_L)
    time.sleep_ms(SPEED * 50)

    for _ in range(steps):
        for a in range(15):
            w('leg_r', LEG_R + 15 - a + 3)
            w('knee_r', ANG['knee_r'] + 15 - a + 5)
            w('leg_l', LEG_L - 3 - a)
            w('knee_l', ANG['knee_l'] - a)
            w('shoulder_r', ANG['shoulder_r'] + 2 * a)
            w('shoulder_l', ANG['shoulder_l'] - 30 + 2 * a)
            time.sleep_ms(SPEED * 20 + 20)
        for a in range(BACK_L):
            w('ankle_r', ANG['ankle_r'] + BACK_L - a)
            w('ankle_l', ANG['ankle_l'] + BACK_L - a)
            time.sleep_ms(SPEED * 20 + 20)
        w('knee_r', ANG['knee_r'])
        time.sleep_ms(SPEED * 100 + 500)
        for a in range(BACK_R):
            w('ankle_r', ANG['ankle_r'] - a)
            w('ankle_l', ANG['ankle_l'] - 5 - a)
            time.sleep_ms(SPEED * 20 + 30)
        w('ankle_l', ANG['ankle_l'] - BACK_R)
        time.sleep_ms(SPEED * 50 + 50)

        for a in range(15):
            w('leg_r', LEG_R + a + 3)
            w('knee_r', ANG['knee_r'] + a)
            w('leg_l', LEG_L - 15 + a - 3)
            w('knee_l', ANG['knee_l'] - 15 + a + 5)
            w('shoulder_r', ANG['shoulder_r'] + 30 - 2 * a)
            w('shoulder_l', ANG['shoulder_l'] - 2 * a)
            time.sleep_ms(SPEED * 10 + 30)
        for a in range(BACK_R):
            w('ankle_r', ANG['ankle_r'] - BACK_R + a)
            w('ankle_l', ANG['ankle_l'] - BACK_R + a)
            time.sleep_ms(SPEED * 20 + 20)
        w('knee_l', ANG['knee_l'])
        time.sleep_ms(SPEED * 100 + 500)
        for a in range(BACK_L):
            w('ankle_l', ANG['ankle_l'] + a)
            w('ankle_r', ANG['ankle_r'] + 5 + a)
            time.sleep_ms(SPEED * 20 + 20)
        time.sleep_ms(SPEED * 100 + 200)
        w('ankle_r', ANG['ankle_r'] + BACK_L)
        time.sleep_ms(SPEED * 50)

    stand()


def turnleft():
    """Turn in place to the left once."""
    for a in range(11):
        w('ankle_r', ANG['ankle_r'] + 5 + a)
        w('ankle_l', ANG['ankle_l'] + a)
        time.sleep_ms(SPEED * 10 + 20)
    time.sleep_ms(SPEED * 50 + 50)
    for a in range(16):
        w('leg_l', ANG['leg_l'] + a)
        w('knee_l', ANG['knee_l'] + a)
        w('leg_r', ANG['leg_r'] + a)
        w('knee_r', ANG['knee_r'] + a)
        time.sleep_ms(40)
    time.sleep_ms(SPEED * 50 + 50)
    for a in range(12):
        w('ankle_l', ANG['ankle_l'] + 10 - a)
        time.sleep_ms(SPEED * 30 + 30)
    for a in range(16):
        w('ankle_r', ANG['ankle_r'] + 16 - a)
        time.sleep_ms(20)
    time.sleep_ms(SPEED * 100 + 200)
    for a in range(16):
        w('leg_l', ANG['leg_l'] + 15 - a)
        w('knee_l', ANG['knee_l'] + 15 - a)
        w('leg_r', ANG['leg_r'] + 15 - a)
        w('knee_r', ANG['knee_r'] + 15 - a)
        time.sleep_ms(10)
    time.sleep_ms(SPEED * 50 + 50)


def turnright():
    """Turn in place to the right once."""
    for a in range(11):
        w('ankle_r', ANG['ankle_r'] - a)
        w('ankle_l', ANG['ankle_l'] - 5 - a)
        time.sleep_ms(SPEED * 10 + 20)
    time.sleep_ms(SPEED * 50 + 50)
    for a in range(16):
        w('leg_l', ANG['leg_l'] - a)
        w('knee_l', ANG['knee_l'] - a)
        w('leg_r', ANG['leg_r'] - a)
        w('knee_r', ANG['knee_r'] - a)
        time.sleep_ms(40)
    w('knee_l', ANG['knee_l'] - 16 + 6)
    time.sleep_ms(SPEED * 20 + 50)
    for a in range(11):
        w('ankle_r', ANG['ankle_r'] - 11 + a + 3)
        time.sleep_ms(SPEED * 30 + 30)
    for a in range(16):
        w('ankle_l', ANG['ankle_l'] - 16 + a)
        time.sleep_ms(20)
    time.sleep_ms(SPEED * 100 + 200)
    for a in range(16):
        w('leg_l', ANG['leg_l'] - 15 + a)
        w('knee_l', ANG['knee_l'] - 15 + a)
        w('leg_r', ANG['leg_r'] - 15 + a)
        w('knee_r', ANG['knee_r'] - 15 + a)
        time.sleep_ms(10)
    time.sleep_ms(SPEED * 50 + 50)


def kick():
    """Lean, swing the right leg back and kick."""
    for a in range(9):
        w('leg_r', LEG_R + a)
        w('leg_l', LEG_L - a)
        time.sleep_ms(50)
    for a in range(15):
        w('ankle_r', ANG['ankle_r'] + a)
        time.sleep_ms(10)
    for a in range(KICK_DEG):
        w('ankle_r', ANG['ankle_r'] + 15 + a)
        w('ankle_l', ANG['ankle_l'] + a)
        time.sleep_ms(80)
    for a in range(15):
        w('ankle_r', ANG['ankle_r'] + 30 - a)
        time.sleep_ms(10)
    for a in range(30):
        w('leg_r', LEG_R + 10 - a)
        w('knee_r', ANG['knee_r'] + 2 * a)
        w('shoulder_l', ANG['shoulder_l'] - 2 * a)
        w('hand_l', ANG['hand_l'] - 2 * a)
        time.sleep_ms(20)
    time.sleep_ms(1000)
    w('leg_r', LEG_R + 60)
    w('knee_r', ANG['knee_r'] + 10)
    time.sleep_ms(1000)
    stand()


def pushup():
    """Lie down on the hands, do three push-ups, then stand up."""
    for a in range(114):
        w('leg_r', ANG['leg_r'] + a)
        w('leg_l', ANG['leg_l'] - a)
        w('knee_r', ANG['knee_r'] + a / 2)
        w('knee_l', ANG['knee_l'] - a / 2)
        time.sleep_ms(30)
    for a in range(90):
        w('shoulder_r', ANG['shoulder_r'] + a)
        w('shoulder_l', ANG['shoulder_l'] - a)
        time.sleep_ms(5)
    for a in range(57):
        w('knee_r', ANG['knee_r'] + 57 - a)
        w('knee_l', ANG['knee_l'] - 57 + a)
        time.sleep_ms(10)
    for a in range(114):
        w('leg_r', LEG_R + 114 - a)
        w('leg_l', LEG_L - 114 + a)
        time.sleep_ms(10)
    time.sleep_ms(300)

    for _ in range(3):                      # number of push-ups
        for a in range(50):
            w('arm_r', ANG['arm_r'] - a)
            w('hand_r', ANG['hand_r'] + 2 * a)
            w('arm_l', ANG['arm_l'] + a)
            w('hand_l', ANG['hand_l'] - 2 * a)
            time.sleep_ms(10)
        for a in range(50):
            w('arm_r', ANG['arm_r'] - 50 + a)
            w('hand_r', ANG['hand_r'] + 100 - 2 * a)
            w('arm_l', ANG['arm_l'] + 50 - a)
            w('hand_l', ANG['hand_l'] - 100 + 2 * a)
            time.sleep_ms(10)

    for a in range(100 + RISE_DEG):         # tuck the thighs
        w('leg_r', LEG_R + a)
        w('leg_l', LEG_L - a)
        time.sleep_ms(10)
    time.sleep_ms(500)
    for a in range(60):
        w('knee_r', ANG['knee_r'] + a)
        w('knee_l', ANG['knee_l'] - a)
        time.sleep_ms(30)
    for a in range(90):
        w('shoulder_r', ANG['shoulder_r'] + 90 - a)
        w('shoulder_l', ANG['shoulder_l'] - 90 + a)
        time.sleep_ms(5)
    for a in range(10):
        w('knee_r', ANG['knee_r'] + 60 + a)
        w('knee_l', ANG['knee_l'] - 60 - a)
        time.sleep_ms(5)
    for a in range(10):
        w('leg_r', LEG_R + 100 + RISE_DEG - a)
        w('leg_l', LEG_L - 100 - RISE_DEG + a)
        time.sleep_ms(3)
    for a in range(RISE_DEG):
        w('leg_r', LEG_R + 90 + RISE_DEG - a)
        w('leg_l', LEG_L - 90 - RISE_DEG + a)
        time.sleep_ms(30)
    time.sleep_ms(100)
    for a in range(15):
        w('knee_r', ANG['knee_r'] + 70 - a)
        w('knee_l', ANG['knee_l'] - 70 + a)
        w('leg_r', LEG_R + 92 - a)
        w('leg_l', LEG_L - 92 + a)
        time.sleep_ms(50)
    time.sleep_ms(100)
    for a in range(15):
        w('knee_r', ANG['knee_r'] + 55 - a)
        w('knee_l', ANG['knee_l'] - 55 + a)
        w('leg_r', LEG_R + 77 - a)
        w('leg_l', LEG_L - 77 + a)
        time.sleep_ms(50)
    time.sleep_ms(100)
    for a in range(10):
        w('leg_r', LEG_R + 62 - a)
        w('leg_l', LEG_L - 62 + a)
        time.sleep_ms(50)
    for a in range(40):
        w('knee_r', ANG['knee_r'] + 40 - a)
        w('knee_l', ANG['knee_l'] - 40 + a)
        w('leg_r', LEG_R + 52 - a)
        w('leg_l', LEG_L - 52 + a)
        time.sleep_ms(50)
    for a in range(12):
        w('leg_r', LEG_R + 12 - a)
        w('leg_l', LEG_L - 12 + a)
        time.sleep_ms(50)


def punch():
    """Bend down, raise both fists and throw five punches."""
    stand()
    for a in range(30):
        w('knee_r', ANG['knee_r'] + a)
        w('knee_l', ANG['knee_l'] - a)
        w('leg_r', LEG_R + 2 * a)
        w('leg_l', LEG_L - 2 * a)
        time.sleep_ms(50)
    for a in range(25):
        w('leg_r', LEG_R + 60 - a)
        w('leg_l', LEG_L - 60 + a)
        time.sleep_ms(50)
    time.sleep_ms(100)
    time.sleep_ms(300)
    w('shoulder_r', ANG['shoulder_r'] + 110)
    w('shoulder_l', ANG['shoulder_l'] - 110)
    time.sleep_ms(100)
    for a in range(60):                     # pull the fists in
        w('arm_r', ANG['arm_r'] - a)
        w('hand_r', ANG['hand_r'] + 2 * a)
        w('arm_l', ANG['arm_l'] + a)
        w('hand_l', ANG['hand_l'] - 2 * a)
        time.sleep_ms(10)
    time.sleep_ms(500)
    for a in range(60):
        w('arm_r', ANG['arm_r'] - 60 + a)
        w('hand_r', ANG['hand_r'] + 120 - 2 * a)
        time.sleep_ms(3)
    time.sleep_ms(500)

    for _ in range(5):                      # number of punches per arm
        for a in range(60):
            w('arm_r', ANG['arm_r'] - a)
            w('hand_r', ANG['hand_r'] + 2 * a)
            w('arm_l', ANG['arm_l'] + 60 - a)
            w('hand_l', ANG['hand_l'] - 120 + 2 * a)
            time.sleep_ms(3)
        time.sleep_ms(500)
        for a in range(60):
            w('arm_r', ANG['arm_r'] - 60 + a)
            w('hand_r', ANG['hand_r'] + 120 - 2 * a)
            w('arm_l', ANG['arm_l'] + a)
            w('hand_l', ANG['hand_l'] - 2 * a)
            time.sleep_ms(3)
        time.sleep_ms(500)

    for a in range(30):                     # straighten up
        w('knee_r', ANG['knee_r'] + 30 - a)
        w('knee_l', ANG['knee_l'] - 30 + a)
        w('leg_r', LEG_R + 35 - a)
        w('leg_l', LEG_L - 35 + a)
        time.sleep_ms(50)
    for a in range(5):
        w('leg_r', LEG_R + 5 - a)
        w('leg_l', LEG_L - 5 + a)
        time.sleep_ms(20)
    stand()


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
        conn.send('HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n'
                  'Content-Length: %d\r\nCache-Control: no-store\r\n'
                  'Connection: close\r\n\r\n' % len(page))
        conn.send(page)
        conn.close()
        continue

    # Answer first, move second: the phone gets its reply while the robot
    # is still standing still.
    conn.send('HTTP/1.1 204 No Content\r\nCache-Control: no-store\r\n'
              'Connection: close\r\n\r\n')
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
