import type { Router } from 'expo-router';

import { Platform } from 'react-native';

export function resetToRoute(router: Router, href: Parameters<Router['replace']>[0]) {
  if (Platform.OS === 'web' && (typeof href === 'string' ? href === '/' : href.pathname === '/')) {
    window.location.href = typeof href === 'string' ? href : (href.pathname + (href.params ? '?' + new URLSearchParams(href.params as any).toString() : ''));
    return;
  }
  if (router.canDismiss()) router.dismissAll();
  router.replace(normalizeHref(href));
}

export function normalizeHref<T extends Parameters<Router['replace']>[0]>(href: T): T {
  if (typeof href === 'string') {
    if (href === '/(tabs)') return '/' as T;
    if (href.startsWith('/(tabs)/')) return href.replace('/(tabs)', '') as T;
    return href;
  }

  if (href && typeof href === 'object' && 'pathname' in href && typeof href.pathname === 'string') {
    const pathname =
      href.pathname === '/(tabs)'
        ? '/'
        : href.pathname.startsWith('/(tabs)/')
          ? href.pathname.replace('/(tabs)', '')
          : href.pathname;
    return { ...href, pathname } as T;
  }

  return href;
}
