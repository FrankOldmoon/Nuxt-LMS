# ============================================================
# Biped robot - Program 3: dance show
#
# Seven moves, each one a plain loop, plus a show() that strings them
# together. Change the order in show() and you have a new performance.
#
# How to use:
#   1) Paste this file into Thonny, save it to the robot as main.py.
#   2) Run it. The robot stands up, dances one round, then repeats.
#   3) Put the robot on a table with 1 m of clear space around it.
#
# Warning: the first move bends forward 70 deg. If your robot tends to fall
# forward, raise LEAN a little BEFORE dancing (see Program 1).
# ============================================================

from machine import Pin, PWM
import time

# ---------- 1. Calibration (same table as Program 1 and 2) ----------
ANG = {'hip_r': 52, 'knee_r': 54, 'ankle_r': 91,
       'hip_l': 135, 'knee_l': 142, 'ankle_l': 95,
       'shoulder_r': 32, 'arm_r': 144, 'hand_r': 40,
       'shoulder_l': 146, 'arm_l': 37, 'hand_l': 153}

LEAN = 3

PINS = {'hip_r': 14, 'knee_r': 13, 'ankle_r': 12,
        'hip_l': 5, 'knee_l': 4, 'ankle_l': 2,
        'shoulder_r': 15, 'arm_r': 25, 'hand_r': 26,
        'shoulder_l': 27, 'arm_l': 32, 'hand_l': 33}

HIP_R = ANG['hip_r'] + LEAN
HIP_L = ANG['hip_l'] - LEAN

srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}
pos = dict(ANG)
pos['hip_r'], pos['hip_l'] = HIP_R, HIP_L


def w(joint, deg):
    """Set one joint to an angle in degrees."""
    pos[joint] = int(deg)
    srv[joint].duty(int(deg * 0.56) + 25)


def stand():
    """Ease every joint back to the standing pose, all at the same time."""
    target = dict(ANG)
    target['hip_r'], target['hip_l'] = HIP_R, HIP_L
    while pos != target:
        for j in ANG:
            if pos[j] < target[j]:
                w(j, pos[j] + 1)
            elif pos[j] > target[j]:
                w(j, pos[j] - 1)
        time.sleep_ms(8)


# ---------- 2. The moves ----------
# Every move is the same shape: a loop that walks one variable from 0 to N,
# with each joint written as  base + k * variable.  Change k and the joint
# moves further; change the loop length and the move gets slower.
# Reminder for the signs: right side = bigger angle lifts, left side = smaller.

def bow():                              # 鞠躬 - fold forward from the hips
    for a in range(70):
        w('hip_r', ANG['hip_r'] + a)
        w('hip_l', ANG['hip_l'] - a)
        w('knee_r', ANG['knee_r'] + a / 2)
        w('knee_l', ANG['knee_l'] - a / 2)
        w('shoulder_r', ANG['shoulder_r'] + a)
        w('hand_r', ANG['hand_r'] + a)
        time.sleep_ms(10)
    time.sleep_ms(600)
    for a in range(70):
        w('hip_r', ANG['hip_r'] + 70 - a)
        w('hip_l', ANG['hip_l'] - 70 + a)
        w('knee_r', ANG['knee_r'] + 35 - a / 2)
        w('knee_l', ANG['knee_l'] - 35 + a / 2)
        w('shoulder_r', ANG['shoulder_r'] + 70 - a)
        w('hand_r', ANG['hand_r'] + 70 - a)
        time.sleep_ms(10)


def nod():                              # 点头 - tap the right toe twice
    for _ in range(2):
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + a)
            time.sleep_ms(17)
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + 13 - a)
            time.sleep_ms(17)


