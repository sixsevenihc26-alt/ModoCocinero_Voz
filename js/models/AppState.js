export class AppState {
  constructor() {
    this.screen = 'home';
    this.query = '';
    this.category = null;
    this.recipeId = null;
    this.step = 0;
    this.hasSavedProgress = false;
    this.selectedServings = null;

    this.micListening = false;
    this.voiceSessionActive = false;
    this.voiceStatus = 'La voz se activará al comenzar una receta';
    this.lastTranscript = '';

    this.filters = {
      difficulty: 'todas',
      maxTime: null,
      servings: null
    };

    this.settings = {
      micEnabled: true,
      autoVoice: true,
      readSpeed: 'normal',
      voiceVolume: 70,
      voiceConfirm: true,
      theme: 'light',
      contrast: false,
      textSize: 'normal'
    };
  }

  navigate(screen, extra = {}) {
    this.screen = screen;
    Object.assign(this, extra);
  }

  resetCook(recipeId) {
    this.screen = 'cook';
    this.recipeId = recipeId;
    this.step = 0;
    this.lastTranscript = '';
    this.voiceStatus = 'Preparando el primer paso…';
  }

  saveProgress() {
    if (!this.recipeId) return;

    const progress = {
      recipeId: this.recipeId,
      step: this.step,
      category: this.category,
      selectedServings: this.selectedServings
    };

    localStorage.setItem('modo-cocinero-progress', JSON.stringify(progress));
    this.hasSavedProgress = true;
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem('modo-cocinero-progress');
      if (!raw) return false;

      const progress = JSON.parse(raw);
      if (!progress?.recipeId) return false;

      this.recipeId = progress.recipeId;
      this.step = Math.max(0, Number(progress.step) || 0);
      this.category = progress.category ?? null;
      this.selectedServings = Number(progress.selectedServings) || null;
      this.hasSavedProgress = true;
      return true;
    } catch (error) {
      console.warn('No se pudo recuperar el progreso.', error);
      this.clearProgress();
      return false;
    }
  }

  clearProgress() {
    localStorage.removeItem('modo-cocinero-progress');
    this.recipeId = null;
    this.step = 0;
    this.hasSavedProgress = false;
  }
}
