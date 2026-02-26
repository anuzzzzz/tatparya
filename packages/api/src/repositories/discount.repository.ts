import type { SupabaseClient } from '@supabase/supabase-js';

export class DiscountRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    code: string;
    type: string;
    value: number;
    minOrderValue?: number;
    maxDiscount?: number;
    usageLimit?: number;
    startsAt?: Date;
    endsAt?: Date;
    whatsappOnly?: boolean;
  }) {
    const { data: discount, error } = await this.db
      .from('discounts')
      .insert({
        store_id: storeId,
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        min_order_value: data.minOrderValue || null,
        max_discount: data.maxDiscount || null,
        usage_limit: data.usageLimit || null,
        starts_at: data.startsAt?.toISOString() || new Date().toISOString(),
        ends_at: data.endsAt?.toISOString() || null,
        whatsapp_only: data.whatsappOnly || false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create discount: ${error.message}`);
    return mapDiscountRow(discount);
  }

  async findByCode(storeId: string, code: string) {
    const { data, error } = await this.db
      .from('discounts')
      .select()
      .eq('store_id', storeId)
      .eq('code', code.toUpperCase())
      .single();

    if (error) return null;
    return mapDiscountRow(data);
  }

  async list(storeId: string, activeOnly = true) {
    let query = this.db
      .from('discounts')
      .select()
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (activeOnly) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list discounts: ${error.message}`);
    return (data || []).map(mapDiscountRow);
  }

  async incrementUsage(storeId: string, discountId: string) {
    const discount = await this.findById(storeId, discountId);
    if (!discount) throw new Error('Discount not found');

    const { error } = await this.db
      .from('discounts')
      .update({ used_count: discount.usedCount + 1 })
      .eq('store_id', storeId)
      .eq('id', discountId);

    if (error) throw new Error(`Failed to increment usage: ${error.message}`);
  }

  async findById(storeId: string, discountId: string) {
    const { data, error } = await this.db
      .from('discounts')
      .select()
      .eq('store_id', storeId)
      .eq('id', discountId)
      .single();

    if (error) return null;
    return mapDiscountRow(data);
  }

  async deactivate(storeId: string, discountId: string) {
    const { error } = await this.db
      .from('discounts')
      .update({ active: false })
      .eq('store_id', storeId)
      .eq('id', discountId);

    if (error) throw new Error(`Failed to deactivate: ${error.message}`);
  }
}

function mapDiscountRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as string,
    code: row['code'] as string,
    type: row['type'] as string,
    value: Number(row['value']),
    minOrderValue: row['min_order_value'] ? Number(row['min_order_value']) : null,
    maxDiscount: row['max_discount'] ? Number(row['max_discount']) : null,
    usageLimit: row['usage_limit'] as number | null,
    usedCount: Number(row['used_count']),
    startsAt: row['starts_at'] as string,
    endsAt: row['ends_at'] as string | null,
    active: row['active'] as boolean,
    whatsappOnly: row['whatsapp_only'] as boolean,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
