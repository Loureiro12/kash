import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * Biometria do aparelho (Face ID, Touch ID ou digital no Android). A preferência de bloquear o app
 * é deste aparelho: não vai para o servidor, porque a biometria cadastrada também é local.
 */

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | null;

export interface BiometricSupport {
  /** o aparelho tem o sensor */
  hasHardware: boolean;
  /** há rosto/digital cadastrado no sistema */
  enrolled: boolean;
  kind: BiometricKind;
  /** "Face ID", "Touch ID", "digital"… para usar nos textos */
  label: string;
}

/** Nome amigável do método, por plataforma. */
export function biometricLabel(kind: BiometricKind, os: string = Platform.OS): string {
  if (kind === 'face') return os === 'ios' ? 'Face ID' : 'reconhecimento facial';
  if (kind === 'fingerprint') return os === 'ios' ? 'Touch ID' : 'digital';
  if (kind === 'iris') return 'íris';
  return 'biometria';
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const T = LocalAuthentication.AuthenticationType;
    const kind: BiometricKind = types.includes(T.FACIAL_RECOGNITION) ? 'face' : types.includes(T.FINGERPRINT) ? 'fingerprint' : types.includes(T.IRIS) ? 'iris' : null;
    return { hasHardware, enrolled, kind, label: biometricLabel(kind) };
  } catch {
    return { hasHardware: false, enrolled: false, kind: null, label: biometricLabel(null) };
  }
}

export type AuthOutcome = { ok: true } | { ok: false; cancelled: boolean; message: string };

/** Pede a biometria. O próprio sistema oferece o código do aparelho como alternativa. */
export async function authenticate(promptMessage: string): Promise<AuthOutcome> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancelar', fallbackLabel: 'Usar código do aparelho', disableDeviceFallback: false });
    if (result.success) return { ok: true };
    const cancelled = result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel';
    const message =
      result.error === 'lockout' ? 'Muitas tentativas. Desbloqueie o aparelho e tente de novo.' : result.error === 'not_enrolled' ? 'Nenhuma biometria cadastrada neste aparelho.' : 'Não deu pra confirmar. Tenta de novo.';
    return { ok: false, cancelled, message };
  } catch {
    return { ok: false, cancelled: false, message: 'Não deu pra confirmar. Tenta de novo.' };
  }
}

const KEY = 'kash.biometricLock';

/** Preferência "bloquear com biometria" neste aparelho. */
export const biometricLockPreference = {
  async get(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY)) === '1';
    } catch {
      return false;
    }
  },
  async set(enabled: boolean) {
    try {
      if (enabled) await AsyncStorage.setItem(KEY, '1');
      else await AsyncStorage.removeItem(KEY);
    } catch {
      // sem storage: vale só nesta sessão
    }
  },
};

/** Tempo em segundo plano a partir do qual o app volta bloqueado. */
export const LOCK_AFTER_MS = 30_000;
