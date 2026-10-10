import type { KashClient } from './client';

/** Aviso enviado pelo banco a cada escrita (ver migração `realtime_sync`): só a tabela e a operação. */
export interface UserChange {
  table: string;
  op: 'insert' | 'update' | 'delete';
}

export type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

export interface UserChangesHandlers {
  onChange: (change: UserChange) => void;
  /** conectou (de novo): quem ouve deve recarregar, porque pode ter perdido avisos enquanto esteve fora */
  onSubscribed?: (isReconnect: boolean) => void;
  onStatus?: (status: RealtimeStatus) => void;
}

export const userChannelName = (userId: string) => `user:${userId}`;

/**
 * Assina o canal privado do usuário logado e chama `onChange` a cada escrita feita em qualquer
 * aparelho (app, web ou servidor). Devolve a função para cancelar. O Realtime confere o token:
 * outra pessoa não consegue assinar este canal.
 */
export function subscribeToUserChanges(db: KashClient, userId: string, handlers: UserChangesHandlers): () => void {
  let cancelled = false;
  let subscribedOnce = false;
  const channel = db.channel(userChannelName(userId), { config: { private: true } });

  void (async () => {
    // canais privados precisam do token do usuário no socket do Realtime
    await db.realtime.setAuth();
    if (cancelled) return;
    channel
      .on('broadcast', { event: 'changed' }, (message) => handlers.onChange(message.payload as UserChange))
      .subscribe((status) => {
        handlers.onStatus?.(status as RealtimeStatus);
        if (status === 'SUBSCRIBED') {
          handlers.onSubscribed?.(subscribedOnce);
          subscribedOnce = true;
        }
      });
  })();

  return () => {
    cancelled = true;
    void db.removeChannel(channel);
  };
}
