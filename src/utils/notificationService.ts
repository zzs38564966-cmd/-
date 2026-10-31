/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isServiceWorkerReady: boolean;
  isPushSupported: boolean;
  iosPwaRequirementNotice?: string;
}

export function getNotificationCapabilities(): NotificationStatus {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const permission = isSupported ? Notification.permission : 'denied';
  const isServiceWorkerReady = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const isPushSupported = isServiceWorkerReady && 'PushManager' in window;

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  let iosPwaRequirementNotice: string | undefined;
  if (isIOS && !isStandalone) {
    iosPwaRequirementNotice =
      'Apple iOS 16.4+ 规定：普通 Safari 标签页不支持 Web Push，必须先将网页「添加到主屏幕」以独立 App 模式启动后，方可申请推送通知。';
  }

  return {
    isSupported,
    permission,
    isServiceWorkerReady,
    isPushSupported,
    iosPwaRequirementNotice,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Request notification permission error:', err);
    return 'denied';
  }
}

export interface ShowNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
}

export async function sendSystemNotification({
  title,
  body,
  icon = '/pwa-192x192.png',
  tag = 'finance-alert',
  data,
}: ShowNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Prefer Service Worker registration showNotification (works on mobile PWA & Android)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: '/pwa-192x192.png',
          tag,
          data,
        });
        return true;
      }
    }

    // Fallback to classic browser Notification
    new Notification(title, {
      body,
      icon,
      tag,
      data,
    });
    return true;
  } catch (err) {
    console.warn('Send system notification error:', err);
    return false;
  }
}
