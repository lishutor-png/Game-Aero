import type { ControlSource } from '../types/game';

export class FlightInputController {
  private heldKeys = new Set<string>();
  private touchActive = false;
  private touchStartX = 0;
  private touchSteer = 0;

  private sensitivity = 1.15;
  private activeSource: ControlSource = 'keyboard';

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;

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
  }

  public attach(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
    this.heldKeys.clear();
  }

  public configure(opts: { sensitivity: number }): void {
    this.sensitivity = opts.sensitivity;
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
    const maxSwipe = Math.max(65, window.innerWidth * 0.16);
    this.touchSteer = Math.max(-1, Math.min(1, (dx / maxSwipe) * (0.7 + this.sensitivity * 0.4)));
    this.activeSource = 'touch';
  }

  public handleTouchEnd(): void {
    this.touchActive = false;
    this.touchSteer = 0;
  }

  public sample(): { steer: number; source: ControlSource } {
    const keyLeft = this.heldKeys.has('left') ? 1 : 0;
    const keyRight = this.heldKeys.has('right') ? 1 : 0;
    if (keyLeft || keyRight) {
      const kSteer = (keyRight - keyLeft) * Math.min(1.15, 0.8 + this.sensitivity * 0.2);
      this.activeSource = 'keyboard';
      return { steer: Math.max(-1, Math.min(1, kSteer)), source: 'keyboard' };
    }

    if (this.touchActive) {
      return { steer: this.touchSteer, source: 'touch' };
    }

    return { steer: 0, source: this.activeSource };
  }
}
