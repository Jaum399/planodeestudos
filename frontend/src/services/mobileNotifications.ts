import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function requestMobileNotificationPermissions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const permissions = await LocalNotifications.checkPermissions();

    if (permissions.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (error) {
    console.warn('Falha ao solicitar permissões de notificações locais:', error);
  }
}
