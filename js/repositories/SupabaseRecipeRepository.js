export class SupabaseRecipeRepository {
  constructor(client) {
    this.client = client;
  }

  async getAll() {
    if (!this.client) throw new Error('Supabase no está configurado.');
    const { data, error } = await this.client.from('recipes').select('*');
    if (error) throw error;
    return data ?? [];
  }

  async getById(id) {
    if (!this.client) throw new Error('Supabase no está configurado.');
    const { data, error } = await this.client
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }
}
