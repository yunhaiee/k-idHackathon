import { router } from 'expo-router';

/**
 * Back that always goes somewhere. A page opened directly (a link, a reload, a /demo iframe) has no history,
 * and router.back() then does nothing ("GO_BACK was not handled"), so fall back to the Market tab.
 * The persona lives in app state, so the fallback stays on the same persona.
 */
export function goBack(fallback: '/' | '/inbox' | '/shop' | '/parent' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
