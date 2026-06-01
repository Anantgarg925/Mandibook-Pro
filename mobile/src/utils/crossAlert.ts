import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert that works on both native and web.
 * - Native: Uses Alert.alert() with full button support
 * - Web: Uses window.confirm() for two-button alerts, window.alert() for single-button
 */
export function crossAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web fallback
  if (!buttons || buttons.length === 0) {
    window.alert(`${title}${message ? '\n\n' + message : ''}`);
    return;
  }

  if (buttons.length === 1) {
    window.alert(`${title}${message ? '\n\n' + message : ''}`);
    buttons[0].onPress?.();
    return;
  }

  // Two buttons: Cancel + Action
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

  const confirmed = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
  if (confirmed) {
    actionBtn.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
