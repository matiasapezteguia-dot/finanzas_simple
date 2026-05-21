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
}

export const supabaseCatalogRepository = new SupabaseCatalogRepository();