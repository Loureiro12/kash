// "Outro aparelho": a Lara lança um gasto pela API do Supabase local (como a web faria).
// Expõe o id do lançamento em output.remoteTxId. A anon key é a chave pública de demonstração do CLI.
const API = 'http://127.0.0.1:54321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const login = http.post(API + '/auth/v1/token?grant_type=password', {
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'lara@email.com', password: '123456' }),
});
const token = json(login.body).access_token;
if (!token) throw new Error('login falhou: ' + login.body);
const auth = { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
const accounts = json(http.get(API + '/rest/v1/accounts?select=id&order=position&limit=1', { headers: auth }).body);
const now = new Date();
const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
const created = http.post(API + '/rest/v1/transactions?select=id', {
  headers: Object.assign({ Prefer: 'return=representation' }, auth),
  body: JSON.stringify({ title: 'Compra pelo navegador', category: 'Mercado', amount: -42.5, date: today, source_type: 'account', source_id: accounts[0].id }),
});
const rows = json(created.body);
if (!rows[0]) throw new Error('lançamento não criado: ' + created.body);
output.remoteTxId = rows[0].id;
