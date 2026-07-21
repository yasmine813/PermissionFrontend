import { useAuthStore } from "@/src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LANGUAGES = ["Français", "العربية"];
const THEMES = ["Clair", "Sombre", "Système"];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const [notifBooking, setNotifBooking] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [language, setLanguage] = useState("Français");
  const [theme, setTheme] = useState("Clair");
  const [showLang, setShowLang] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  const isInstructor = user?.role === "INSTRUCTOR";

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login" as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert("Supprimer le compte", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => {} },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* Profil rapide */}
        <TouchableOpacity
          style={s.profileCard}
          onPress={() => router.push("/personal" as any)}
          activeOpacity={0.85}
        >
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{user?.fullName}</Text>
            <Text style={s.profileRole}>
              {isInstructor ? "Moniteur" : "Élève"}
            </Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
        </TouchableOpacity>

        {/* Compte */}
        <SectionLabel title="Compte" />
        <View style={s.card}>
          <SettingRow
            icon="person-outline"
            iconBg="#eff6ff"
            iconColor="#3b82f6"
            label="Informations personnelles"
            onPress={() => router.push("/personal" as any)}
          />
          <RowDivider />
          <SettingRow
            icon="lock-closed-outline"
            iconBg="#fff5f5"
            iconColor="#e53e3e"
            label="Connexion et sécurité"
            onPress={() => router.push("/security" as any)}
          />
          <RowDivider />
          <SettingRow
            icon="card-outline"
            iconBg="#f0fff4"
            iconColor="#38a169"
            label={isInstructor ? "Votre pack actuel" : "Mon abonnement"}
            value={user?.subscriptionStatus === "ACTIVE" ? "Actif ✓" : "Essai"}
            valueColor={
              user?.subscriptionStatus === "ACTIVE" ? "#38a169" : "#d97706"
            }
            onPress={() => {}}
          />
        </View>

        {/* Préférences */}
        <SectionLabel title="Préférences" />
        <View style={s.card}>
          <TouchableOpacity
            style={s.row}
            onPress={() => setShowLang(!showLang)}
          >
            <View style={[s.iconWrap, { backgroundColor: "#f5f3ff" }]}>
              <Ionicons name="language-outline" size={18} color="#7c3aed" />
            </View>
            <Text style={s.rowLabel}>Langue</Text>
            <Text style={s.rowValue}>{language}</Text>
            <Ionicons
              name={showLang ? "chevron-up" : "chevron-down"}
              size={16}
              color="#a0aec0"
            />
          </TouchableOpacity>
          {showLang && (
            <View style={s.subList}>
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={s.subItem}
                  onPress={() => {
                    setLanguage(l);
                    setShowLang(false);
                  }}
                >
                  <Text
                    style={[s.subItemText, language === l && s.subItemActive]}
                  >
                    {l}
                  </Text>
                  {language === l && (
                    <Ionicons name="checkmark" size={16} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <RowDivider />
          <TouchableOpacity
            style={s.row}
            onPress={() => setShowTheme(!showTheme)}
          >
            <View style={[s.iconWrap, { backgroundColor: "#fffbeb" }]}>
              <Ionicons
                name="color-palette-outline"
                size={18}
                color="#d97706"
              />
            </View>
            <Text style={s.rowLabel}>Thème</Text>
            <Text style={s.rowValue}>{theme}</Text>
            <Ionicons
              name={showTheme ? "chevron-up" : "chevron-down"}
              size={16}
              color="#a0aec0"
            />
          </TouchableOpacity>
          {showTheme && (
            <View style={s.subList}>
              {THEMES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={s.subItem}
                  onPress={() => {
                    setTheme(t);
                    setShowTheme(false);
                  }}
                >
                  <Text style={[s.subItemText, theme === t && s.subItemActive]}>
                    {t}
                  </Text>
                  {theme === t && (
                    <Ionicons name="checkmark" size={16} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notifications */}
        <SectionLabel title="Notifications" />
        <View style={s.card}>
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>Réservations</Text>
            <Switch
              value={notifBooking}
              onValueChange={setNotifBooking}
              trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
              thumbColor={notifBooking ? "#3b82f6" : "#fff"}
            />
          </View>
          <RowDivider />
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: "#f0fff4" }]}>
              <Ionicons name="chatbubble-outline" size={18} color="#38a169" />
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>Messages</Text>
            <Switch
              value={notifMessages}
              onValueChange={setNotifMessages}
              trackColor={{ false: "#e2e8f0", true: "#86efac" }}
              thumbColor={notifMessages ? "#38a169" : "#fff"}
            />
          </View>
          <RowDivider />
          <View style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: "#fffbeb" }]}>
              <Ionicons name="megaphone-outline" size={18} color="#d97706" />
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>Promotions</Text>
            <Switch
              value={notifPromo}
              onValueChange={setNotifPromo}
              trackColor={{ false: "#e2e8f0", true: "#fde68a" }}
              thumbColor={notifPromo ? "#d97706" : "#fff"}
            />
          </View>
        </View>

        {/* Danger zone */}
        <SectionLabel title="Compte" />
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={handleLogout}>
            <View style={[s.iconWrap, { backgroundColor: "#fff5f5" }]}>
              <Ionicons name="log-out-outline" size={18} color="#e53e3e" />
            </View>
            <Text style={[s.rowLabel, { color: "#e53e3e" }]}>Déconnexion</Text>
            <Ionicons name="chevron-forward" size={16} color="#e53e3e" />
          </TouchableOpacity>
          <RowDivider />
          <TouchableOpacity style={s.row} onPress={handleDeleteAccount}>
            <View style={[s.iconWrap, { backgroundColor: "#fff5f5" }]}>
              <Ionicons name="trash-outline" size={18} color="#e53e3e" />
            </View>
            <Text style={[s.rowLabel, { color: "#e53e3e" }]}>
              Supprimer le compte
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#e53e3e" />
          </TouchableOpacity>
        </View>

        <Text style={s.version}>
          Rokhsa.tn v1.0.0 · Made with ❤️ in Tunisia 🇹🇳
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function RowDivider() {
  return (
    <View
      style={{ height: 1, backgroundColor: "#f5f6fa", marginHorizontal: 16 }}
    />
  );
}

function SettingRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
  onPress,
}: any) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      {value && (
        <Text style={[s.rowValue, valueColor && { color: valueColor }]}>
          {value}
        </Text>
      )}
      <Ionicons name="chevron-forward" size={16} color="#a0aec0" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1a202c" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  profileName: { fontSize: 15, fontWeight: "bold", color: "#1a202c" },
  profileRole: {
    fontSize: 11,
    color: "#3b82f6",
    fontWeight: "600",
    marginTop: 1,
  },
  profileEmail: { fontSize: 12, color: "#718096", marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a0aec0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1a202c" },
  rowValue: { fontSize: 13, color: "#718096", marginRight: 4 },
  subList: {
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  subItemText: { fontSize: 14, color: "#4a5568" },
  subItemActive: { color: "#3b82f6", fontWeight: "700" },
  version: {
    textAlign: "center",
    fontSize: 11,
    color: "#cbd5e0",
    marginTop: 24,
  },
});
