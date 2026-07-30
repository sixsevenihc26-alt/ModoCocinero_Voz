export class LocalRecipeRepository {
  constructor(recipes) {
    this.recipes = recipes;
  }

  async getAll() {
    return this.recipes;
  }

  async getById(id) {
    return this.recipes.find(
      recipe => recipe.id === id
    ) ?? null;
  }
}
