import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../src/store/authStore";

export default function Index() {
  const { user, isInitialized, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (user) {
      if (user.role === "INSTRUCTOR") {
        router.replace("/(instructor)/dashboard" as any);
      } else {
        router.replace("/(student)/dashboard" as any);
      }
    } else {
      router.replace("/login" as any);
    }
  }, [isInitialized, user]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
