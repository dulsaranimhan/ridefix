import { supabase } from './supabase';

export interface ProviderIdentity {
  id: string;
  name: string;
}

/**
 * The signed-in Supabase user. The API receives this ID as plain request data and does not verify
 * it against a token yet, so it is not production identity verification.
 */
export async function getProvider(): Promise<ProviderIdentity> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) throw new Error('Please login again.');
  const fullName = user.user_metadata?.full_name;
  const name =
    typeof fullName === 'string' && fullName.trim() ? fullName.trim() : user.email?.split('@')[0];
  return { id: user.id, name: name || 'RideFix Provider' };
}
