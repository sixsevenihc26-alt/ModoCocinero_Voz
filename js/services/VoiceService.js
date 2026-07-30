export class VoiceService {
  constructor(state, callbacks = {}) {
    this.state = state;
    this.callbacks = callbacks;
    this.Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = null;
    this.language = 'es-BO';
    this.restartTimeout = null;
    this.isSpeaking = false;
    this.ignoreNextAbort = false;
    this.initialize();
  }

  initialize() {
    if (!this.Recognition) {
      this.state.voiceStatus = 'La voz no está disponible en este navegador. Usa los botones manuales.';
      return;
    }

    this.recognition = new this.Recognition();
    this.recognition.lang = this.language;
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.state.micListening = true;
      this.state.voiceStatus = 'Voz activa · escuchando…';
      this.callbacks.onStateChange?.();
    };

    this.recognition.onresult = event => {
      const result = event.results[event.results.length - 1]?.[0];
      const transcript = result?.transcript?.trim() || '';

      this.state.micListening = false;
      this.state.lastTranscript = transcript;
      this.state.voiceStatus = transcript
        ? `Escuché: “${transcript}”`
        : 'No escuché una orden';
      this.callbacks.onStateChange?.();

      if (transcript) this.execute(transcript);
    };

    this.recognition.onerror = event => {
      this.state.micListening = false;
      const error = event.error || 'unknown';

      if (error === 'aborted' && this.ignoreNextAbort) {
        this.ignoreNextAbort = false;
        return;
      }

      if (error === 'no-speech' || error === 'aborted') {
        this.state.voiceStatus = 'Voz activa · esperando una orden';
        this.callbacks.onStateChange?.();
        return;
      }

      const messages = {
        'not-allowed': 'El permiso del micrófono fue bloqueado. Puedes continuar con los botones manuales.',
        'service-not-allowed': 'El navegador bloqueó el reconocimiento de voz. Puedes continuar con los botones manuales.',
        'audio-capture': 'No se encontró un micrófono disponible.',
        network: 'Se perdió la conexión con el servicio de reconocimiento de voz.'
      };

      const message = messages[error] || `Se interrumpió el reconocimiento de voz: ${error}.`;
      this.state.voiceSessionActive = false;
      this.state.voiceStatus = message;
      this.callbacks.onMessage?.(message);
      this.callbacks.onStateChange?.();
    };

    this.recognition.onend = () => {
      this.state.micListening = false;
      this.callbacks.onStateChange?.();
      this.scheduleRestart();
    };
  }

  startSession() {
    if (!this.state.settings.micEnabled) {
      this.feedback('El micrófono está desactivado en Configuración.', { speak: false });
      return false;
    }

    if (!this.recognition) {
      this.feedback('La voz no está disponible en este navegador. Usa los botones manuales.', { speak: false });
      return false;
    }

    this.state.voiceSessionActive = true;
    this.state.voiceStatus = 'Preparando el micrófono…';
    this.callbacks.onStateChange?.();
    this.startListening();
    return true;
  }

  stopSession(message = 'Escucha por voz detenida') {
    this.state.voiceSessionActive = false;
    this.clearRestart();
    this.stopListening(true);
    this.state.voiceStatus = message;
    this.callbacks.onStateChange?.();
  }

  toggle() {
    if (this.state.voiceSessionActive) {
      this.stopSession();
    } else {
      this.startSession();
    }
  }

  startListening() {
    if (
      !this.recognition ||
      !this.state.voiceSessionActive ||
      this.state.micListening ||
      this.isSpeaking
    ) {
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      if (error?.name !== 'InvalidStateError') {
        this.state.voiceStatus = 'No se pudo iniciar el micrófono.';
        this.callbacks.onMessage?.(this.state.voiceStatus);
        this.callbacks.onStateChange?.();
      }
    }
  }

  stopListening(abort = false) {
    if (!this.recognition || !this.state.micListening) return;

    try {
      if (abort) {
        this.ignoreNextAbort = true;
        this.recognition.abort();
      } else {
        this.recognition.stop();
      }
    } catch {
      // El servicio ya había terminado.
    }

    this.state.micListening = false;
  }

  scheduleRestart(delay = 650) {
    this.clearRestart();
    if (!this.state.voiceSessionActive || this.isSpeaking) return;

    this.restartTimeout = window.setTimeout(() => {
      this.restartTimeout = null;
      this.startListening();
    }, delay);
  }

  clearRestart() {
    if (this.restartTimeout !== null) {
      window.clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  execute(rawText) {
    const command = this.normalize(rawText);

    if (this.contains(command, [
      'ya esta listo',
      'alimento listo',
      'el alimento esta listo',
      'la comida esta lista',
      'termino la coccion',
      'finalizar coccion'
    ])) {
      this.callbacks.onFoodReady?.(true);
      return;
    }

    if (this.contains(command, [
      'cuanto tiempo falta',
      'que tiempo falta',
      'tiempo restante'
    ])) {
      this.callbacks.onRemainingTime?.();
      return;
    }

    if (this.contains(command, [
      'pausar temporizador',
      'pausa temporizador',
      'detener temporizador',
      'para el temporizador'
    ])) {
      this.callbacks.onTimerPause?.(true);
      return;
    }

    if (this.contains(command, [
      'cancelar temporizador',
      'cancela temporizador',
      'reiniciar temporizador'
    ])) {
      this.callbacks.onTimerReset?.(true);
      return;
    }

    if (this.contains(command, [
      'iniciar temporizador',
      'inicia temporizador',
      'comenzar temporizador',
      'comienza temporizador',
      'reanudar temporizador',
      'continua temporizador'
    ])) {
      this.callbacks.onTimerStart?.(true);
      return;
    }

    if (this.contains(command, [
      'cambiar el tiempo',
      'modificar el tiempo',
      'agregar segundos',
      'reducir segundos',
      'aumentar tiempo'
    ])) {
      this.feedback('El tiempo de cocción solo puede modificarse antes de iniciar el Modo Cocinero.');
      return;
    }

    if (this.contains(command, ['siguiente paso', 'siguiente', 'avanzar', 'avanza', 'continuar'])) {
      this.callbacks.onNext?.(true);
      return;
    }

    if (this.contains(command, ['paso anterior', 'anterior', 'atras', 'volver', 'retroceder'])) {
      this.callbacks.onBack?.(true);
      return;
    }

    if (this.contains(command, ['repetir instruccion', 'repetir paso', 'repite', 'repetir'])) {
      this.callbacks.onRepeat?.();
      return;
    }

    if (this.contains(command, ['leer ingredientes', 'que ingredientes necesito'])) {
      this.callbacks.onReadIngredients?.();
      return;
    }

    if (this.contains(command, ['en que paso estoy', 'paso actual'])) {
      this.callbacks.onCurrentStep?.();
      return;
    }

    if (this.contains(command, ['finalizar receta', 'terminar receta'])) {
      this.callbacks.onFinishRecipe?.();
      return;
    }

    if (this.contains(command, ['volver al inicio', 'regresar al inicio'])) {
      this.callbacks.onGoHome?.();
      return;
    }

    if (this.contains(command, ['subir volumen', 'aumentar volumen'])) {
      this.callbacks.onIncreaseVolume?.();
      return;
    }

    if (this.contains(command, ['leer mas lento', 'hablar mas lento'])) {
      this.callbacks.onSlowReading?.();
      return;
    }

    if (this.contains(command, ['ayuda', 'que puedo decir', 'comandos disponibles'])) {
      this.feedback('Puedes decir: siguiente paso, paso anterior, repetir, iniciar temporizador, pausar temporizador, cuánto tiempo falta o ya está listo.');
      return;
    }

    this.feedback(`No entendí “${rawText}”. Prueba con: siguiente paso, repetir o iniciar temporizador.`);
  }

  announce(text, { startSession = false } = {}) {
    const canStart = startSession && Boolean(this.recognition) && this.state.settings.micEnabled;
    if (canStart) this.state.voiceSessionActive = true;
    if (startSession && !canStart) {
      this.state.voiceSessionActive = false;
      this.state.voiceStatus = 'La voz no está disponible en este navegador. Usa los botones manuales.';
      this.callbacks.onStateChange?.();
    }
    this.speak(text, { resumeListening: canStart || this.state.voiceSessionActive });
  }

  speak(text, { resumeListening = true } = {}) {
    if (!text || !('speechSynthesis' in window)) {
      if (resumeListening && this.state.voiceSessionActive) this.scheduleRestart(150);
      return;
    }

    this.clearRestart();
    this.stopListening(true);
    this.isSpeaking = true;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.language;
    utterance.rate = { lenta: 0.82, normal: 1, rapida: 1.22 }[this.state.settings.readSpeed] ?? 1;
    utterance.pitch = 1;
    utterance.volume = Math.min(1, Math.max(0, Number(this.state.settings.voiceVolume) / 100));

    const finish = () => {
      this.isSpeaking = false;
      if (resumeListening && this.state.voiceSessionActive) this.scheduleRestart(350);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  feedback(message, { speak = this.state.settings.voiceConfirm } = {}) {
    this.state.voiceStatus = message;
    this.callbacks.onMessage?.(message);
    this.callbacks.onStateChange?.();

    if (speak) {
      this.speak(message, { resumeListening: this.state.voiceSessionActive });
    } else if (this.state.voiceSessionActive) {
      this.scheduleRestart();
    }
  }

  normalize(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  contains(text, values) {
    return values.some(value => text.includes(value));
  }
}
