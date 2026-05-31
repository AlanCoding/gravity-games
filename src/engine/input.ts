const GAME_KEYS = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyP',
  'KeyR',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
];

export class InputController {
  private readonly pressed = new Set<string>();
  private jumpQueued = false;
  private readonly abortController = new AbortController();

  bind(): void {
    window.addEventListener(
      'keydown',
      event => {
        if (!this.isGameKey(event.code)) {
          return;
        }
        event.preventDefault();
        const wasPressed = this.pressed.has(event.code);
        this.pressed.add(event.code);
        if (event.code === 'Space' && !wasPressed) {
          this.jumpQueued = true;
        }
      },
      { signal: this.abortController.signal },
    );

    window.addEventListener(
      'keyup',
      event => {
        if (!this.isGameKey(event.code)) {
          return;
        }
        event.preventDefault();
        this.pressed.delete(event.code);
      },
      { signal: this.abortController.signal },
    );
  }

  isPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  consumeJump(): boolean {
    const jumpRequested = this.jumpQueued;
    this.jumpQueued = false;
    return jumpRequested;
  }

  dispose(): void {
    this.abortController.abort();
  }

  private isGameKey(code: string): boolean {
    return GAME_KEYS.includes(code);
  }
}
