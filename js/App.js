import { AppState } from './models/AppState.js';
import { RecipeService } from './services/RecipeService.js';
import { SettingsService } from './services/SettingsService.js';
import { CookingTimeService } from './services/CookingTimeService.js';
import { TimerService } from './services/TimerService.js';
import { VoiceService } from './services/VoiceService.js';
import { FavoritesService } from './services/FavoritesService.js';
import { HistoryService } from './services/HistoryService.js';
import { AppRenderer } from './views/AppRenderer.js';

export class ModoCocineroApp {
  constructor() {
    this.state = new AppState();
    this.recipes = new RecipeService();
    this.settings = new SettingsService(this.state);
    this.cookingTimes = new CookingTimeService();
    this.favorites = new FavoritesService();
    this.history = new HistoryService();

    this.timer = new TimerService(
      () => this.renderer?.updateTimer(),
      () => {
        this.renderer?.render();
        this.voice.feedback('Temporizador finalizado. Ya puedes decir siguiente paso.');
      }
    );

    this.voice = new VoiceService(this.state, {
      onStateChange: () => this.renderer?.render(),
      onMessage: message => this.toast(message),
      onNext: fromVoice => this.nextStep(fromVoice),
      onBack: fromVoice => this.previousStep(fromVoice),
      onRepeat: () => this.repeatStep(),
      onTimerStart: fromVoice => this.startTimer(fromVoice),
      onTimerPause: fromVoice => this.pauseTimer(fromVoice),
      onTimerReset: fromVoice => this.resetTimer(fromVoice),
      onFoodReady: fromVoice => this.markFoodReady(fromVoice),
      onRemainingTime: () => this.tellRemainingTime(),
      onReadIngredients: () => this.readIngredients(),
      onCurrentStep: () => this.tellCurrentStep(),
      onFinishRecipe: () => this.finishRecipeByVoice(),
      onGoHome: () => this.goHomeByVoice(),
      onIncreaseVolume: () => this.increaseVoiceVolume(),
      onSlowReading: () => this.slowReading()
    });

    this.renderer = new AppRenderer(this);
  }

  initialize() {
    this.settings.load();
    this.state.loadProgress();
    this.validateSavedProgress();
    this.renderer.render();
  }

  validateSavedProgress() {
    const recipe = this.currentRecipe();
    if (!this.state.recipeId) return;

    if (!recipe) {
      this.state.clearProgress();
      return;
    }

    this.state.step = Math.min(
      Math.max(0, this.state.step),
      recipe.steps.length - 1
    );

    if (!this.state.selectedServings) {
      this.state.selectedServings = recipe.servings;
    }
  }

  currentRecipe() {
    return this.recipes.getById(this.state.recipeId);
  }

  currentStep() {
    return this.currentRecipe()?.steps?.[this.state.step] ?? null;
  }

  goTo(screen, extra = {}) {
    this.timer.stop();
    if (screen !== 'cook') {
      this.voice.stopSession('La voz se activará al comenzar una receta');
    }
    this.state.navigate(screen, extra);
    this.renderer.render();
  }

  openRecipe(recipeId) {
    const recipe = this.recipes.getById(recipeId);
    if (!recipe) {
      this.toast('No se pudo abrir la receta.');
      return;
    }

    this.state.selectedServings = recipe.servings;
    this.goTo('recipe', { recipeId });
  }

  selectCategory(category) {
    this.goTo('explore', { category });
  }

  getStepTime(recipeId, stepIndex) {
    const recipe = this.recipes.getById(recipeId);
    const suggested = recipe?.steps?.[stepIndex]?.seconds ?? 0;
    return this.cookingTimes.get(recipeId, stepIndex, suggested);
  }

  setStepTime(recipeId, stepIndex, amount, unit) {
    if (this.state.screen === 'cook') {
      this.toast('El tiempo solo puede modificarse antes de iniciar el Modo Cocinero.');
      return;
    }

    const recipe = this.recipes.getById(recipeId);
    const step = recipe?.steps?.[stepIndex];
    if (!step || Number(step.seconds) <= 0) return;

    const value = Math.max(1, Math.round(Number(amount) || 0));
    const seconds = unit === 'min' ? value * 60 : value;
    this.cookingTimes.set(recipeId, stepIndex, seconds);
    this.toast(`Tiempo actualizado a ${this.durationForSpeech(seconds)}.`);
    this.renderer.render();
  }

