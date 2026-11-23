import type { ControlSource } from '../types/game';

export interface GyroPermissionResult {
  supported: boolean;
  granted: boolean;
  message: string;
}

export class FlightInputController {
  private heldKeys = new Set<string>();
  private rawGamma = 0; // degrees left-right tilt
  private zeroOffset = 0;
  private hasGyroData = false;
  private touchActive = false;
  private touchStartX = 0;
  private touchSteer = 0;

  private gyroEnabled = true;
  private sensitivity = 1.25;
  private deadzoneDeg = 3.0;
  private invertGyro = false;

  private activeSource: ControlSource = 'keyboard';
  private lastTiltDeg = 0;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;
  private boundOrientation: (e: DeviceOrientationEvent) => void;

  constructor() {
    this.boundKeyDown = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.heldKeys.add('left');
        this.activeSource = 'keyboard';
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.heldKeys.add('right');
        this.activeSource = 'keyboard';
      }
    };

    this.boundKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.heldKeys.delete('left');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.heldKeys.delete('right');
      }
    };

    this.boundBlur = () => {
      this.heldKeys.clear();
      this.touchActive = false;
      this.touchSteer = 0;
    };

    this.boundOrientation = (e) => {
      // Only left-right tilt! Use gamma (portrait) or beta (landscape)
      let tilt: number | null = null;
      const angle = window.screen?.orientation?.angle ?? 0;
      if (angle === 90) {
        tilt = typeof e.beta === 'number' ? e.beta : null;
      } else if (angle === -90 || angle === 270) {
        tilt = typeof e.beta === 'number' ? -e.beta : null;
      } else {
        tilt = typeof e.gamma === 'number' ? e.gamma : null;
      }

      if (tilt !== null && Number.isFinite(tilt)) {
        this.rawGamma = tilt;
        this.hasGyroData = true;
        if (this.gyroEnabled && Math.abs(tilt - this.zeroOffset) > this.deadzoneDeg) {
          this.activeSource = 'gyro';
        }
      }
    };
  }

  public attach(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
    window.addEventListener('deviceorientation', this.boundOrientation);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
    window.removeEventListener('deviceorientation', this.boundOrientation);
    this.heldKeys.clear();
  }

  public configure(opts: {
    gyroEnabled: boolean;
    sensitivity: number;
    deadzoneDeg: number;
    invertGyro: boolean;
  }): void {
    this.gyroEnabled = opts.gyroEnabled;
    this.sensitivity = opts.sensitivity;
    this.deadzoneDeg = opts.deadzoneDeg;
    this.invertGyro = opts.invertGyro;
  }

  public calibrateCenter(): number {
    this.zeroOffset = this.rawGamma;
    return this.zeroOffset;
  }

  public async requestGyroPermission(): Promise<GyroPermissionResult> {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return {
        supported: false,
        granted: false,
        message: 'Perangkat ini tidak memiliki sensor giroskop. Gunakan tombol A/D, Panah, atau geser layar.',
      };
    }

    const DevOrient = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DevOrient.requestPermission === 'function') {
      try {
        const response = await DevOrient.requestPermission();
        if (response === 'granted') {
          this.calibrateCenter();
          return {
            supported: true,
            granted: true,
            message: 'Sensor giroskop diaktifkan! Miringkan perangkat ke kiri atau kanan.',
          };
        }
        return {
          supported: true,
          granted: false,
          message: 'Izin sensor giroskop ditolak. Anda tetap bisa memakai sentuh layar atau keyboard.',
        };
      } catch {
        return {
          supported: true,
          granted: false,
          message: 'Gagal meminta izin sensor giroskop.',
        };
      }
    }

    this.calibrateCenter();
    return {
      supported: true,
      granted: true,
      message: this.hasGyroData
        ? 'Giroskop aktif dan terkalibrasi di posisi tengah.'
        : 'Giroskop siap (jika tersedia di perangkat Anda). Keyboard & sentuh juga aktif.',
    };
  }

  public handleTouchStart(clientX: number): void {
    this.touchActive = true;
    this.touchStartX = clientX;
    this.touchSteer = 0;
    this.activeSource = 'touch';
  }

  public handleTouchMove(clientX: number): void {
    if (!this.touchActive) return;
    const dx = clientX - this.touchStartX;
    const maxSwipe = Math.max(70, window.innerWidth * 0.18);
    this.touchSteer = Math.max(-1, Math.min(1, (dx / maxSwipe) * (0.7 + this.sensitivity * 0.35)));
    this.activeSource = 'touch';
  }

  public handleTouchEnd(): void {
    this.touchActive = false;
    this.touchSteer = 0;
  }

  public sample(): { steer: number; tiltDeg: number; source: ControlSource } {
    // 1. Keyboard priority when pressed
    const keyLeft = this.heldKeys.has('left') ? 1 : 0;
    const keyRight = this.heldKeys.has('right') ? 1 : 0;
    if (keyLeft || keyRight) {
      const kSteer = keyRight - keyLeft;
      this.lastTiltDeg = kSteer * 24;
      this.activeSource = 'keyboard';
      return { steer: kSteer, tiltDeg: this.lastTiltDeg, source: 'keyboard' };
    }

    // 2. Touch drag fallback
    if (this.touchActive) {
      this.lastTiltDeg = this.touchSteer * 26;
      return { steer: this.touchSteer, tiltDeg: this.lastTiltDeg, source: 'touch' };
    }

    // 3. Left-Right Gyroscope
    if (this.gyroEnabled && this.hasGyroData) {
      let delta = this.rawGamma - this.zeroOffset;
      if (this.invertGyro) delta = -delta;

      this.lastTiltDeg = delta;
      if (Math.abs(delta) <= this.deadzoneDeg) {
        return { steer: 0, tiltDeg: delta, source: 'gyro' };
      }

      const effective = delta - Math.sign(delta) * this.deadzoneDeg;
      const maxTiltForFullSteer = 28 / this.sensitivity;
      const steer = Math.max(-1, Math.min(1, effective / maxTiltForFullSteer));
      return { steer, tiltDeg: delta, source: 'gyro' };
    }

    this.lastTiltDeg = 0;
    return { steer: 0, tiltDeg: 0, source: this.activeSource };
  }
}
