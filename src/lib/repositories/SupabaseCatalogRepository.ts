import { supabase } from '../supabaseClient'; // Corregido el path relativo según la estructura usual
import { ICatalogRepository, AccountCategory, MovementTypeItem } from '../../types/finanzas';

class SupabaseCatalogRepository implements ICatalogRepository {
  async fetchGroups(): Promise<string[]> {
    const { data, error } = await supabase
      .from('account_groups')
      .select('name');

    if (error) {
      console.error('Error fetching groups:', error);
      throw new Error(error.message);
    }

    return data.map(group => group.name);
  }

  async fetchCategories(): Promise<AccountCategory[]> {
    const { data, error } = await supabase
      .from('account_categories')
      .select('id, name'); // CORREGIDO: Eliminado 'created_at' que causaba el quiebre

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error(error.message);
    }

    return data as AccountCategory[];
  }

  async fetchMovementTypes(): Promise<MovementTypeItem[]> {
    const { data, error } = await supabase
      .from('movement_types')
      .select('id, name, code');

    if (error) {
      console.error('Error fetching movement types:', error);
      throw new Error(error.message);
    }

    return data as MovementTypeItem[];
  }

  async addCategory(name: string): Promise<void> {
    const { error } = await supabase
      .from('account_categories')
      .insert([{ name }]);

    if (error) {
      console.error('Error adding category:', error);
      throw new Error(error.message);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('account_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(error.message);
    }
  }

  async addGroup(name: string): Promise<void> {
    const { error } = await supabase
      .from('account_groups')
      .insert([{ name }]);

    if (error) {
      console.error('Error adding group:', error);
      throw new Error(error.message);
    }
  }

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('account_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting group:', error);
      throw new Error(error.message);
    }
  }
}

export const supabaseCatalogRepository = new SupabaseCatalogRepository();
