import { Alert, Platform } from 'react-native';

/**
 * Polyfill Alert.alert for web.
 *
 * React Native's Alert.alert is a no-op on web when called with buttons.
 * This patches it globally so every existing Alert.alert call in the entire
 * codebase automatically uses window.confirm() / window.alert() on the web.
 *
 * Call this once at app startup (before any UI renders).
 */
export function patchAlertForWeb(): void {
  if (Platform.OS !== 'web') return;

  const originalAlert = Alert.alert.bind(Alert);

  Alert.alert = (title: string, message?: string, buttons?: any[], options?: any) => {
    // No buttons or single button -> simple alert
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      return;
    }

    if (buttons.length === 1) {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      buttons[0].onPress?.();
      return;
    }

    // Two or more buttons: use confirm()
    const cancelBtn = buttons.find((b: any) => b.style === 'cancel');
    const actionBtn = buttons.find((b: any) => b.style !== 'cancel') || buttons[buttons.length - 1];

    const confirmed = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
    if (confirmed) {
      actionBtn.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  };
}
