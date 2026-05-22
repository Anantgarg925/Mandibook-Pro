import type { Router } from 'expo-router';

export function resetToRoute(router: Router, href: Parameters<Router['replace']>[0]) {
  router.dismissAll();
  router.replace(href);
}
