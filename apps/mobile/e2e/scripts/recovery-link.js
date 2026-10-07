// Busca no Mailpit (SMTP local do Supabase) o último e-mail de recuperação da Lara
// e expõe o deep link em output.recoveryLink.
const MAILPIT = 'http://127.0.0.1:54324/api/v1';
const list = json(http.get(MAILPIT + '/messages?limit=10').body);
const mine = list.messages.filter((m) => m.To.some((t) => t.Address === 'lara@email.com'));
if (mine.length === 0) throw new Error('nenhum e-mail para lara@email.com no Mailpit');
const detail = json(http.get(MAILPIT + '/message/' + mine[0].ID).body);
const match = detail.Text.match(/kash:\/\/reset-password\?[^\s)]+/);
if (!match) throw new Error('link de recuperação não encontrado no e-mail: ' + detail.Text);
output.recoveryLink = match[0];
