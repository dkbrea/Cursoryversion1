import { supabase, handleSupabaseError } from '../supabase';
import type { User } from '@/types';

export const signUp = async (email: string, password: string, firstName?: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: firstName ? {
        data: {
          first_name: firstName,
        }
      } : undefined,
    });

    if (error) {
      return handleSupabaseError(error);
    }

    if (data?.user && firstName) {
      // Create a user profile in our users table using the existing name column
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email || '',
          name: firstName, // Use the name column instead of first_name
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't prevent signup if profile creation fails
      }
    }

    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const signIn = async (email: string, password: string): Promise<{ data?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return handleSupabaseError(error);
    }

    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const signOut = async (): Promise<{ success?: boolean; error?: string }> => {
  try {
    console.log('Starting sign out process...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.log('Supabase signOut returned error:', error);
      
      // Handle AuthSessionMissingError specifically
      if (error.message?.includes('Auth session missing') || 
          error.name === 'AuthSessionMissingError' ||
          error.toString().includes('AuthSessionMissingError')) {
        console.log('No active session to sign out from, treating as successful signout');
        return { success: true };
      }
      
      return handleSupabaseError(error);
    }
    
    console.log('Sign out successful');
    return { success: true };
  } catch (error: any) {
    console.log('Sign out caught error:', error);
    
    // Handle AuthSessionMissingError that might be thrown as exception
    if (error.message?.includes('Auth session missing') || 
        error.name === 'AuthSessionMissingError' ||
        error.toString().includes('AuthSessionMissingError')) {
      console.log('Caught AuthSessionMissingError - treating as successful signout');
      return { success: true };
    }
    
    return handleSupabaseError(error);
  }
};

export const getCurrentUser = async (): Promise<{ user: User | null; error?: string }> => {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return { user: null, error: sessionError.message };
    }
    
    if (!session) {
      console.log('No active session found');
      return { user: null };
    }

    // Try to get user profile from our users table first
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userProfile && !profileError) {
      // Use data from our users table
      const userObj: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name || session.user.email?.split('@')[0] || 'User',
        avatarUrl: userProfile.avatar_url || session.user.user_metadata?.avatar_url || null
      };

      return { user: userObj };
    }

    // If no profile exists, create one
    if (!userProfile && !profileError) {
      console.log('Creating user profile for:', session.user.id);
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        // Fall back to session data
      } else if (newProfile) {
        const userObj: User = {
          id: newProfile.id,
          email: newProfile.email,
          name: newProfile.name || session.user.email?.split('@')[0] || 'User',
          avatarUrl: newProfile.avatar_url || session.user.user_metadata?.avatar_url || null
        };
        return { user: userObj };
      }
    }

    // Fallback to session data if no profile found or creation failed
    const userObj: User = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
      avatarUrl: session.user.user_metadata?.avatar_url || null
    };

    return { user: userObj };
  } catch (error: any) {
    console.error('getCurrentUser error:', error);
    return { user: null, error: error.message };
  }
};

export const updateUserProfile = async (
  userId: string, 
  updates: { firstName?: string; lastName?: string; avatar?: string }
): Promise<{ user: User | null; error?: string }> => {
  try {
    const updateData: any = {};
    
    // Combine firstName and lastName into the name field
    if (updates.firstName !== undefined) {
      // For now, just use firstName as the full name
      // You could extend this to handle lastName if needed
      updateData.name = updates.firstName;
    }
    
    if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { user: null, error: error.message };
    }

    // Transform back to application format
    const updatedUser: User = {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0] || 'User',
      avatarUrl: data.avatar_url || null
    };

    return { user: updatedUser };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};