  resetStepTime(recipeId, stepIndex) {
    if (this.state.screen === 'cook') return;
    this.cookingTimes.reset(recipeId, stepIndex);
    this.toast('Tiempo sugerido restablecido.');
    this.renderer.render();
  }

  resetRecipeTimes(recipeId) {
    if (this.state.screen === 'cook') return;
    this.cookingTimes.resetRecipe(recipeId);
    this.toast('Todos los tiempos sugeridos fueron restablecidos.');
    this.renderer.render();
  }

  startCook() {
    const recipe = this.currentRecipe();
    if (!recipe?.steps?.length) {
      this.toast('La receta no contiene pasos.');
      return;
    }

    this.voice.stopSession();
    this.state.resetCook(recipe.id);
    this.prepareCurrentStep();
    this.state.saveProgress();
    this.renderer.render();

    const message = this.stepAnnouncement('Primer paso.');
    const autoVoice = this.state.settings.micEnabled && this.state.settings.autoVoice;
    this.state.voiceStatus = autoVoice
      ? 'La voz se activará después de leer el primer paso'
      : 'Toca el micrófono para dar un comando';
    this.renderer.render();
    this.voice.announce(message, { startSession: autoVoice });
  }

  continueCook() {
    const recipe = this.currentRecipe();
    if (!recipe?.steps?.length) {
      this.state.clearProgress();
      this.goTo('home');
      return;
    }

    this.state.screen = 'cook';
    this.prepareCurrentStep();
    this.renderer.render();

    const autoVoice = this.state.settings.micEnabled && this.state.settings.autoVoice;
    this.voice.announce(
      this.stepAnnouncement(`Continuando desde el paso ${this.state.step + 1}.`),
      { startSession: autoVoice }
    );
  }

  prepareCurrentStep() {
    const step = this.currentStep();
    const seconds = step
      ? this.getStepTime(this.state.recipeId, this.state.step)
      : 0;
    this.timer.prepare(seconds);
  }

  stepAnnouncement(prefix = '') {
    const step = this.currentStep();
    if (!step) return prefix;

    const parts = [prefix, step.text].filter(Boolean);
    if (this.timer.hasTimer()) {
      parts.push(
        `Este paso tiene un tiempo de ${this.timer.durationForSpeech(this.timer.initialSeconds)}. ` +
        'Prepara primero la olla, el sartén, el horno o los utensilios. Cuando todo esté listo, di iniciar temporizador.'
      );
    }
    return parts.join(' ');
  }

  nextStep(fromVoice = false) {
    const recipe = this.currentRecipe();
    if (!recipe?.steps?.length) return;

    if (!this.timer.canAdvance()) {
      const message = this.timer.started
        ? `Aún faltan ${this.timer.durationForSpeech()}. Puedes esperar o decir ya está listo si el alimento terminó de cocinarse.`
        : `Este paso tiene un temporizador preparado para ${this.timer.durationForSpeech(this.timer.initialSeconds)}. Cuando estés listo, di iniciar temporizador.`;
      this.voice.feedback(message);
      return;
    }

    const isLastStep = this.state.step >= recipe.steps.length - 1;
    if (isLastStep) {
      this.completeRecipe();
      return;
    }

    this.timer.stop();
    this.state.step += 1;
    this.prepareCurrentStep();
    this.state.saveProgress();
    this.renderer.render();

    if (fromVoice) {
      this.voice.feedback(this.stepAnnouncement('Siguiente paso.'));
    } else if (this.timer.hasTimer()) {
      this.state.voiceStatus = `Temporizador preparado para ${this.timer.durationForSpeech(this.timer.initialSeconds)}.`;
      this.renderer.render();
    }
  }

