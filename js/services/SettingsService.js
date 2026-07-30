export class SettingsService {
  constructor(state, storageKey = 'modo-cocinero-settings') {
    this.state = state;
    this.storageKey = storageKey;
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      if (saved) Object.assign(this.state.settings, saved);
    } catch (error) {
      console.warn('No se pudieron cargar los ajustes.', error);
    }
    this.apply();
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state.settings));
  }

  set(key, value) {
    this.state.settings[key] = value;
    this.save();
    this.apply();
  }

  toggle(key) {
    this.set(key, !this.state.settings[key]);
  }

  apply() {
    const settings = this.state.settings;
    document.body.setAttribute('data-theme', settings.theme);
    document.body.classList.toggle('contrast', settings.contrast);

    const scale =
      settings.textSize === 'small' ? 0.92 :
      settings.textSize === 'large' ? 1.16 : 1;

    document.documentElement.style.setProperty('--scale', scale);
  }
}
