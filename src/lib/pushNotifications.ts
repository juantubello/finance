export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

export function getDeviceId(): string | null {
  return localStorage.getItem("deviceId");
}

export function getAlias(): string | null {
  return localStorage.getItem("pushAlias");
}

export function setAlias(alias: string): void {
  localStorage.setItem("pushAlias", alias);
}

export function getSubscriptionId(): number | null {
  const v = localStorage.getItem("pushSubscriptionId");
  return v ? Number(v) : null;
}

export function setSubscriptionId(id: number): void {
  localStorage.setItem("pushSubscriptionId", String(id));
}

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function subscribePushNotifications(
  alias: string,
  apiSubscribeFn: (data: {
    deviceId: string;
    alias: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) => Promise<{ id: number }>
): Promise<{ id: number } | null> {
  if (!isPushSupported()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const deviceId = getOrCreateDeviceId();
  setAlias(alias);

  const reg = await navigator.serviceWorker.ready;
  const vapidRes = await fetch("/api/push/vapid-public-key");
  const { publicKey } = await vapidRes.json();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  const result = await apiSubscribeFn({
    deviceId,
    alias,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });

  setSubscriptionId(result.id);
  return result;
}
