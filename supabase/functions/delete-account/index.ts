import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleDeleteAccount } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve((req) =>
  handleDeleteAccount(req, {
    getUserId: async (authorization) => {
      const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data, error } = await client.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    deleteUser: async (userId) => {
      const admin = createClient(url, serviceKey);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  }),
);
