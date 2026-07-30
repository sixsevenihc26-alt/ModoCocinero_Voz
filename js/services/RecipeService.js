import { CATEGORIES, RECIPES } from '../data.js';

export class RecipeService {
  getCategories() {
    return CATEGORIES;
  }

  getAll() {
    return RECIPES;
  }

  getRecommended(limit = 3) {
    return RECIPES.slice(0, Math.max(0, limit));
  }

  getById(id) {
    const recipe = RECIPES.find(item => item.id === id);
    return this.isValid(recipe) ? recipe : null;
  }

  search(query) {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return [];

    return RECIPES.filter(recipe => {
      const name = this.normalize(recipe.name);
      const category = this.normalize(recipe.category);
      const ingredients = recipe.ingredients.some(ingredient =>
        this.normalize(ingredient).includes(normalizedQuery)
      );

      return name.includes(normalizedQuery) || category.includes(normalizedQuery) || ingredients;
    });
  }

  getByCategory(categoryId) {
    return RECIPES.filter(recipe => recipe.category === categoryId);
  }

  filter(recipes, filters = {}) {
    return recipes.filter(recipe => {
      const validDifficulty =
        !filters.difficulty ||
        filters.difficulty === 'todas' ||
        recipe.difficulty === filters.difficulty;

      const validTime = !filters.maxTime || recipe.time <= Number(filters.maxTime);
      const validServings = !filters.servings || recipe.servings >= Number(filters.servings);

      return validDifficulty && validTime && validServings;
    });
  }

  normalize(text) {
    return String(text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  isValid(recipe) {
    return Boolean(
      recipe?.id &&
      recipe?.name &&
      Array.isArray(recipe.ingredients) &&
      recipe.ingredients.length > 0 &&
      Array.isArray(recipe.steps) &&
      recipe.steps.length > 0
    );
  }
}