  previousStep(fromVoice = false) {
    if (this.state.step <= 0) {
      if (fromVoice) this.voice.feedback('Ya estás en el primer paso.');
      return;
    }

    this.timer.stop();
    this.state.step -= 1;
    this.prepareCurrentStep();
    this.state.saveProgress();
    this.renderer.render();

    if (fromVoice) {
      this.voice.feedback(this.stepAnnouncement('Paso anterior.'));
    }
  }

  repeatStep() {
    const text = this.stepAnnouncement('Repetir instrucción.');
    if (text) this.voice.feedback(text);
  }

  startTimer(fromVoice = false) {
    if (!this.timer.hasTimer()) {
      if (fromVoice) this.voice.feedback('Este paso no tiene temporizador.');
      return;
    }

    if (this.timer.completed) {
      if (fromVoice) this.voice.feedback('El tiempo de este paso ya finalizó. Puedes decir siguiente paso.');
      return;
    }

    if (this.timer.running) return;
    const started = this.timer.start();
    this.renderer.render();

    if (started) {
      const message = `Temporizador iniciado. Tiempo: ${this.timer.durationForSpeech()}.`;
      if (fromVoice) this.voice.feedback(message);
      else {
        this.toast(message);
        this.state.voiceStatus = message;
      }
    }
  }

  pauseTimer(fromVoice = false) {
    if (!this.timer.running) {
      if (fromVoice) {
        this.voice.feedback(
          this.timer.started
            ? 'El temporizador ya está pausado.'
            : 'El temporizador todavía no comenzó.'
        );
      }
      return;
    }

    this.timer.pause();
    this.renderer.render();
    const message = `Temporizador pausado. Faltan ${this.timer.durationForSpeech()}.`;
    if (fromVoice) this.voice.feedback(message);
    else this.toast(message);
  }

  resetTimer(fromVoice = false) {
    if (!this.timer.hasTimer()) return;
    this.timer.reset();
    this.renderer.render();
    const message = 'Temporizador reiniciado. Cuando estés listo, di iniciar temporizador.';
    if (fromVoice) this.voice.feedback(message);
    else this.toast(message);
  }

  markFoodReady(fromVoice = false) {
    if (!this.timer.hasTimer()) {
      if (fromVoice) this.voice.feedback('Este paso no tiene una cocción temporizada.');
      return;
    }

    if (this.timer.completed) {
      if (fromVoice) this.voice.feedback('El alimento ya está marcado como listo.');
      return;
    }

    this.timer.markReady();
    this.renderer.render();
    const message = 'Alimento marcado como listo. Ya puedes decir siguiente paso.';
    if (fromVoice) this.voice.feedback(message);
    else {
      this.toast(message);
      this.state.voiceStatus = message;
    }
  }

  tellRemainingTime() {
    if (!this.timer.hasTimer()) {
      this.voice.feedback('Este paso no tiene temporizador.');
      return;
    }
    if (this.timer.completed) {
      this.voice.feedback('El tiempo de este paso ya finalizó.');
      return;
    }
    if (!this.timer.started) {
      this.voice.feedback(`El temporizador todavía no comenzó. Está preparado para ${this.timer.durationForSpeech(this.timer.initialSeconds)}.`);
      return;
    }
    this.voice.feedback(`Faltan ${this.timer.durationForSpeech()}.`);
  }

  readIngredients() {
    const recipe = this.currentRecipe();
    if (!recipe) {
      this.voice.feedback('No hay una receta seleccionada.');
      return;
    }
    this.voice.feedback(`Ingredientes: ${recipe.ingredients.join(', ')}.`);
  }

  tellCurrentStep() {
    const recipe = this.currentRecipe();
    if (!recipe) {
      this.voice.feedback('No hay una receta activa.');
      return;
    }
    this.voice.feedback(`Estás en el paso ${this.state.step + 1} de ${recipe.steps.length}. ${this.currentStep()?.text || ''}`);
  }

  finishRecipeByVoice() {
    const recipe = this.currentRecipe();
    if (!recipe) {
      this.voice.feedback('No hay una receta activa.');
      return;
    }
    if (this.state.step !== recipe.steps.length - 1) {
      this.voice.feedback('Todavía no estás en el último paso.');
      return;
    }
    if (!this.timer.canAdvance()) {
      this.voice.feedback('Debes finalizar el tiempo de cocción antes de completar la receta.');
      return;
    }
    this.completeRecipe();
  }