def twist():                            # 扭胯 - hips sway, arms punch out one at a time
    for _ in range(4):
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + a)
            w('ankle_l', ANG['ankle_l'] - a)
            w('shoulder_r', ANG['shoulder_r'] + 100 - 2 * a)
            w('hand_r', ANG['hand_r'] + 70)
            w('arm_l', ANG['arm_l'] + 90 - 2 * a)
            w('hand_l', ANG['hand_l'] + 2 * a)
            time.sleep_ms(17)
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + 14 - a)
            w('ankle_l', ANG['ankle_l'] - 14 + a)
            w('shoulder_r', ANG['shoulder_r'] + 72 + 2 * a)
            w('hand_r', ANG['hand_r'] + 70)
            w('arm_l', ANG['arm_l'] + 62 + 2 * a)
            w('hand_l', ANG['hand_l'] + 28 - 2 * a)
            time.sleep_ms(17)
    for _ in range(4):
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + a)
            w('ankle_l', ANG['ankle_l'] - a)
            w('shoulder_l', ANG['shoulder_l'] - 100 + 2 * a)
            w('hand_l', ANG['hand_l'] - 70)
            w('arm_r', ANG['arm_r'] - 90 + 2 * a)
            w('hand_r', ANG['hand_r'] - 2 * a)
            time.sleep_ms(17)
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + 14 - a)
            w('ankle_l', ANG['ankle_l'] - 14 + a)
            w('shoulder_l', ANG['shoulder_l'] - 72 - 2 * a)
            w('hand_l', ANG['hand_l'] - 70)
            w('arm_r', ANG['arm_r'] - 62 - 2 * a)
            w('hand_r', ANG['hand_r'] - 28 + 2 * a)
            time.sleep_ms(17)


def flap():                             # 摆臂 - both arms swing like wings
    for _ in range(4):
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + a)
            w('ankle_l', ANG['ankle_l'] - a)
            w('shoulder_r', ANG['shoulder_r'] + 80 - 2 * a)
            w('arm_r', ANG['arm_r'] - 90)
            w('hand_r', ANG['hand_r'] + 90)
            w('arm_l', ANG['arm_l'] + 2 * a)
            w('hand_l', ANG['hand_l'] - 4 * a)
            time.sleep_ms(17)
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + 14 - a)
            w('ankle_l', ANG['ankle_l'] - 14 + a)
            w('shoulder_r', ANG['shoulder_r'] + 52 + 2 * a)
            w('arm_r', ANG['arm_r'] - 90)
            w('hand_r', ANG['hand_r'] + 90)
            w('arm_l', ANG['arm_l'] + 28 - 2 * a)
            w('hand_l', ANG['hand_l'] - 56 + 4 * a)
            time.sleep_ms(17)
    for _ in range(4):
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + a)
            w('ankle_l', ANG['ankle_l'] - a)
            w('shoulder_l', ANG['shoulder_l'] - 140 + 2 * a)
            w('arm_l', ANG['arm_l'] + 90)
            w('hand_l', ANG['hand_l'] - 90)
            w('shoulder_r', ANG['shoulder_r'] + 140 - 2 * a)
            w('arm_r', ANG['arm_r'] - 90)
            w('hand_r', ANG['hand_r'] + 90)
            time.sleep_ms(17)
        for a in range(14):
            w('ankle_r', ANG['ankle_r'] + 14 - a)
            w('ankle_l', ANG['ankle_l'] - 14 + a)
            w('shoulder_l', ANG['shoulder_l'] - 112 - 2 * a)
            w('arm_l', ANG['arm_l'] + 90)
            w('hand_l', ANG['hand_l'] - 90)
            w('shoulder_r', ANG['shoulder_r'] + 112 + 2 * a)
            w('arm_r', ANG['arm_r'] - 90)
            w('hand_r', ANG['hand_r'] + 90)
            time.sleep_ms(17)


