import { useSyncExternalStore } from 'react';

/**
 * Tema da interface. Sem escolha salva, segue o sistema operacional. A escolha
 * vale só neste aparelho (localStorage) e é aplicada antes do CSS pelo script
 * do index.html — as duas pontas usam a mesma chave e as mesmas cores.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';

const STORAGE_KEY = 'meupaciente.theme';
const CHANGE_EVENT = 'meupaciente:theme';
// Cor da barra do navegador/PWA, a mesma das <meta name="theme-color"> do index.html.
const BROWSER_BAR_COLORS: Record<Theme, string> = { light: '#12615c', dark: '#0e1418' };

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

// Preferência em memória: cobre o caso de o localStorage estar bloqueado.
let currentPreference: ThemePreference | null = null;

function readPreference(): ThemePreference {
  if (currentPreference) return currentPreference;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(preference: ThemePreference) {
  const theme: Theme =
    preference === 'system' ? (systemDark().matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  // Com escolha, as duas <meta> (uma por esquema do sistema) usam a cor escolhida.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const metaTheme: Theme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = BROWSER_BAR_COLORS[preference === 'system' ? metaTheme : theme];
  });
}

export function setThemePreference(preference: ThemePreference) {
  currentPreference = preference;
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Armazenamento bloqueado: o tema muda agora, mas não fica salvo.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Preferência de tema deste aparelho e a função para trocá-la. */
export function useThemePreference() {
  const preference = useSyncExternalStore(subscribe, readPreference);
  return [preference, setThemePreference] as const;
}
