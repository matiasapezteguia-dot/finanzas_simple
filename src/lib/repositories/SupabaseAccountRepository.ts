import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Account, IAccountRepository, AccountGroup, AccountCategory } from '../../types/finanzas';
import { supabase } from '../supabaseClient'; 

class SupabaseAccountRepository implements IAccountRepository {
  constructor() {}

  async fetchAll(): Promise<Account[]> {
    // CORREGIDO: Mapeo de select con los campos reales de la tabla física en PostgreSQL
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        id,
        name,
        currency,
        initial_amount,
        created_at,
        account_groups (name),
        account_categories (name)
      `);

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    // Traduce de la infraestructura física (inglés/snake_case) al dominio local de la UI
    return data.map((item: any) => ({
      id: item.id,
      nombre: item.name,
      grupo: item.account_groups ? item.account_groups.name : null,
      categoria: item.account_categories ? item.account_categories.name : null,
      moneda: item.currency,
      montoInicial: Number(item.initial_amount) || 0,
      created_at: item.created_at,
    }));
  }

  async save(account: Omit<Account, 'id' | 'created_at'>): Promise<Account> {
    const newId = uuidv4();
    let groupId: string | null = null;
    let categoryId: string | null = null;

    if (account.grupo) {
      const { data: groupData, error: groupError } = await supabase
        .from('account_groups')
        .select('id')
        .eq('name', account.grupo)
        .maybeSingle(); // CORREGIDO: maybeSingle evita excepciones si da vacío

      if (groupError) {
        console.error('Error fetching account group:', groupError);
        throw groupError;
      }
      groupId = groupData ? groupData.id : null;
    }

    if (account.categoria) {
      const { data: categoryData, error: categoryError } = await supabase
        .from('account_categories')
        .select('id')
        .eq('name', account.categoria)
        .maybeSingle();

      if (categoryError) {
        console.error('Error fetching account category:', categoryError);
        throw categoryError;
      }
      categoryId = categoryData ? categoryData.id : null;
    }

    // CORREGIDO: Payload alineado a las columnas relacionales verdaderas
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        id: newId,
        name: account.nombre,
        account_group_id: groupId,
        account_category_id: categoryId,
        currency: account.moneda,
        initial_amount: Number(account.montoInicial) || 0,
        current_amount: Number(account.montoInicial) || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving account:', error);
      throw error;
    }

    return {
      id: data.id,
      nombre: data.name,
      grupo: account.grupo,
      categoria: account.categoria,
      moneda: data.currency,
      montoInicial: Number(data.initial_amount) || 0,
      created_at: data.created_at
    };
  }

  async update(account: Account): Promise<void> {
    let groupId: string | null = null;
    let categoryId: string | null = null;

    if (account.grupo) {
      const { data: groupData, error: groupError } = await supabase
        .from('account_groups')
        .select('id')
        .eq('name', account.grupo)
        .maybeSingle();

      if (groupError) {
        console.error('Error fetching account group:', groupError);
        throw groupError;
      }
      groupId = groupData ? groupData.id : null;
    }

    if (account.categoria) {
      const { data: categoryData, error: categoryError } = await supabase
        .from('account_categories')
        .select('id')
        .eq('name', account.categoria)
        .maybeSingle();

      if (categoryError) {
        console.error('Error fetching account category:', categoryError);
        throw categoryError;
      }
      categoryId = categoryData ? categoryData.id : null;
    }

    // CORREGIDO: Update estructurado con nombres de columnas válidos
    const { error } = await supabase
      .from('accounts')
      .update({
        name: account.nombre,
        account_group_id: groupId,
        account_category_id: categoryId,
        currency: account.moneda,
        initial_amount: Number(account.montoInicial) || 0,
      })
      .eq('id', account.id);

    if (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
}

export const supabaseAccountRepository = new SupabaseAccountRepository();