  completeRecipe() {
    const recipe = this.currentRecipe();
    if (!recipe) return;

    const recipeId = recipe.id;
    this.timer.stop();
    this.history.add(recipeId);
    this.state.clearProgress();
    this.goTo('completed', { recipeId });
    this.voice.announce('Receta completada. Buen provecho.', { startSession: false });
  }

  goHomeByVoice() {
    this.goTo('home');
    this.toast('Regresando al inicio.');
  }

  increaseVoiceVolume() {
    const current = Number(this.state.settings.voiceVolume) || 70;
    const next = Math.min(100, current + 10);
    this.settings.set('voiceVolume', next);
    this.voice.feedback(`Volumen ajustado al ${next} por ciento.`);
  }

  slowReading() {
    this.settings.set('readSpeed', 'lenta');
    this.voice.feedback('Velocidad de lectura ajustada a lenta.');
  }

  setServings(servings) {
    const recipe = this.currentRecipe();
    if (!recipe) return;
    this.state.selectedServings = Math.max(1, Math.round(Number(servings) || 1));
    this.renderer.render();
  }

  toggleFavorite() {
    const recipe = this.currentRecipe();
    if (!recipe) return;
    const favorites = this.favorites.toggle(recipe.id);
    const saved = favorites.includes(recipe.id);
    this.toast(saved ? 'Receta guardada en favoritos.' : 'Receta eliminada de favoritos.');
    this.renderer.render();
  }

  toggleSetting(key) {
    this.settings.toggle(key);
    if (key === 'micEnabled' && !this.state.settings.micEnabled) {
      this.voice.stopSession('El micrófono está desactivado en Configuración');
    }
    this.renderer.render();
  }

  setSetting(key, value) {
    const normalized = key === 'voiceVolume' ? Number(value) : value;
    this.settings.set(key, normalized);
    this.renderer.render();
  }

  handleBack() {
    if (this.state.screen === 'recipe') this.goTo('explore', { category: this.state.category });
    else if (this.state.screen === 'cook') this.goTo('recipe', { recipeId: this.state.recipeId });
    else if (this.state.screen === 'completed') this.goTo('home');
    else if (this.state.screen.startsWith('settings-')) this.goTo('settings');
    else this.goTo('home');
  }

  handleAction(action) {
    const actions = {
      back: () => this.handleBack(),
      'exit-cook': () => {
        const confirmed = window.confirm('¿Deseas salir? Tu progreso quedará guardado.');
        if (confirmed) {
          this.state.saveProgress();
          this.goTo('recipe', { recipeId: this.state.recipeId });
        }
      },
      'start-cook': () => this.startCook(),
      'continue-cook': () => this.continueCook(),
      'step-next': () => this.nextStep(),
      'step-back': () => this.previousStep(),
      'step-repeat': () => this.repeatStep(),
      mic: () => this.voice.toggle(),
      'timer-start': () => this.startTimer(),
      'timer-pause': () => this.pauseTimer(),
      'timer-reset': () => this.resetTimer(),
      'food-ready': () => this.markFoodReady(),
      'toggle-favorite': () => this.toggleFavorite(),
      restart: () => this.startCook(),
      'increase-serving': () => this.setServings((this.state.selectedServings || 1) + 1),
      'decrease-serving': () => this.setServings((this.state.selectedServings || 1) - 1),
      'choose-another': () => this.goTo('explore', { category: this.currentRecipe()?.category }),
      'reset-all-times': () => this.resetRecipeTimes(this.state.recipeId)
    };

    actions[action]?.();
  }

  durationForSpeech(seconds) {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    if (minutes && rest) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${rest} ${rest === 1 ? 'segundo' : 'segundos'}`;
    if (minutes) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    return `${rest} ${rest === 1 ? 'segundo' : 'segundos'}`;
  }

  toast(message) {
    const element = document.getElementById('toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    window.clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => element.classList.remove('show'), 2600);
  }
}
