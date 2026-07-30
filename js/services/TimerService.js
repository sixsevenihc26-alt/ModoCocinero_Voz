export class TimerService {
  constructor(onUpdate, onFinish) {
    this.onUpdate = onUpdate;
    this.onFinish = onFinish;
    this.intervalId = null;
    this.initialSeconds = 0;
    this.seconds = 0;
    this.running = false;
    this.started = false;
    this.completed = true;
    this.completedEarly = false;
  }

  prepare(seconds = 0) {
    this.stop();
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    this.initialSeconds = safe;
    this.seconds = safe;
    this.started = false;
    this.completed = safe <= 0;
    this.completedEarly = false;
    this.onUpdate?.(this);
  }

  start() {
    if (this.running || this.completed || this.seconds <= 0) return false;

    this.started = true;
    this.running = true;
    this.onUpdate?.(this);

    this.intervalId = window.setInterval(() => {
      this.seconds -= 1;

      if (this.seconds <= 0) {
        this.seconds = 0;
        this.completed = true;
        this.completedEarly = false;
        this.stop();
        this.onUpdate?.(this);
        this.onFinish?.(this);
        return;
      }

      this.onUpdate?.(this);
    }, 1000);

    return true;
  }

  pause() {
    if (!this.running) return false;
    this.stop();
    this.onUpdate?.(this);
    return true;
  }

  reset() {
    if (this.initialSeconds <= 0) return false;
    this.stop();
    this.seconds = this.initialSeconds;
    this.started = false;
    this.completed = false;
    this.completedEarly = false;
    this.onUpdate?.(this);
    return true;
  }

  markReady() {
    if (this.initialSeconds <= 0 || this.completed) return false;
    this.stop();
    this.seconds = 0;
    this.started = true;
    this.completed = true;
    this.completedEarly = true;
    this.onUpdate?.(this);
    return true;
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
    }
    this.intervalId = null;
    this.running = false;
  }

  hasTimer() {
    return this.initialSeconds > 0;
  }

  canAdvance() {
    return !this.hasTimer() || this.completed;
  }

  format(value = this.seconds) {
    const safe = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
    const seconds = (safe % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  durationForSpeech(value = this.seconds) {
    const safe = Math.max(0, Math.round(Number(value) || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;

    if (minutes > 0 && seconds > 0) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
    }
    if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  }
}
