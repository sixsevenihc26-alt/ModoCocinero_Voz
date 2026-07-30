export class FavoritesService {
  constructor(
    storageKey =
      'modo-cocinero-favorites'
  ) {
    this.storageKey = storageKey;
  }

  getAll() {
    try {
      return JSON.parse(
        localStorage.getItem(
          this.storageKey
        ) || '[]'
      );
    } catch {
      return [];
    }
  }

  isFavorite(recipeId) {
    return this
      .getAll()
      .includes(recipeId);
  }

  toggle(recipeId) {
    const favorites =
      this.getAll();

    const updated =
      favorites.includes(recipeId)
        ? favorites.filter(
            id => id !== recipeId
          )
        : [...favorites, recipeId];

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(updated)
    );

    return updated;
  }

  clear() {
    localStorage.removeItem(
      this.storageKey
    );
  }
}