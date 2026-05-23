import { ITransactionRepository, Movement, MovementCodeType, MonedaType } from '../../types/finanzas';
import { Database } from '../../../supabase_types';
import { SupabaseClient } from '@supabase/supabase-js';

type SupabaseTransactionRow = Database['public']['Tables']['transactions']['Row'];
type SupabaseTransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type SupabaseTransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export class SupabaseTransactionRepository implements ITransactionRepository {
  private supabase: SupabaseClient<Database>;
  private readonly TABLE_NAME = 'transactions';

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  // Helper estricto para validar si una cadena tiene estructura de UUID
  private isUUID(str: string | null | undefined): boolean {
    if (!str) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  }

  private toSupabase(
    movement: Omit<Movement, 'id' | 'created_at' | 'movement_type_code'>,
    relatedTransactionId?: string
  ): Omit<SupabaseTransactionInsert, 'id' | 'created_at'> {
    return {
      account_id: movement.cuentaId,
      movement_type_id: movement.movement_type_id,
      // BLINDAJE: Si no es un UUID válido (ej: texto libre como "asd"), se inserta null
      category_id: this.isUUID(movement.categoria) ? movement.categoria : null,
      amount: movement.monto,
      description: movement.descripcion,
      transaction_date: movement.fecha,
      currency: movement.moneda,
      related_transaction_id: relatedTransactionId,
    };
  }

  private fromSupabase(supabaseTransaction: SupabaseTransactionRow): Movement {
    return {
      id: supabaseTransaction.id!,
      cuentaId: supabaseTransaction.account_id!,
      movement_type_id: supabaseTransaction.movement_type_id!,
      categoria: supabaseTransaction.category_id, // Mapeado desde el campo real
      monto: supabaseTransaction.amount,
      descripcion: supabaseTransaction.description,
      fecha: supabaseTransaction.transaction_date,
      moneda: supabaseTransaction.currency as MonedaType,
      created_at: supabaseTransaction.created_at,
    };
  }

  async fetchAll(): Promise<Movement[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE_NAME)
      .select('*');

    if (error) {
      throw new Error(`Error fetching transactions: ${error.message}`);
    }

    // CORREGIDO: Se añade .bind(this) para que no falle el contexto en la iteración
    return (data as SupabaseTransactionRow[]).map(this.fromSupabase.bind(this));
  }

  async save(movement: Omit<Movement, 'id' | 'created_at' | 'movement_type_code'>): Promise<void> {
    const movementTypeCode: MovementCodeType | undefined = (movement as Movement).movement_type_code as MovementCodeType;

    if (movementTypeCode === 'transfer' && movement.sourceAccountId && movement.targetAccountId) {
      const { cuentaId, monto, ...rest } = movement;

      const sourceTransactionData = this.toSupabase({
        ...rest,
        cuentaId: movement.sourceAccountId,
        monto: -Math.abs(monto),
      });

      const { data: sourceResult, error: sourceError } = await this.supabase
        .from(this.TABLE_NAME)
        .insert(sourceTransactionData as SupabaseTransactionInsert)
        .select('*');

      if (sourceError) {
        throw new Error(`Error saving source transfer transaction: ${sourceError.message}`);
      }

      const relatedTransactionId = (sourceResult as SupabaseTransactionRow[])?.[0]?.id;

      if (!relatedTransactionId) {
        throw new Error('Could not get ID for source transfer transaction.');
      }

      const targetTransactionData = this.toSupabase(
        {
          ...rest,
          cuentaId: movement.targetAccountId,
          monto: Math.abs(monto),
        },
        relatedTransactionId
      );

      const { data: targetResult, error: targetError } = await this.supabase
        .from(this.TABLE_NAME)
        .insert(targetTransactionData as SupabaseTransactionInsert)
        .select('*');

      if (targetError) {
        throw new Error(`Error saving target transfer transaction: ${targetError.message}`);
      }

      const { error: updateSourceError } = await this.supabase
        .from(this.TABLE_NAME)
        .update({ related_transaction_id: (targetResult as SupabaseTransactionRow[])?.[0]?.id } as SupabaseTransactionUpdate)
        .eq('id', relatedTransactionId);

      if (updateSourceError) {
        console.error(`Error updating source transaction with related_transaction_id: ${updateSourceError.message}`);
      }

    } else {
      const supabaseData = this.toSupabase(movement);
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .insert(supabaseData as SupabaseTransactionInsert);

      if (error) {
        throw new Error(`Error saving transaction: ${error.message}`);
      }
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting transaction: ${error.message}`);
    }
  }
}

