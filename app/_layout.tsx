import { Stack } from "expo-router";
import { useEffect } from "react";
import { userApi } from "../src/services/api";
import { useAuthStore } from "../src/store/authStore";
import { registerForPushNotifications } from "../src/utils/notifications";

export default function RootLayout() {
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (user && accessToken) {
      registerForPushNotifications().then((token) => {
        if (token) {
          userApi.savePushToken(token, accessToken).catch(() => {});
        }
      });
    }
  }, [user]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f7f8fc" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(instructor)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="personal" />
      <Stack.Screen name="security" />

      
    </Stack>
  );
}
