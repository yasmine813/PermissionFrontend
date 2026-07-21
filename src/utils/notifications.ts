import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("❌ Pas un vrai appareil");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  console.log("Permission status:", existing);

  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("❌ Permission refusée");
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("✅ Push token:", token);
    return token;
  } catch (e) {
    console.log("❌ Erreur token:", e);
    return null;
  }
}

export function sendLocalNotification(title: string, body: string) {
  Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}
