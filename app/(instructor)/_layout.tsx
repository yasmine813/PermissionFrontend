import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { invitationsApi, notificationsApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

function NotifBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -4,
        right: -8,
        backgroundColor: "#e53e3e",
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

export default function InstructorLayout() {
  const { accessToken } = useAuthStore();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadCount = async () => {
    try {
      const [notifRes, invitRes] = await Promise.all([
        notificationsApi.getCount(accessToken!),
        invitationsApi.getNotificationCount(accessToken!),
      ]);
      setNotifCount(notifRes.data.data.count + invitRes.data.data.count);
    } catch {}
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3b82f6",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendrier",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Élèves",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons
                name="notifications-outline"
                size={size}
                color={color}
              />
              <NotifBadge count={notifCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Paramètres",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="session/[id]" options={{ href: null }} />
      <Tabs.Screen name="today" options={{ href: null }} />
    </Tabs>
  );
}
