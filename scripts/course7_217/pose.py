# ============================================================
# Biped robot - Program 1: pose tester
#
# The smallest useful program: 12 servos, one helper, three poses.
# Use it to find the number every joint needs in the standing pose.
#
# How to use:
#   1) Paste this file into Thonny.
#   2) Save it to the robot as main.py, then run it.
#   3) Watch which joint is wrong, then change ONLY the numbers in ANG.
#   4) To test one joint by hand: press Ctrl-C to stop the loop,
#      then type e.g.  w('knee_l', 150)  and press Enter.
# ============================================================

from machine import Pin, PWM
import time

# ---------- 1. Calibration: angle of every joint in the standing pose ----------
# These are the class robot's numbers. Every robot is a little different, so
# your own robot will need its own numbers. Change nothing but the numbers.
ANG = {'hip_r': 52, 'knee_r': 54, 'ankle_r': 91,
       'hip_l': 135, 'knee_l': 142, 'ankle_l': 95,
       'shoulder_r': 32, 'arm_r': 144, 'hand_r': 40,
       'shoulder_l': 146, 'arm_l': 37, 'hand_l': 153}

# ---------- 2. Which GPIO pin drives which joint ----------
# Same pin order as the wiring tutorial: right leg, left leg, right arm, left arm.
PINS = {'hip_r': 14, 'knee_r': 13, 'ankle_r': 12,
        'hip_l': 5, 'knee_l': 4, 'ankle_l': 2,
        'shoulder_r': 15, 'arm_r': 25, 'hand_r': 26,
        'shoulder_l': 27, 'arm_l': 32, 'hand_l': 33}

LEAN = 3   # forward lean while standing. Raise it if the robot tips backwards.

# One PWM channel per joint, all at 50 Hz (the rate every hobby servo expects).
srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}


def w(joint, deg):
    """Turn one joint to an angle in degrees.

    A servo expects a 0.5 ms pulse for 0 deg and a 2.5 ms pulse for 180 deg.
    At 50 Hz one period is 20 ms, and duty() is 0..1023 on the ESP32, so
    0 deg -> 26, 180 deg -> 127.  That is exactly  deg * 0.56 + 25.
    """
    srv[joint].duty(int(deg * 0.56) + 25)


def pose(**over):
    """Drive all twelve joints: standing pose first, then apply the overrides.

    pose(hip_r=80) means: stand, but with the right hip at 80 deg.
    """
    for j, d in ANG.items():
        w(j, d)
    for j, d in over.items():
        w(j, d)


def stand():
    """The pose the robot should hold when nothing else is happening."""
    pose(hip_r=ANG['hip_r'] + LEAN, hip_l=ANG['hip_l'] - LEAN)


# ---------- 3. Three test poses, one per group of joints ----------
# Signs matter: on the right side a bigger number lifts the limb, on the left
# side a smaller number does. That is why the left values are always negated.
def t_pose():          # both arms out sideways -> checks the two shoulders
    pose(shoulder_r=ANG['shoulder_r'] + 90,
         shoulder_l=ANG['shoulder_l'] - 90)


def squat():           # knees bent -> checks hips, knees and ankles together
    pose(hip_r=ANG['hip_r'] + 35, hip_l=ANG['hip_l'] - 35,
         knee_r=ANG['knee_r'] + 35, knee_l=ANG['knee_l'] - 35)


def wave(times=4):     # right arm up, hand swinging -> checks one single joint
    pose(shoulder_r=ANG['shoulder_r'] + 130, arm_r=90)
    for _ in range(times):
        for d in range(70, 111, 5):
            w('hand_r', d)
            time.sleep_ms(20)
        for d in range(110, 69, -5):
            w('hand_r', d)
            time.sleep_ms(20)


# ---------- 4. Run the show ----------
stand()
time.sleep(2)

while True:
    t_pose()
    time.sleep(2)
    squat()
    time.sleep(2)
    wave()
    time.sleep(1)
    stand()
    time.sleep(2)
