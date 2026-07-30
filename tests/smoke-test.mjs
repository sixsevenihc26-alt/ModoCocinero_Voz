const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};

const root = {
  innerHTML: '',
  addEventListener() {},
  querySelector() { return null; }
};

const toast = {
  textContent: '',
  classList: { add() {}, remove() {} }
};

globalThis.document = {
  getElementById: id => id === 'app' ? root : toast,
  body: { setAttribute() {}, classList: { toggle() {} } },
  documentElement: { style: { setProperty() {} } }
};

globalThis.window = globalThis;
window.confirm = () => true;
window.speechSynthesis = {
  cancel() {},
  speak(utterance) { utterance.onend?.(); }
};
globalThis.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text; }
};

const { ModoCocineroApp } = await import('../js/App.js');
const app = new ModoCocineroApp();
app.initialize();

function assert(condition, message) {
  if (!condition) throw new Error(`Fallo: ${message}`);
  console.log(`✓ ${message}`);
}

assert(root.innerHTML.includes('Recomendadas para ti'), 'renderiza la pantalla de inicio');
app.openRecipe('panqueques');
assert(root.innerHTML.includes('Ajustar tiempos de cocción'), 'muestra el ajuste previo de tiempos');
app.setStepTime('panqueques', 2, 5, 'sec');
assert(app.getStepTime('panqueques', 2) === 5, 'guarda tiempos personalizados');
app.startCook();
app.nextStep();
app.nextStep();
assert(app.state.step === 2 && app.timer.initialSeconds === 5, 'usa el tiempo personalizado al cocinar');
app.nextStep();
assert(app.state.step === 2, 'impide saltar una cocción pendiente');
app.markFoodReady();
assert(app.timer.completedEarly, 'permite marcar el alimento como listo');
app.nextStep();
assert(app.state.step === 3, 'permite avanzar después de marcarlo listo');
app.state.step = app.currentRecipe().steps.length - 1;
app.prepareCurrentStep();
app.nextStep();
assert(app.state.screen === 'completed', 'completa la receta únicamente en el último paso');
assert(app.history.getAll().length === 1, 'registra una sola entrada en el historial');

console.log('\nPrueba rápida completada correctamente.');
