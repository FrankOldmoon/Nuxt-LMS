# ============================================================
# Biped robot - Program 4: talk to it
#
# The AI is NOT in this program. The AI module (XIAO ZHI) does the
# listening and the thinking, then sends one short Chinese phrase over
# UART. This program only has to recognise that phrase and act.
#
# How to use:
#   1) Wire the AI module to UART2: its TX -> GPIO16 (RX), its RX -> GPIO17,
#      and share GND. Baud rate 115200.
#   2) Paste this file into Thonny, save it to the robot as main.py.
#   3) Paste the prompt of section 3 into the AI module (see the chapter).
#   4) Say "挥挥手" and watch the OLED face change, then the arm move.
# ============================================================

from machine import Pin, PWM, UART, I2C
import ssd1306
import time

# ---------- 1. Calibration (same table as Program 1-3) ----------
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
    pos[joint] = int(deg)
    srv[joint].duty(int(deg * 0.56) + 25)


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
    target['hip_r'] = HIP_R
    target['hip_l'] = HIP_L
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
    ramp({'hip_r': ANG['hip_r'] + 45, 'hip_l': ANG['hip_l'] - 45,
          'knee_r': ANG['knee_r'] + 22, 'knee_l': ANG['knee_l'] - 22,
          'shoulder_r': ANG['shoulder_r'] + 45})
    time.sleep_ms(500)
    stand()


def kick():
    ramp({'hip_r': HIP_R + 12, 'hip_l': HIP_L - 12})        # lean back a little
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
    ramp({'hip_r': ANG['hip_r'] + 30, 'hip_l': ANG['hip_l'] - 30,
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