def toe_tap():                          # 点脚 - toe taps while both arms are up
    w('shoulder_r', ANG['shoulder_r'] + 90)
    w('shoulder_l', ANG['shoulder_l'] - 90)
    w('hand_r', ANG['hand_r'] + 90)
    w('hand_l', ANG['hand_l'] - 90)
    for a in range(14):
        w('ankle_r', ANG['ankle_r'] + a)
        w('shoulder_r', ANG['shoulder_r'] + 75 + 2 * a)
        w('shoulder_l', ANG['shoulder_l'] - 105 + 2 * a)
        time.sleep_ms(17)
    for a in range(14):
        w('ankle_r', ANG['ankle_r'] + 13 - a)
        w('shoulder_r', ANG['shoulder_r'] + 103 - 2 * a)
        w('shoulder_l', ANG['shoulder_l'] - 77 - 2 * a)
        time.sleep_ms(17)


def fan(base, step, open_arm):
    """One 20-step slice of the peacock move.

    base = where the hips start, step = +1 while going down, -1 while coming up,
    open_arm picks which of the two arm poses this slice uses.
    """
    if open_arm:
        w('arm_r', ANG['arm_r'] - 70)
        w('hand_r', ANG['hand_r'] - 60)
        w('arm_l', ANG['arm_l'] + 130)
        w('hand_l', ANG['hand_l'] - 30)
    else:
        w('arm_r', ANG['arm_r'] - 130)
        w('hand_r', ANG['hand_r'] + 30)
        w('arm_l', ANG['arm_l'] + 70)
        w('hand_l', ANG['hand_l'] + 60)
    for a in range(20):
        h = base + step * a
        w('hip_r', ANG['hip_r'] + h)
        w('knee_r', ANG['knee_r'] + h / 2)
        w('hip_l', ANG['hip_l'] - h)
        w('knee_l', ANG['knee_l'] - h / 2)
        time.sleep_ms(25)


def peacock():                          # 孔雀开屏 - deep squat, arms open and close
    w('shoulder_r', ANG['shoulder_r'] + 70)
    w('shoulder_l', ANG['shoulder_l'] - 70)
    fan(0, 1, True)
    fan(20, 1, False)
    fan(40, 1, True)
    fan(60, 1, False)
    fan(80, -1, True)
    fan(60, -1, False)
    fan(40, -1, True)
    fan(20, -1, False)


def lotus():                            # 莲花手 - the arm flourish at the end
    w('shoulder_r', ANG['shoulder_r'])
    w('shoulder_l', ANG['shoulder_l'])
    w('arm_r', ANG['arm_r'] - 100)
    w('arm_l', ANG['arm_l'] + 100)
    w('hand_r', ANG['hand_r'])
    for a in range(20):
        w('hand_l', ANG['hand_l'] + a)
        time.sleep_ms(8)
    for a in range(40):
        w('hand_l', ANG['hand_l'] + 20 - 2 * a)
        w('arm_l', ANG['arm_l'] + 100 + a)
        time.sleep_ms(8)
    for a in range(40):
        w('arm_l', ANG['arm_l'] + 140 - a)
        time.sleep_ms(8)
    for a in range(20):
        w('hand_l', ANG['hand_l'] - 60 + 4 * a)
        w('arm_l', ANG['arm_l'] + 100 - a)
        w('hand_r', ANG['hand_r'] + a)
        w('arm_r', ANG['arm_r'] - 100 - a)
        time.sleep_ms(8)
    for a in range(20):
        w('hand_l', ANG['hand_l'] + 20 - a)
        w('arm_l', ANG['arm_l'] + 80 + a)
        w('hand_r', ANG['hand_r'] + 20 + 2 * a)
        w('arm_r', ANG['arm_r'] - 120 - a)
        time.sleep_ms(8)
    for a in range(40):
        w('arm_r', ANG['arm_r'] - 140 + a)
        time.sleep_ms(8)
    for a in range(20):
        w('hand_r', ANG['hand_r'] + 60 - 4 * a)
        w('arm_r', ANG['arm_r'] - 100 + a)
        time.sleep_ms(8)
    for a in range(20):
        w('hand_r', ANG['hand_r'] - 20 + a)
        w('arm_r', ANG['arm_r'] - 80 - a)
        time.sleep_ms(8)


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
