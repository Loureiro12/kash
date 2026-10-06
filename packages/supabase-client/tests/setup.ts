// Node 20 não tem WebSocket nativo; o supabase-js precisa de um para o Realtime (não usado nos testes).
import WebSocket from 'ws';

if (!('WebSocket' in globalThis)) {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}
