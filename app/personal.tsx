import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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

export default function PersonalScreen() {
  const insets = useSafeAreaInsets();
  const { user, accessToken, updateUser } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });

  const set = (key: string) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile(
        { fullName: form.fullName, phone: form.phone },
        accessToken!,
      );
      updateUser({ fullName: form.fullName, phone: form.phone });
      setEditMode(false);
      Alert.alert("✅", "Informations mises à jour");
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err?.response?.data?.message || "Impossible de sauvegarder",
      );
    } finally {
      setSaving(false);
    }
  };

  const pickFromGallery = async () => {
    setShowPhotoModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    setShowPhotoModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleDeleteAvatar = () => {
    Alert.alert("Supprimer", "Voulez-vous supprimer votre photo ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => setAvatarUri(null),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.headerTitle}>Informations personnelles</Text>
        {!editMode ? (
          <TouchableOpacity
            style={s.editIconBtn}
            onPress={() => setEditMode(true)}
          >
            <Ionicons name="pencil-outline" size={18} color="#3b82f6" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => {
              setEditMode(false);
              setForm({
                fullName: user?.fullName || "",
                phone: user?.phone || "",
                email: user?.email || "",
              });
            }}
          >
            <Text style={s.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={s.avatarBtns}>
            <TouchableOpacity
              style={s.changeBtn}
              onPress={() => setShowPhotoModal(true)}
            >
              <Ionicons name="refresh-outline" size={16} color="#3b82f6" />
              <Text style={s.changeBtnText}>Changer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAvatar}>
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={s.deleteBtnText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Infos */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionLabel title="Identité" />
          <View style={s.card}>
            <InfoRow
              icon="person-outline"
              iconBg="#eff6ff"
              iconColor="#3b82f6"
              label="Nom complet"
              value={user?.fullName || ""}
              editValue={form.fullName}
              editMode={editMode}
              onChangeText={set("fullName")}
            />
            <Divider />
          </View>

          <SectionLabel title="Coordonnées" />
          <View style={s.card}>
            <InfoRow
              icon="call-outline"
              iconBg="#f0fff4"
              iconColor="#38a169"
              label="Téléphone"
              value={user?.phone || ""}
              editValue={form.phone}
              editMode={editMode}
              onChangeText={set("phone")}
              keyboardType="phone-pad"
            />
            <Divider />
            <InfoRow
              icon="mail-outline"
              iconBg="#fff5f5"
              iconColor="#e53e3e"
              label="Email"
              value={user?.email || ""}
              editValue={form.email}
              editMode={false}
              onChangeText={set("email")}
            />
          </View>

          <SectionLabel title="Compte" />
          <View style={s.card}>
            <View style={s.infoRow}>
              <View style={[s.iconWrap, { backgroundColor: "#fffbeb" }]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#d97706"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Statut abonnement</Text>
                <Text style={[s.infoValue, { color: "#38a169" }]}>
                  {user?.subscriptionStatus === "ACTIVE" ? "✓ Actif" : "Essai"}
                </Text>
              </View>
            </View>
            <Divider />
            <View style={s.infoRow}>
              <View style={[s.iconWrap, { backgroundColor: "#eff6ff" }]}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color="#3b82f6"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Rôle</Text>
                <Text style={s.infoValue}>
                  {user?.role === "INSTRUCTOR" ? "Moniteur" : "Élève"}
                </Text>
              </View>
            </View>
          </View>

          {editMode && (
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.saveBtnText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal photo */}
      <Modal visible={showPhotoModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Photo de profil</Text>
            <TouchableOpacity style={s.modalItem} onPress={takePhoto}>
              <View style={[s.modalIcon, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="camera-outline" size={22} color="#3b82f6" />
              </View>
              <Text style={s.modalItemText}>Prendre une photo</Text>
              <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: "#f5f6fa" }} />
            <TouchableOpacity style={s.modalItem} onPress={pickFromGallery}>
              <View style={[s.modalIcon, { backgroundColor: "#f0fff4" }]}>
                <Ionicons name="image-outline" size={22} color="#38a169" />
              </View>
              <Text style={s.modalItemText}>Choisir depuis la galerie</Text>
              <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={s.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function InfoRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  editValue,
  editMode,
  onChangeText,
  placeholder,
  keyboardType,
}: any) {
  return (
    <View style={s.infoRow}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        {editMode ? (
          <TextInput
            style={s.infoInput}
            value={editValue}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor="#bbb"
            keyboardType={keyboardType || "default"}
          />
        ) : (
          <Text style={[s.infoValue, !value && s.emptyText]}>
            {value || "Non renseigné"}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1a202c" },
  editIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 4,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 34, fontWeight: "bold", color: "#fff" },
  avatarBtns: { flexDirection: "row", gap: 12 },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  changeBtnText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#ef4444",
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
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
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1a202c" },
  emptyText: {
    color: "#cbd5e0",
    fontStyle: "italic",
    fontWeight: "400",
    fontSize: 13,
  },
  infoInput: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    borderBottomWidth: 1.5,
    borderBottomColor: "#3b82f6",
    paddingVertical: 3,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalItemText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1a202c" },
  modalClose: {
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseText: { fontSize: 15, fontWeight: "700", color: "#718096" },
});
