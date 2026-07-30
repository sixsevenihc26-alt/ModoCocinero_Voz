export class HistoryService {
  constructor(
    storageKey =
      'modo-cocinero-history'
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

  add(recipeId) {
    const history =
      this.getAll();

    const filtered =
      history.filter(
        item =>
          item.recipeId !== recipeId
      );

    const updated = [
      {
        recipeId,
        completedAt:
          new Date().toISOString()
      },
      ...filtered
    ].slice(0, 20);

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