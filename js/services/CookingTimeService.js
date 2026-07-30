export class CookingTimeService {
  constructor(storageKey = 'modo-cocinero-times') {
    this.storageKey = storageKey;
    this.overrides = this.load();
  }

  load() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      console.warn('No se pudieron cargar los tiempos personalizados.', error);
      return {};
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.overrides));
  }

  get(recipeId, stepIndex, suggestedSeconds = 0) {
    const custom = this.overrides?.[recipeId]?.[stepIndex];
    return Number.isFinite(custom) && custom > 0
      ? Math.round(custom)
      : Math.max(0, Math.round(Number(suggestedSeconds) || 0));
  }

  set(recipeId, stepIndex, seconds) {
    const value = Math.max(1, Math.round(Number(seconds) || 0));
    if (!this.overrides[recipeId]) this.overrides[recipeId] = {};
    this.overrides[recipeId][stepIndex] = value;
    this.save();
    return value;
  }

  reset(recipeId, stepIndex) {
    if (!this.overrides[recipeId]) return;
    delete this.overrides[recipeId][stepIndex];
    if (Object.keys(this.overrides[recipeId]).length === 0) {
      delete this.overrides[recipeId];
    }
    this.save();
  }

  resetRecipe(recipeId) {
    delete this.overrides[recipeId];
    this.save();
  }

  isModified(recipeId, stepIndex) {
    return Number.isFinite(this.overrides?.[recipeId]?.[stepIndex]);
  }
}
