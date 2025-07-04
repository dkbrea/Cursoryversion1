import { supabase, handleSupabaseError } from '../supabase';
import type { Category } from '@/types';

export const getCategories = async (userId: string): Promise<{ categories: Category[] | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return { categories: null, error: error.message };
    }

    // Transform from database format to application format
    const categories: Category[] = data.map(category => ({
      id: category.id,
      name: category.name,
      userId: category.user_id,
      createdAt: new Date(category.created_at)
    }));

    return { categories };
  } catch (error: any) {
    return { categories: null, error: error.message };
  }
};

export const getCategory = async (categoryId: string): Promise<{ category: Category | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      return { category: null, error: error.message };
    }

    // Transform from database format to application format
    const category: Category = {
      id: data.id,
      name: data.name,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { category };
  } catch (error: any) {
    return { category: null, error: error.message };
  }
};

export const createCategory = async (category: Omit<Category, 'id' | 'createdAt'>): Promise<{ category: Category | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        user_id: category.userId
      })
      .select()
      .single();

    if (error) {
      return { category: null, error: error.message };
    }

    // Transform back to application format
    const newCategory: Category = {
      id: data.id,
      name: data.name,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { category: newCategory };
  } catch (error: any) {
    return { category: null, error: error.message };
  }
};

export const updateCategory = async (categoryId: string, updates: Partial<Omit<Category, 'id' | 'userId' | 'createdAt'>>): Promise<{ category: Category | null; error?: string }> => {
  try {
    // Transform from application format to database format
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      return { category: null, error: error.message };
    }

    // Transform back to application format
    const updatedCategory: Category = {
      id: data.id,
      name: data.name,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    return { category: updatedCategory };
  } catch (error: any) {
    return { category: null, error: error.message };
  }
};

export const deleteCategory = async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
