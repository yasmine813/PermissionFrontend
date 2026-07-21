import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { userApi } from "../src/services/api";
import { useAuthStore } from "../src/store/authStore";

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const set = (key: string) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validatePassword = (pwd: string) =>
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[!@#$%^&*]/.test(pwd);

  const handleChangePassword = async () => {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    if (!validatePassword(form.newPassword)) {
      Alert.alert("Erreur", "Mot de passe trop faible");
      return;
    }
    setSaving(true);
    try {
      await userApi.updatePassword(
        { oldPassword: form.oldPassword, newPassword: form.newPassword },
        accessToken!,
      );
      Alert.alert("✅", "Mot de passe modifié avec succès");
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err?.response?.data?.message || "Mot de passe actuel incorrect",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.headerTitle}>Connexion et sécurité</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel title="Changer le mot de passe" />
        <View style={s.card}>
          <PasswordRow
            label="Mot de passe actuel"
            value={form.oldPassword}
            onChangeText={set("oldPassword")}
            show={showOld}
            onToggle={() => setShowOld(!showOld)}
          />
          <Divider />
          <PasswordRow
            label="Nouveau mot de passe"
            value={form.newPassword}
            onChangeText={set("newPassword")}
            show={showNew}
            onToggle={() => setShowNew(!showNew)}
          />
          <Divider />
          <PasswordRow
            label="Confirmer le nouveau"
            value={form.confirmPassword}
            onChangeText={set("confirmPassword")}
            show={showConfirm}
            onToggle={() => setShowConfirm(!showConfirm)}
          />
        </View>

        {form.newPassword.length > 0 && (
          <View style={s.strengthCard}>
            {[
              { label: "8 caractères min.", ok: form.newPassword.length >= 8 },
              { label: "Majuscule", ok: /[A-Z]/.test(form.newPassword) },
              { label: "Chiffre", ok: /[0-9]/.test(form.newPassword) },
              {
                label: "Caractère spécial",
                ok: /[!@#$%^&*]/.test(form.newPassword),
              },
            ].map((c) => (
              <View key={c.label} style={s.strengthRow}>
                <Ionicons
                  name={c.ok ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={c.ok ? "#38a169" : "#cbd5e0"}
                />
                <Text
                  style={[
                    s.strengthText,
                    { color: c.ok ? "#38a169" : "#a0aec0" },
                  ]}
                >
                  {c.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Changer le mot de passe</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function PasswordRow({ label, value, onChangeText, show, onToggle }: any) {
  return (
    <View style={s.infoRow}>
      <View style={[s.iconWrap, { backgroundColor: "#fff5f5" }]}>
        <Ionicons name="lock-closed-outline" size={18} color="#e53e3e" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={[s.infoInput, { flex: 1 }]}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!show}
            placeholder="••••••••"
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity onPress={onToggle} style={{ padding: 4 }}>
            <Ionicons
              name={show ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#a0aec0"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: "#f5f6fa", marginHorizontal: 16 }}
    />
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1a202c" },
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
  },
  infoRow: {
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
  infoLabel: {
    fontSize: 11,
    color: "#a0aec0",
    marginBottom: 3,
    fontWeight: "500",
  },
  infoInput: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    borderBottomWidth: 1.5,
    borderBottomColor: "#3b82f6",
    paddingVertical: 3,
  },
  strengthCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    gap: 8,
  },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  strengthText: { fontSize: 13 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
