import type { Session } from '@supabase/supabase-js';
import { OAUTH_CALLBACK_PATH, sessionFromOAuthRedirect, signInWithAppleIdToken, socialSignInUrl, type SocialProvider } from '@kash/supabase-client';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/** esquema do deep link (app.json → scheme) */
const SCHEME = 'kash';
export const OAUTH_REDIRECT = `${SCHEME}://${OAUTH_CALLBACK_PATH}`;

/** "Entrar com Apple" nativo só no iOS 13+ (no Android a Apple vai pelo navegador). */
export async function nativeAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Folha nativa da Apple → token → sessão do Supabase. null = a pessoa cancelou. */
async function signInWithAppleNative(): Promise<Session | null> {
  // a Apple recebe o hash do nonce; o Supabase confere com o valor original
  const nonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw err;
  }
  if (!credential.identityToken) throw new Error('A Apple não devolveu o login. Tente de novo.');
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  return signInWithAppleIdToken(supabase, { token: credential.identityToken, nonce, fullName });
}

/** Login do provedor numa janela segura do sistema, voltando para `kash://auth-callback`. null = cancelou. */
async function signInWithBrowser(provider: SocialProvider): Promise<Session | null> {
  const url = await socialSignInUrl(supabase, provider, OAUTH_REDIRECT);
  const result = await WebBrowser.openAuthSessionAsync(url, OAUTH_REDIRECT);
  if (result.type !== 'success') return null;
  return sessionFromOAuthRedirect(supabase, result.url);
}

/** Entrar com Apple ou Google. Apple no iPhone usa a folha nativa; o resto, o navegador do sistema. */
export async function signInWithProvider(provider: SocialProvider): Promise<Session | null> {
  if (provider === 'apple' && (await nativeAppleAvailable())) return signInWithAppleNative();
  return signInWithBrowser(provider);
}
