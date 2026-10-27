# Biped robot - standing pose only.
# Writes every joint once from ANG, then holds still.
# To tune: edit a value in ANG, save, and run again.

from machine import Pin, PWM
import time

# Standing pose: body upright, both arms hanging straight down.
ANG = {'leg_r': 30, 'knee_r': 54, 'ankle_r': 91,
       'leg_l': 150, 'knee_l': 142, 'ankle_l': 95,
       'shoulder_r': 32, 'arm_r': 144, 'hand_r': 40,
       'shoulder_l': 150, 'arm_l': 37, 'hand_l': 130}

PINS = {'leg_r': 14, 'knee_r': 13, 'ankle_r': 12,
        'leg_l': 5, 'knee_l': 4, 'ankle_l': 2,
        'shoulder_r': 15, 'arm_r': 25, 'hand_r': 26,
        'shoulder_l': 27, 'arm_l': 32, 'hand_l': 33}

srv = {j: PWM(Pin(p, Pin.OUT), freq=50) for j, p in PINS.items()}


def w(joint, deg):
    # 0 deg needs a 0.5 ms pulse, 180 deg needs 2.5 ms. At 50 Hz duty() spans
    # 0..1023, so 0 deg is 26 counts and 180 deg is 127: duty = deg * 0.56 + 25.
    srv[joint].duty(int(deg * 0.56) + 25)


def stand():
    # Write every joint to its ANG value.
    for j, d in ANG.items():
        w(j, d)


stand()

while True:
    time.sleep(1)
