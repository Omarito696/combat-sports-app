// Compatibility facade for existing screens; all real persistence uses Supabase.
import { supabase, isSimulation } from './supabaseClient';
import { entityTables } from './entityTables';
import { createSimulationEntities, simulationUser } from './simulationStore';
import { createRealEntities } from './realEntities';

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
function realOnly() { if (isSimulation) throw new Error('Account operations are unavailable in simulation mode'); }
const auth = {
  async me() {
    if (isSimulation) return simulationUser;
    const { user } = await unwrap(supabase.auth.getUser());
    if (!user) throw Object.assign(new Error('Sign in required'), { status: 401 });
    return { id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email, role: user.app_metadata?.role || 'user' };
  },
  async loginViaEmailPassword(email, password) { realOnly(); return unwrap(supabase.auth.signInWithPassword({ email, password })); },
  async register({ email, password }) { realOnly(); return unwrap(supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })); },
  async verifyOtp({ email, otpCode }) { realOnly(); const data = await unwrap(supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' })); return data.session; },
  async resendOtp(email) { realOnly(); return unwrap(supabase.auth.resend({ type: 'signup', email })); },
  async loginWithProvider(provider, path = '/') { realOnly(); return unwrap(supabase.auth.signInWithOAuth({ provider, options: { redirectTo: new URL(path, window.location.origin).href } })); },
  async resetPasswordRequest(email) { realOnly(); return unwrap(supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })); },
  async resetPassword({ newPassword }) { realOnly(); return unwrap(supabase.auth.updateUser({ password: newPassword })); },
  async logout() { if (!isSimulation) await unwrap(supabase.auth.signOut()); window.location.assign('/login'); },
  redirectToLogin() { window.location.assign('/login'); },
};
export const base44 = {
  auth,
  entities: isSimulation ? createSimulationEntities(window.localStorage, entityTables) : createRealEntities(supabase, entityTables),
  integrations: { Core: { async InvokeLLM() { throw new Error('AI generation is not connected. Generated content cannot be used as real sports data.'); } } },
};
