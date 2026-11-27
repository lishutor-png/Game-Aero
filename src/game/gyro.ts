import type { ControlSource } from '../types/game';

export type ControlActionKey = 'left' | 'right' | 'up' | 'down' | 'shoot';

export class FlightInputController {
  private heldKeys = new Set<ControlActionKey>();
  private heldButtons = new Set<ControlActionKey>();

  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragSteer = 0;
  private dragVertical = 0;

  private sensitivity = 1.15;
  private activeSource: ControlSource = 'keyboard';

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;

  constructor() {
    this.boundKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.heldKeys.add('left');
        this.activeSource = 'keyboard';
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.heldKeys.add('right');
        this.activeSource = 'keyboard';
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.heldKeys.add('up');
        this.activeSource = 'keyboard';
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.heldKeys.add('down');
        this.activeSource = 'keyboard';
      } else if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyF') {
        this.heldKeys.add('shoot');
        this.activeSource = 'keyboard';
      }
    };

    this.boundKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.heldKeys.delete('left');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.heldKeys.delete('right');
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.heldKeys.delete('up');
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.heldKeys.delete('down');
      } else if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyF') {
        this.heldKeys.delete('shoot');
      }
    };

    this.boundBlur = () => {
      this.clearAll();
    };
  }

  public clearAll(): void {
    this.heldKeys.clear();
    this.heldButtons.clear();
    this.dragPointerId = null;
    this.dragSteer = 0;
    this.dragVertical = 0;
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
    this.clearAll();
  }

  public configure(opts: { sensitivity: number }): void {
    this.sensitivity = opts.sensitivity;
  }

  public setControlButton(action: ControlActionKey, pressed: boolean): void {
    if (pressed) {
      this.heldButtons.add(action);
      this.activeSource = 'touch';
    } else {
      this.heldButtons.delete(action);
    }
  }

  public handleTouchStart(clientX: number, clientY = 0, id = 0): void {
    if (this.dragPointerId !== null) return;
    this.dragPointerId = id;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.dragSteer = 0;
    this.dragVertical = 0;
    this.activeSource = 'touch';
  }

  public handleTouchMove(clientX: number, clientY = 0, id = 0): void {
    if (this.dragPointerId !== id) return;
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    const maxSwipeX = Math.max(65, window.innerWidth * 0.16);
    const maxSwipeY = Math.max(50, window.innerHeight * 0.18);
    const mult = 0.7 + this.sensitivity * 0.4;
    this.dragSteer = Math.max(-1, Math.min(1, (dx / maxSwipeX) * mult));
    this.dragVertical = Math.max(-1, Math.min(1, (-dy / maxSwipeY) * mult));
    this.activeSource = 'touch';
  }

  public handleTouchEnd(id = 0): void {
    if (this.dragPointerId !== id) return;
    this.dragPointerId = null;
    this.dragSteer = 0;
    this.dragVertical = 0;
  }

  public sample(): {
    steer: number;
    vertical: number;
    shooting: boolean;
    source: ControlSource;
  } {
    const left = this.heldKeys.has('left') || this.heldButtons.has('left') ? 1 : 0;
    const right = this.heldKeys.has('right') || this.heldButtons.has('right') ? 1 : 0;
    const up = this.heldKeys.has('up') || this.heldButtons.has('up') ? 1 : 0;
    const down = this.heldKeys.has('down') || this.heldButtons.has('down') ? 1 : 0;
    const shooting = this.heldKeys.has('shoot') || this.heldButtons.has('shoot');

    const btnSteer = right - left;
    const btnVert = up - down;

    const steerScale = Math.min(1.15, 0.8 + this.sensitivity * 0.2);

    let steer = 0;
    let vertical = 0;

    if (btnSteer !== 0) {
      steer = Math.max(-1, Math.min(1, btnSteer * steerScale));
    } else if (this.dragPointerId !== null) {
      steer = this.dragSteer;
    }

    if (btnVert !== 0) {
      vertical = Math.max(-1, Math.min(1, btnVert * steerScale));
    } else if (this.dragPointerId !== null) {
      vertical = this.dragVertical;
    }

    return {
      steer,
      vertical,
      shooting,
      source: this.activeSource,
    };
  }
}
