# Biped robot - standing pose only
#
# Files on the board:
#   ang.json   the twelve joint angles of the standing pose (edit to tune)
#   main.py    this program
#
# Calibrate once here. Every other program in this chapter loads this same
# file, so the pose you tune now is the pose they all use.
#
# One program, one job: read the twelve angles, write them once to every joint,
# then hold still. To tune: edit ang.json on the board, reset, run again.
#
# The first run creates ang.json if it is missing, so there is always a file
# to open and edit.

from machine import Pin, PWM
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


def stand():
    # Write every joint to its ANG value.
    for j in PINS:            # PINS order: deterministic, all joints covered
        w(j, ANG[j])


stand()

while True:
    time.sleep(1)
