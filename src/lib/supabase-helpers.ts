import { supabase } from './supabase';
import type { RecurringItem } from '@/types';

/**
 * Helper function to insert a single item into a Supabase table
 * This resolves TypeScript issues with the insert method
 */
export async function insertSingleItem<T>(
  table: string,
  item: T
) {
  return supabase
    .from(table)
    .insert(item as any)
    .select()
    .single();
}

/**
 * Helper function specifically for inserting recurring items
 * This ensures the correct type handling for recurring items
 */
export async function insertRecurringItem(item: {
  name: string;
  type: "fixed-expense" | "income" | "subscription";
  amount: number;
  frequency: "monthly" | "bi-weekly" | "weekly" | "daily" | "semi-monthly" | "quarterly" | "yearly";
  start_date: string;
  last_renewal_date?: string;
  end_date?: string;
  semi_monthly_first_pay_date?: string;
  semi_monthly_second_pay_date?: string;
  user_id: string;
  category_id?: string;
  notes?: string;
}) {
  return supabase
    .from('recurring_items')
    .insert([item])
    .select()
    .single();
}
