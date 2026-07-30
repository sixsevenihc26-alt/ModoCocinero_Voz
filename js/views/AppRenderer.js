import { catColor, catName } from '../data.js';
import { icons, dishIcon } from './icons.js';
import { escapeHtml } from '../utils/sanitize.js';

export class AppRenderer {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('app');
    this.bindDelegatedEvents();
  }

  render() {
    const showTabs = ['home', 'search', 'explore', 'settings'].includes(this.app.state.screen);
    const showBack = !showTabs;

    this.root.innerHTML = `
      ${this.renderTabs(showTabs)}
      <div class="main-col">
        <header class="topbar">
          ${showBack ? `
            <button type="button" class="iconbtn" data-action="back" aria-label="Regresar">${icons.back}</button>
          ` : ''}
          <h1>${escapeHtml(this.title())}</h1>
          ${this.app.state.screen === 'cook' ? `
            <button type="button" class="iconbtn" data-action="exit-cook" aria-label="Salir del Modo Cocinero">✕</button>
          ` : ''}
        </header>
        <main class="content">${this.renderScreen()}</main>
      </div>
    `;
  }

  renderScreen() {
    const screens = {
      home: () => this.home(),
      search: () => this.search(),
      explore: () => this.explore(),
      recipe: () => this.recipe(),
      cook: () => this.cook(),
      completed: () => this.completed(),
      settings: () => this.settings(),
      'settings-voice': () => this.settingsVoice(),
      'settings-appearance': () => this.settingsAppearance(),
      'settings-help': () => this.settingsHelp()
    };
    return (screens[this.app.state.screen] || screens.home)();
  }

  renderTabs(show) {
    const tab = (screen, icon, label) => `
      <button type="button" class="tab ${this.app.state.screen === screen ? 'active' : ''}"
        data-screen="${screen}" aria-current="${this.app.state.screen === screen ? 'page' : 'false'}">
        <span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span>
      </button>
    `;

    return `
      <nav class="tabbar ${show ? '' : 'hide-mobile'}" aria-label="Navegación principal">
        <div class="brand"><span class="dotmark"></span>Modo Cocinero</div>
        ${tab('home', icons.home, 'Inicio')}
        ${tab('search', icons.search, 'Buscar')}
        ${tab('explore', icons.grid, 'Explorar')}
        ${tab('settings', icons.settings, 'Ajustes')}
      </nav>
    `;
  }

  title() {
    const recipe = this.app.currentRecipe();
    const titles = {
      home: 'Modo Cocinero',
      search: 'Buscar receta',
      explore: this.app.state.category ? catName(this.app.state.category) : 'Explorar recetas',
      recipe: recipe?.name || 'Receta',
      cook: recipe ? `Paso ${this.app.state.step + 1} de ${recipe.steps.length}` : 'Modo Cocinero',
      completed: 'Receta completada',
      settings: 'Configuración',
      'settings-voice': 'Configuración de voz',
      'settings-appearance': 'Apariencia y accesibilidad',
      'settings-help': 'Ayuda'
    };
    return titles[this.app.state.screen] || '';
  }

  home() {
    const categories = this.app.recipes.getCategories();
    const recommended = this.app.recipes.getRecommended();
    const savedRecipe = this.app.state.hasSavedProgress ? this.app.currentRecipe() : null;
    const favoriteIds = this.app.favorites.getAll();
    const favorites = favoriteIds.map(id => this.app.recipes.getById(id)).filter(Boolean);
    const history = this.app.history.getAll()
      .map(item => ({ ...item, recipe: this.app.recipes.getById(item.recipeId) }))
      .filter(item => item.recipe)
      .slice(0, 3);

    return `
      <p class="lead" style="margin-top:2px;">Encuentra qué cocinar y sigue la receta paso a paso, con las manos libres.</p>

      <button type="button" class="search-field search-button" data-screen="search">
        ${icons.search}<span>Buscar receta o ingrediente…</span>
      </button>

      ${savedRecipe ? `
        <section class="box pending-box">
          <div class="eyebrow">Preparación pendiente</div>
          <h2 class="title">${escapeHtml(savedRecipe.name)}</h2>
          <p class="lead">Continúa desde el paso ${this.app.state.step + 1} de ${savedRecipe.steps.length}.</p>
          <button type="button" class="btn btn-primary" data-action="continue-cook">Continuar preparación</button>
        </section>
      ` : ''}

      <div class="eyebrow">Categorías</div>
      <div class="chip-row">
        ${categories.map(category => `
          <button type="button" class="chip" data-category="${category.id}">
            <span class="dot" style="background:${category.color}"></span>${escapeHtml(category.name)}
          </button>
        `).join('')}
      </div>

      <div class="eyebrow">Recomendadas para ti</div>
      <div class="cards-grid">${recommended.map(recipe => this.recipeCard(recipe)).join('')}</div>

      ${favorites.length ? `
        <div class="eyebrow">Favoritas</div>
        <div class="rows-list">${favorites.map(recipe => this.recipeRow(recipe)).join('')}</div>
      ` : ''}

      ${history.length ? `
        <div class="eyebrow">Preparadas recientemente</div>
        <div class="rows-list">
          ${history.map(item => this.recipeRow(item.recipe, new Date(item.completedAt).toLocaleDateString('es-BO'))).join('')}
        </div>
      ` : ''}
    `;
  }

  search() {
    const query = this.app.state.query.trim();
    const results = this.app.recipes.search(query);

    return `
      <div class="search-field">
        ${icons.search}
        <input id="search-input" data-search-input type="search" value="${escapeHtml(this.app.state.query)}"
          placeholder="Buscar receta o ingrediente…" autocomplete="off">
      </div>
      ${!query ? this.emptyState('Escribe para buscar', 'Prueba con el nombre de una receta o un ingrediente.') :
        results.length ? `<div class="rows-list">${results.map(recipe => this.recipeRow(recipe)).join('')}</div>` :
        this.emptyState('No encontramos recetas', 'Prueba con otro nombre o ingrediente.')}
    `;
  }

  explore() {
    const categories = this.app.recipes.getCategories();

    if (!this.app.state.category) {
      return `
        <p class="lead" style="margin-top:2px;">Elige una categoría para descubrir recetas.</p>
        <div class="cat-grid">
          ${categories.map(category => `
            <button type="button" class="cat-card" data-category="${category.id}">
              <span class="dot" style="background:${category.color}"></span>
              <span><b>${escapeHtml(category.name)}</b><br><small>${this.app.recipes.getByCategory(category.id).length} recetas</small></span>
            </button>
          `).join('')}
        </div>
      `;
    }

    const all = this.app.recipes.getByCategory(this.app.state.category);
    const list = this.app.recipes.filter(all, this.app.state.filters);

    return `
      <div class="chip-row">
        ${categories.map(category => `
          <button type="button" class="chip ${category.id === this.app.state.category ? 'active' : ''}" data-category="${category.id}">
            <span class="dot" style="background:${category.color}"></span>${escapeHtml(category.name)}
          </button>
        `).join('')}
      </div>

      <div class="filter-row">
        <label for="difficulty-filter">Dificultad</label>
        <select id="difficulty-filter" data-filter="difficulty">
          ${['todas', 'Fácil', 'Media'].map(value => `
            <option value="${value}" ${this.app.state.filters.difficulty === value ? 'selected' : ''}>${value === 'todas' ? 'Todas' : value}</option>
          `).join('')}
        </select>
      </div>

      ${list.length ? `<div class="rows-list">${list.map(recipe => this.recipeRow(recipe)).join('')}</div>` :
        this.emptyState('No hay coincidencias', 'Cambia los filtros para ver más recetas.')}
    `;
  }

  recipeCard(recipe) {
    return `
      <article class="recipe-card" data-recipe="${recipe.id}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(recipe.name)}">
        <div class="thumb" style="background:${catColor(recipe.category)}">${dishIcon(54)}</div>
        <div class="body">
          <div class="name">${escapeHtml(recipe.name)}</div>
          <div class="meta">
            <span class="meta-chip">${icons.clock} ${recipe.time} min</span>
            <span class="meta-chip">${escapeHtml(recipe.difficulty)}</span>
            <span class="meta-chip">${recipe.servings} porc.</span>
          </div>
        </div>
      </article>
    `;
  }

  recipeRow(recipe, extra = '') {
    return `
      <article class="recipe-row" data-recipe="${recipe.id}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(recipe.name)}">
        <div class="thumb" style="background:${catColor(recipe.category)}">${dishIcon(30)}</div>
        <div class="info">
          <div class="name">${escapeHtml(recipe.name)}</div>
          <div class="meta">${recipe.time} min · ${escapeHtml(recipe.difficulty)} · ${recipe.servings} porciones${extra ? ` · ${escapeHtml(extra)}` : ''}</div>
        </div>
      </article>
    `;
  }

  recipe() {
    const recipe = this.app.currentRecipe();
    if (!recipe) return this.emptyState('No se pudo cargar la receta', 'Regresa e intenta seleccionar otra.');

    const portions = this.app.state.selectedServings || recipe.servings;
    const factor = portions / recipe.servings;
    const isFavorite = this.app.favorites.isFavorite(recipe.id);
    const timedSteps = recipe.steps.map((step, index) => ({ step, index })).filter(item => Number(item.step.seconds) > 0);

    return `
      <div class="recipe-detail-grid">
        <div class="thumb recipe-hero" style="background:${catColor(recipe.category)}">${dishIcon(84)}</div>
        <div>
          <h2 class="title">${escapeHtml(recipe.name)}</h2>
          <div class="chip-row">
            <span class="meta-chip">${icons.clock} ${recipe.time} min</span>
            <span class="meta-chip">${escapeHtml(recipe.difficulty)}</span>
            <span class="meta-chip">${portions} ${portions === 1 ? 'porción' : 'porciones'}</span>
          </div>

          <div class="setting-row">
            <div class="label"><b>Porciones</b><small>Ajusta las cantidades de los ingredientes</small></div>
            <div class="segmented servings-control">
              <button type="button" data-action="decrease-serving" ${portions <= 1 ? 'disabled' : ''}>−</button>
              <strong>${portions}</strong>
              <button type="button" data-action="increase-serving">+</button>
            </div>
          </div>

          <div class="eyebrow">Ingredientes</div>
          <div class="box">
            ${recipe.ingredients.map(ingredient => `
              <div class="box-row"><span class="bullet"></span>${escapeHtml(this.ingredientText(ingredient, factor))}</div>
            `).join('')}
          </div>

          <div class="eyebrow">Información nutricional</div>
          <div class="box" style="padding:0;">
            <div class="macro-grid">
              <div class="macro-cell"><b>${this.adjustMacro(recipe.macros.kcal, factor)}</b><span>Kcal</span></div>
              <div class="macro-cell"><b>${this.adjustMacro(recipe.macros.prot, factor)} g</b><span>Proteína</span></div>
              <div class="macro-cell"><b>${this.adjustMacro(recipe.macros.carbs, factor)} g</b><span>Carbohidratos</span></div>
              <div class="macro-cell"><b>${this.adjustMacro(recipe.macros.fat, factor)} g</b><span>Grasas</span></div>
            </div>
          </div>

          ${timedSteps.length ? `
            <div class="eyebrow">Ajustar tiempos de cocción</div>
            <p class="lead time-intro">Configura los tiempos antes de cocinar. Una vez iniciado el Modo Cocinero, quedarán bloqueados.</p>
            <div class="box time-editor">
              ${timedSteps.map(({ step, index }) => this.timeEditorRow(recipe, step, index)).join('')}
            </div>
            <button type="button" class="btn btn-ghost time-reset-all" data-action="reset-all-times">Restablecer todos los tiempos</button>
          ` : ''}

          <button type="button" class="btn btn-secondary favorite-button" data-action="toggle-favorite" aria-pressed="${isFavorite}">
            ${isFavorite ? `${icons.starOn} Quitar de favoritos` : `${icons.starOff} Guardar receta`}
          </button>
          <button type="button" class="btn btn-primary" data-action="start-cook">Iniciar Modo Cocinero</button>
        </div>
      </div>
    `;
  }

  timeEditorRow(recipe, step, index) {
    const adjusted = this.app.getStepTime(recipe.id, index);
    const modified = this.app.cookingTimes.isModified(recipe.id, index);
    const input = this.secondsToInput(adjusted);

    return `
      <div class="time-editor-row">
        <div class="time-editor-head">
          <span class="time-step-number">${index + 1}</span>
          <div class="time-editor-text">
            <b>${escapeHtml(step.text)}</b>
            <small>Tiempo sugerido: ${this.app.timer.format(step.seconds)}${modified ? ' · Modificado' : ''}</small>
          </div>
          <span class="time-current">${this.app.timer.format(adjusted)}</span>
        </div>
        <form class="time-direct-entry" data-time-form data-recipe-id="${recipe.id}" data-step-index="${index}">
          <input class="time-number-input" name="amount" type="number" min="1" step="1" value="${input.value}" required aria-label="Cantidad de tiempo">
          <select class="time-unit-select" name="unit" aria-label="Unidad de tiempo">
            <option value="sec" ${input.unit === 'sec' ? 'selected' : ''}>Seg</option>
            <option value="min" ${input.unit === 'min' ? 'selected' : ''}>Min</option>
          </select>
          <button type="submit" class="btn btn-secondary">Aplicar</button>
          <button type="button" class="btn btn-ghost" data-reset-step-time data-recipe-id="${recipe.id}" data-step-index="${index}" ${modified ? '' : 'disabled'}>Restablecer</button>
        </form>
      </div>
    `;
  }

  cook() {
    const recipe = this.app.currentRecipe();
    const step = this.app.currentStep();
    if (!recipe || !step) return this.emptyState('No se pudo cargar este paso', 'Regresa a la receta e intenta nuevamente.');

    const hasTimer = this.app.timer.hasTimer();
    const isLast = this.app.state.step === recipe.steps.length - 1;
    const timer = this.app.timer;

    return `
      <div class="cook-wrap cook-center">
        <div class="dots" aria-label="Progreso de la receta">
          ${recipe.steps.map((_, index) => `
            <span class="dot-step ${index === this.app.state.step ? 'active' : index < this.app.state.step ? 'done' : ''}"></span>
          `).join('')}
        </div>

        <div class="cook-hero" style="background:${catColor(recipe.category)}">${dishIcon(60)}</div>
        <div class="cook-instruction">${escapeHtml(step.text)}</div>

        ${hasTimer ? `
          <section class="timer-box" aria-label="Temporizador del paso">
            <div class="timer-value" role="timer" aria-label="Tiempo restante: ${timer.format()}">${timer.format()}</div>
            <p class="timer-hint">Tiempo configurado antes de comenzar: ${timer.format(timer.initialSeconds)}. Durante el Modo Cocinero no puede modificarse.</p>
            ${timer.completed ? `
              <div class="timer-status success">${timer.completedEarly ? '✓ Alimento listo' : '✓ Tiempo finalizado'}</div>
            ` : timer.running ? '<div class="timer-status active">Cocción en progreso</div>' : timer.started ? '<div class="timer-status">Temporizador pausado</div>' : '<div class="timer-status">Esperando tu orden para iniciar</div>'}

            <div class="timer-actions">
              <button type="button" class="btn btn-secondary" data-action="${timer.running ? 'timer-pause' : 'timer-start'}" ${timer.completed ? 'disabled' : ''}>
                ${timer.running ? 'Pausar' : timer.started ? 'Reanudar' : 'Iniciar'}
              </button>
              <button type="button" class="btn btn-ghost" data-action="timer-reset">Reiniciar</button>
            </div>

            <button type="button" class="btn ready-button ${timer.completedEarly ? 'ready' : ''}" data-action="food-ready" ${timer.completed ? 'disabled' : ''}>
              ${timer.completedEarly ? '✓ Alimento listo' : '✓ Ya está listo'}
            </button>
          </section>
        ` : ''}

        <div class="mic-wrap">
          <button type="button" class="mic-btn ${this.app.state.micListening ? 'listening' : ''} ${this.app.state.voiceSessionActive ? 'active' : ''}"
            data-action="mic" aria-pressed="${this.app.state.voiceSessionActive}" aria-label="${this.app.state.voiceSessionActive ? 'Detener escucha por voz' : 'Activar escucha por voz'}">
            <span class="mic-ring"></span>${icons.mic}
          </button>
          <div class="mic-caption" role="status" aria-live="polite">${escapeHtml(this.app.state.voiceStatus)}</div>
        </div>

        <div class="cook-controls">
          <button type="button" class="btn btn-secondary" data-action="step-back" ${this.app.state.step === 0 ? 'disabled' : ''}>Atrás</button>
          <button type="button" class="btn btn-secondary" data-action="step-repeat">Repetir</button>
          <button type="button" class="btn btn-primary" data-action="step-next">${isLast ? 'Finalizar' : 'Siguiente'}</button>
        </div>
      </div>
    `;
  }

  completed() {
    const recipe = this.app.currentRecipe();
    return `
      <div class="cook-center">
        <div class="celebrate">
          <div class="icon" aria-hidden="true">${icons.check}</div>
          <h2>¡Receta completada!</h2>
          <p>Terminaste “${escapeHtml(recipe?.name || '')}”. Buen provecho 🍽️</p>
        </div>
        <button type="button" class="btn btn-primary" data-action="restart">Volver a preparar</button>
        <button type="button" class="btn btn-secondary" data-action="choose-another">Elegir otra receta</button>
        <button type="button" class="btn btn-ghost" data-screen="home">Regresar al Inicio</button>
      </div>
    `;
  }

  settings() {
    return `
      <div class="cook-center">
        ${this.settingsLink('settings-voice', icons.voice, 'Configuración de voz', 'Micrófono, inicio automático y confirmación')}
        ${this.settingsLink('settings-appearance', icons.appearance, 'Apariencia y accesibilidad', 'Tema, contraste y tamaño de texto')}
        ${this.settingsLink('settings-help', icons.help, 'Ayuda', 'Comandos disponibles e instrucciones')}
      </div>
    `;
  }

  settingsLink(screen, icon, title, description) {
    return `
      <button type="button" class="link-row" data-screen="${screen}">
        <span class="ic">${icon}</span>
        <span class="txt"><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>
        <span class="chev">${icons.chev}</span>
      </button>
    `;
  }

  settingsVoice() {
    const settings = this.app.state.settings;
    return `
      <div class="box">
        ${this.settingSwitch('micEnabled', 'Activar micrófono', 'Permite controlar la receta mediante voz', settings.micEnabled)}
        ${this.settingSwitch('autoVoice', 'Inicio automático de voz', 'Activa la escucha después de leer el primer paso', settings.autoVoice)}
        ${this.settingSwitch('voiceConfirm', 'Confirmación por voz', 'Anuncia las acciones reconocidas', settings.voiceConfirm)}

        <div class="setting-row">
          <div class="label"><b>Velocidad de lectura</b><small>Qué tan rápido se leen las instrucciones</small></div>
          <div class="segmented">
            ${[
              ['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida']
            ].map(([value, label]) => `
              <button type="button" data-setting="readSpeed" data-value="${value}" class="${settings.readSpeed === value ? 'active' : ''}">${label}</button>
            `).join('')}
          </div>
        </div>

        <div class="setting-row volume-row">
          <div class="label"><b>Volumen de respuesta</b><small id="volume-value">${settings.voiceVolume}%</small></div>
          <input class="slider" type="range" min="0" max="100" value="${settings.voiceVolume}" data-range-setting="voiceVolume" aria-label="Volumen de respuesta">
        </div>
      </div>
      <p class="lead">La advertencia del micrófono solo aparecerá cuando exista un bloqueo o una interrupción real. Si el navegador no admite la voz, los botones manuales permanecen disponibles.</p>
    `;
  }

  settingsAppearance() {
    const settings = this.app.state.settings;
    return `
      <div class="box">
        <div class="setting-row">
          <div class="label"><b>Modo oscuro</b><small>Reduce el brillo de la pantalla</small></div>
          <button type="button" class="switch ${settings.theme === 'dark' ? 'on' : ''}" data-setting="theme" data-value="${settings.theme === 'dark' ? 'light' : 'dark'}" role="switch" aria-checked="${settings.theme === 'dark'}"></button>
        </div>
        ${this.settingSwitch('contrast', 'Alto contraste', 'Refuerza bordes y contornos', settings.contrast)}
        <div class="setting-row">
          <div class="label"><b>Tamaño de texto</b><small>Ajusta la escala tipográfica</small></div>
          <div class="segmented">
            ${[['small', 'A−'], ['normal', 'A'], ['large', 'A+']].map(([value, label]) => `
              <button type="button" data-setting="textSize" data-value="${value}" class="${settings.textSize === value ? 'active' : ''}">${label}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  settingSwitch(key, title, description, enabled) {
    return `
      <div class="setting-row">
        <div class="label"><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></div>
        <button type="button" class="switch ${enabled ? 'on' : ''}" data-toggle="${key}" role="switch" aria-checked="${enabled}" aria-label="${escapeHtml(title)}"></button>
      </div>
    `;
  }

  settingsHelp() {
    const commands = [
      ['Siguiente paso', 'Avanza cuando el paso actual está completado.'],
      ['Paso anterior', 'Regresa a la instrucción anterior.'],
      ['Repetir instrucción', 'Lee nuevamente el paso actual.'],
      ['Iniciar temporizador', 'Comienza o reanuda la cuenta regresiva.'],
      ['Pausar temporizador', 'Detiene temporalmente el conteo.'],
      ['Cancelar temporizador', 'Reinicia el tiempo configurado.'],
      ['Cuánto tiempo falta', 'Informa el tiempo restante.'],
      ['Ya está listo', 'Finaliza antes la cocción y habilita el siguiente paso.'],
      ['Leer ingredientes', 'Lee la lista de ingredientes.'],
      ['En qué paso estoy', 'Informa el paso actual.']
    ];

    return `
      <div class="eyebrow">Comandos disponibles</div>
      <div class="box">
        ${commands.map(([command, description]) => `
          <div class="box-row command-row"><span class="bullet"></span><span><b>“${escapeHtml(command)}”</b><small>${escapeHtml(description)}</small></span></div>
        `).join('')}
      </div>
      <div class="eyebrow">Cómo funciona el Modo Cocinero</div>
      <div class="box">
        <div class="box-row"><span class="bullet"></span>El primer paso se lee automáticamente al comenzar.</div>
        <div class="box-row"><span class="bullet"></span>Los tiempos se ajustan únicamente desde la ficha, antes de cocinar.</div>
        <div class="box-row"><span class="bullet"></span>El temporizador espera a que prepares los utensilios y digas “iniciar temporizador”.</div>
        <div class="box-row"><span class="bullet"></span>Si el alimento termina antes, di “ya está listo”.</div>
        <div class="box-row"><span class="bullet"></span>Los botones grandes son un respaldo cuando la voz no funciona.</div>
      </div>
    `;
  }

  ingredientText(ingredient, factor) {
    if (typeof ingredient === 'string') return ingredient;
    if (!ingredient || typeof ingredient !== 'object') return '';
    if (ingredient.quantity == null) return `${ingredient.name || ''} ${ingredient.unit || ''}`.trim();
    const adjusted = Number(ingredient.quantity) * factor;
    const quantity = Number.isInteger(adjusted) ? adjusted : Number(adjusted.toFixed(2));
    return `${quantity} ${ingredient.unit || ''} de ${ingredient.name || ''}`.replace(/\s+/g, ' ').trim();
  }

  adjustMacro(value, factor) {
    const result = Number(value) * factor;
    return Number.isInteger(result) ? result : Number(result.toFixed(1));
  }

  secondsToInput(seconds) {
    const safe = Math.max(1, Math.round(Number(seconds) || 1));
    return safe % 60 === 0 ? { value: safe / 60, unit: 'min' } : { value: safe, unit: 'sec' };
  }

  emptyState(title, description) {
    return `<div class="empty-state">${icons.empty}<b>${escapeHtml(title)}</b><p>${escapeHtml(description)}</p></div>`;
  }

  updateTimer() {
    const timerElement = this.root.querySelector('.timer-value');
    if (!timerElement) return;
    timerElement.textContent = this.app.timer.format();
    timerElement.setAttribute('aria-label', `Tiempo restante: ${this.app.timer.format()}`);
  }

  bindDelegatedEvents() {
    this.root.addEventListener('click', event => {
      const actionElement = event.target.closest('[data-action]');
      if (actionElement) {
        this.app.handleAction(actionElement.dataset.action);
        return;
      }

      const resetTime = event.target.closest('[data-reset-step-time]');
      if (resetTime) {
        this.app.resetStepTime(resetTime.dataset.recipeId, Number(resetTime.dataset.stepIndex));
        return;
      }

      const screenElement = event.target.closest('[data-screen]');
      if (screenElement) {
        this.app.goTo(screenElement.dataset.screen);
        return;
      }

      const categoryElement = event.target.closest('[data-category]');
      if (categoryElement) {
        this.app.selectCategory(categoryElement.dataset.category);
        return;
      }

      const recipeElement = event.target.closest('[data-recipe]');
      if (recipeElement) {
        this.app.openRecipe(recipeElement.dataset.recipe);
        return;
      }

      const toggleElement = event.target.closest('[data-toggle]');
      if (toggleElement) {
        this.app.toggleSetting(toggleElement.dataset.toggle);
        return;
      }

      const settingElement = event.target.closest('[data-setting]');
      if (settingElement) {
        this.app.setSetting(settingElement.dataset.setting, settingElement.dataset.value);
      }
    });

    this.root.addEventListener('keydown', event => {
      const recipeElement = event.target.closest('[data-recipe]');
      if (recipeElement && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        this.app.openRecipe(recipeElement.dataset.recipe);
      }
    });

    this.root.addEventListener('submit', event => {
      const form = event.target.closest('[data-time-form]');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      this.app.setStepTime(
        form.dataset.recipeId,
        Number(form.dataset.stepIndex),
        data.get('amount'),
        data.get('unit')
      );
    });

    this.root.addEventListener('input', event => {
      if (event.target.matches('[data-search-input]')) {
        this.app.state.query = event.target.value;
        this.render();
        const input = this.root.querySelector('[data-search-input]');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
        return;
      }

      if (event.target.matches('[data-range-setting]')) {
        const key = event.target.dataset.rangeSetting;
        this.app.settings.set(key, Number(event.target.value));
        const label = this.root.querySelector('#volume-value');
        if (label) label.textContent = `${event.target.value}%`;
      }
    });

    this.root.addEventListener('change', event => {
      if (event.target.matches('[data-filter]')) {
        this.app.state.filters[event.target.dataset.filter] = event.target.value;
        this.render();
      }
    });
  }
}
