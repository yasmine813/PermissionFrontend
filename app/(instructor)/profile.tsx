import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { instructorApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

import * as ImagePicker from "expo-image-picker";

const GOUVERNORATS_VILLES: Record<string, string[]> = {
  Tunis: ["Tunis", "La Marsa", "Le Bardo", "La Goulette", "Carthage"],
  Ariana: ["Ariana", "Ettadhamen", "Mnihla"],
  "Ben Arous": ["Ben Arous", "Hammam Lif", "Hammam Chott"],
  Manouba: ["Manouba", "Den Den", "Douar Hicher"],
  Nabeul: ["Nabeul", "Hammamet", "Kelibia"],
  Bizerte: ["Bizerte", "Menzel Bourguiba", "Mateur"],
  Béja: ["Béja", "Medjez el-Bab", "Testour"],
  Jendouba: ["Jendouba", "Tabarka", "Aïn Draham"],
  Kef: ["Le Kef", "Dahmani"],
  Siliana: ["Siliana", "Makthar"],
  Sousse: ["Sousse", "Msaken", "Hammam Sousse"],
  Monastir: ["Monastir", "Moknine", "Ksar Hellal"],
  Mahdia: ["Mahdia", "Ksour Essef", "El Jem"],
  Sfax: ["Sfax", "Sakiet Ezzit", "El Ain", "Thyna"],
  Kairouan: ["Kairouan", "Sbikha", "Haffouz"],
  Kasserine: ["Kasserine", "Sbeitla", "Thala"],
  "Sidi Bouzid": ["Sidi Bouzid", "Jelma", "Meknassy"],
  Gabès: ["Gabès", "El Hamma", "Matmata"],
  Médenine: ["Médenine", "Djerba", "Zarzis"],
  Tataouine: ["Tataouine", "Ghomrassen", "Remada"],
  Gafsa: ["Gafsa", "Metlaoui", "Moularès"],
  Tozeur: ["Tozeur", "Nefta", "Degache"],
  Kébili: ["Kébili", "Douz", "El Faouar"],
};

const TABS = ["Infos générales", "Voiture", "Prix", "Contact"];

const PERMIS = [
  {
    key: "prixPermisB",
    label: "Permis B",
    sublabel: "Voiture",
    icon: "car-outline",
    bg: "#eff6ff",
    color: "#3b82f6",
  },
  {
    key: "prixPermisA",
    label: "Permis A",
    sublabel: "Moto",
    icon: "bicycle-outline",
    bg: "#f0fff4",
    color: "#38a169",
  },
  {
    key: "prixPermisC",
    label: "Permis C",
    sublabel: "Poids lourd",
    icon: "bus-outline",
    bg: "#fffbeb",
    color: "#d97706",
  },
  {
    key: "prixPermisD",
    label: "Permis D",
    sublabel: "Bus",
    icon: "subway-outline",
    bg: "#fff5f5",
    color: "#e53e3e",
  },
];

interface ProfileData {
  fullName: string;
  phone: string;
  email: string;
  nomCommercial: string;
  gouvernorat: string;
  ville: string;
  adresse: string;
  codePostal: string;
  matricule: string;
  voitureMarque: string;
  voitureModel: string;
  voitureSerie: string;
  voitureDateAchat: string;
  prixPermisB: string;
  prixPermisA: string;
  prixPermisC: string;
  prixPermisD: string;
  bio: string;
  facebook: string;
  instagram: string;
  website: string;
  voiturePhotos: string[];
}

const EMPTY: ProfileData = {
  fullName: "",
  phone: "",
  email: "",
  nomCommercial: "",
  gouvernorat: "",
  ville: "",
  adresse: "",
  codePostal: "",
  matricule: "",
  voitureMarque: "",
  voitureModel: "",
  voitureSerie: "",
  voitureDateAchat: "",
  prixPermisB: "",
  prixPermisA: "",
  prixPermisC: "",
  prixPermisD: "",
  bio: "",
  facebook: "",
  instagram: "",
  website: "",
  voiturePhotos: [],
};

function PhotosSection({
  photos,
  editMode,
  onPhotosChange,
}: {
  photos: string[];
  editMode: boolean;
  onPhotosChange: (photos: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    // Demander permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Veuillez autoriser l'accès à votre galerie dans les paramètres.",
      );
      return;
    }

    if (photos.length >= 5) {
      Alert.alert("Maximum atteint", "Vous pouvez ajouter maximum 5 photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
      exif: false,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploading(true);
      try {
        const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const newPhotos = [...photos, base64Uri];
        await onPhotosChange(newPhotos);
      } finally {
        setUploading(false);
      }
    }
  };

  const removePhoto = async (index: number) => {
    Alert.alert("Supprimer", "Voulez-vous supprimer cette photo ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const newPhotos = photos.filter((_, i) => i !== index);
          await onPhotosChange(newPhotos);
        },
      },
    ]);
  };

  if (photos.length === 0 && !editMode) {
    return (
      <View style={s.noPhotosCard}>
        <Ionicons name="images-outline" size={40} color="#cbd5e0" />
        <Text style={s.noPhotosTitle}>Aucune photo</Text>
        <Text style={s.noPhotosText}>
          Cliquez sur Modifier pour ajouter des photos
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Loading overlay */}
      {uploading && (
        <View style={photoS.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={photoS.loadingText}>Sauvegarde en cours...</Text>
        </View>
      )}
      {/* Grille de photos */}
      {photos.length > 0 && (
        <View style={photoS.grid}>
          {photos.map((photo, index) => (
            <View key={index} style={photoS.photoWrap}>
              <Image
                source={{ uri: photo }}
                style={photoS.photo}
                resizeMode="cover"
              />
              {editMode && (
                <TouchableOpacity
                  style={photoS.deleteBtn}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Bouton ajouter si moins de 5 photos */}
          {editMode && photos.length < 5 && (
            <TouchableOpacity
              style={[photoS.photoWrap, photoS.addBtn]}
              onPress={pickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#3b82f6" />
              ) : (
                <>
                  <Ionicons name="add" size={28} color="#3b82f6" />
                  <Text style={photoS.addBtnText}>Ajouter</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bouton principal si aucune photo */}
      {editMode && photos.length === 0 && (
        <TouchableOpacity
          style={s.photoUpload}
          onPress={pickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#3b82f6" size="large" />
          ) : (
            <>
              <View style={s.photoIconWrap}>
                <Ionicons name="camera-outline" size={28} color="#3b82f6" />
              </View>
              <Text style={s.photoText}>Appuyer pour ajouter des photos</Text>
              <Text style={s.photoSub}>JPG, PNG • Maximum 5 photos</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Compteur */}
      {photos.length > 0 && (
        <Text style={photoS.counter}>{photos.length}/5 photos</Text>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState<ProfileData>(EMPTY);
  const [form, setForm] = useState<ProfileData>(EMPTY);
  const [showGouv, setShowGouv] = useState(false);
  const [showVille, setShowVille] = useState(false);

  const set = (key: keyof ProfileData) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const villes = form.gouvernorat
    ? GOUVERNORATS_VILLES[form.gouvernorat] || []
    : [];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await instructorApi.getProfile(accessToken!);
      const i = res.data.data.instructor;
      const mapped: ProfileData = {
        fullName: i.user?.fullName || "",
        phone: i.user?.phone || "",
        email: i.user?.email || "",
        nomCommercial: i.nomCommercial || "",
        gouvernorat: i.gouvernorat || "",
        ville: i.ville || "",
        adresse: i.adresse || "",
        codePostal: i.codePostal || "",
        matricule: i.licenseNumber || "",
        voitureMarque: i.voitureMarque || "",
        voitureModel: i.voitureModel || "",
        voitureSerie: i.voitureSerie || "",
        voitureDateAchat: i.voitureDateAchat || "",
        prixPermisB: i.prixPermisB?.toString() || "",
        prixPermisA: i.prixPermisA?.toString() || "",
        prixPermisC: i.prixPermisC?.toString() || "",
        prixPermisD: i.prixPermisD?.toString() || "",
        bio: i.bio || "",
        facebook: i.facebook || "",
        instagram: i.instagram || "",
        website: i.website || "",
        voiturePhotos: i.voiturePhotos || [],
      };
      setData(mapped);
      setForm(mapped);
    } catch {
      Alert.alert("Erreur", "Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(data);
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 0) {
        await instructorApi.updateGeneral(
          {
            nomCommercial: form.nomCommercial,
            adresse: form.adresse,
            gouvernorat: form.gouvernorat,
            ville: form.ville,
            codePostal: form.codePostal,
          },
          accessToken!,
        );
      } else if (activeTab === 1) {
        await instructorApi.updateVehicle(
          {
            voitureMarque: form.voitureMarque,
            voitureModel: form.voitureModel,
            voitureSerie: form.voitureSerie,
            voitureDateAchat: form.voitureDateAchat || null,
          },
          accessToken!,
        );
      } else if (activeTab === 2) {
        await instructorApi.updatePrices(
          {
            prixPermisB: form.prixPermisB ? Number(form.prixPermisB) : null,
            prixPermisA: form.prixPermisA ? Number(form.prixPermisA) : null,
            prixPermisC: form.prixPermisC ? Number(form.prixPermisC) : null,
            prixPermisD: form.prixPermisD ? Number(form.prixPermisD) : null,
          },
          accessToken!,
        );
      } else if (activeTab === 3) {
        await instructorApi.updateContact(
          {
            bio: form.bio,
            facebook: form.facebook,
            instagram: form.instagram,
            website: form.website,
          },
          accessToken!,
        );
      }
      setData(form);
      setEditMode(false);
      Alert.alert("✅", "Profil mis à jour !");
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      {/* IMAGE FIXE */}
      <View style={[s.bannerWrap, { paddingTop: insets.top }]}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
          }}
          style={s.bannerImg}
          resizeMode="cover"
        />
        <View style={s.bannerHeader}>
          <TouchableOpacity style={s.menuBtn}>
            <Ionicons name="menu-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.bannerName}>{data.fullName}</Text>
            <Text style={s.bannerSub}>Gérer votre compte</Text>
          </View>
          <View style={s.bannerAvatar}>
            <Ionicons name="person-outline" size={20} color="#3b82f6" />
          </View>
        </View>
      </View>

      {/* TOUT LE RESTE SCROLL */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profil title + Modifier */}
        <View style={s.profileTitleRow}>
          <View style={s.profileIcon}>
            <Ionicons name="car-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={s.profileTitleText}>Profil Auto-école</Text>
          {!editMode ? (
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="pencil-outline" size={14} color="#3b82f6" />
              <Text style={s.editBtnText}>Modifier</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
              <Text style={s.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={s.tabsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={i}
                style={[s.tab, activeTab === i && s.tabActive]}
                onPress={() => {
                  setActiveTab(i);
                  setEditMode(false);
                  setForm(data);
                }}
              >
                <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── TAB 0 : Infos générales ── */}
        {activeTab === 0 && (
          <View style={s.tabContent}>
            <SectionTitle title="Coordonnées" />
            <View style={s.card}>
              <InfoRow
                icon="person-outline"
                iconBg="#eff6ff"
                iconColor="#3b82f6"
                label="Nom Prénom"
                value={data.fullName}
                editMode={false}
                editValue={form.fullName}
                onChangeText={set("fullName")}
              />
              <RowDivider />
              <InfoRow
                icon="call-outline"
                iconBg="#f0fff4"
                iconColor="#38a169"
                label="Téléphone"
                value={data.phone}
                editMode={false}
                editValue={form.phone}
                onChangeText={set("phone")}
              />
              <RowDivider />
              <InfoRow
                icon="mail-outline"
                iconBg="#fff5f5"
                iconColor="#e53e3e"
                label="Email"
                value={data.email}
                editMode={false}
                editValue={form.email}
                onChangeText={set("email")}
              />
              <RowDivider />
              <InfoRow
                icon="business-outline"
                iconBg="#fffbeb"
                iconColor="#d97706"
                label="Nom commercial"
                value={data.nomCommercial}
                editMode={editMode}
                editValue={form.nomCommercial}
                onChangeText={set("nomCommercial")}
              />
            </View>

            <SectionTitle title="Adresse" />
            <View style={s.card}>
              <InfoRow
                icon="location-outline"
                iconBg="#f5f3ff"
                iconColor="#7c3aed"
                label="Gouvernorat"
                value={data.gouvernorat}
                editMode={editMode}
                editValue={form.gouvernorat}
                onChangeText={set("gouvernorat")}
                isSelect
                onSelectPress={() => setShowGouv(true)}
              />
              <RowDivider />
              <InfoRow
                icon="home-outline"
                iconBg="#f0fff4"
                iconColor="#38a169"
                label="Ville"
                value={data.ville}
                editMode={editMode}
                editValue={form.ville}
                onChangeText={set("ville")}
                isSelect
                onSelectPress={() => form.gouvernorat && setShowVille(true)}
                disabled={!form.gouvernorat}
              />
              <RowDivider />
              <InfoRow
                icon="archive-outline"
                iconBg="#eff6ff"
                iconColor="#3b82f6"
                label="Code postal"
                value={data.codePostal}
                editMode={editMode}
                editValue={form.codePostal}
                onChangeText={set("codePostal")}
                keyboardType="numeric"
              />
              <RowDivider />
              <InfoRow
                icon="map-outline"
                iconBg="#fff5f5"
                iconColor="#e53e3e"
                label="Adresse"
                value={data.adresse}
                editMode={editMode}
                editValue={form.adresse}
                onChangeText={set("adresse")}
              />
            </View>

            <SectionTitle title="Informations professionnelles" />
            <View style={s.card}>
              <InfoRow
                icon="ribbon-outline"
                iconBg="#fffbeb"
                iconColor="#d97706"
                label="Matricule"
                value={data.matricule}
                editMode={false}
                editValue={form.matricule}
                onChangeText={set("matricule")}
              />
            </View>
          </View>
        )}

        {/* ── TAB 1 : Voiture ── */}
        {activeTab === 1 && (
          <View style={s.tabContent}>
            <SectionTitle title="Informations véhicule" />
            <View style={s.card}>
              <InfoRow
                icon="car-outline"
                iconBg="#eff6ff"
                iconColor="#3b82f6"
                label="Marque"
                value={data.voitureMarque}
                editMode={editMode}
                editValue={form.voitureMarque}
                onChangeText={set("voitureMarque")}
              />
              <RowDivider />
              <InfoRow
                icon="car-sport-outline"
                iconBg="#f0fff4"
                iconColor="#38a169"
                label="Modèle"
                value={data.voitureModel}
                editMode={editMode}
                editValue={form.voitureModel}
                onChangeText={set("voitureModel")}
              />
              <RowDivider />
              <InfoRow
                icon="barcode-outline"
                iconBg="#f5f3ff"
                iconColor="#7c3aed"
                label="Série"
                value={data.voitureSerie}
                editMode={editMode}
                editValue={form.voitureSerie}
                onChangeText={set("voitureSerie")}
                autoCapitalize="characters"
              />
              <RowDivider />
              <InfoRow
                icon="calendar-outline"
                iconBg="#fffbeb"
                iconColor="#d97706"
                label="Date d'achat"
                value={data.voitureDateAchat}
                editMode={editMode}
                editValue={form.voitureDateAchat}
                onChangeText={set("voitureDateAchat")}
                placeholder="AAAA-MM-JJ"
              />
            </View>

            <SectionTitle title="Photos du véhicule" />
            <PhotosSection
              photos={data.voiturePhotos || []}
              editMode={editMode}
              onPhotosChange={async (newPhotos: string[]) => {
                try {
                  await instructorApi.updateVehiclePhotos(
                    newPhotos,
                    accessToken!,
                  );
                  setData((d) => ({ ...d, voiturePhotos: newPhotos }));
                  setForm((f) => ({ ...f, voiturePhotos: newPhotos }));
                  Alert.alert("✅", "Photos sauvegardées");
                } catch (err: any) {
                  console.error(
                    "PHOTO ERROR:",
                    err?.response?.data || err?.message,
                  );
                  Alert.alert(
                    "Erreur",
                    err?.response?.data?.message || "Image trop grande",
                  );
                }
              }}
            />
          </View>
        )}

        {/* ── TAB 2 : Prix ── */}
        {activeTab === 2 && (
          <View style={s.tabContent}>
            <SectionTitle title="Tarifs par catégorie" />
            <Text style={s.priceNote}>
              Définissez vos tarifs. Laissez vide si vous ne proposez pas la
              catégorie.
            </Text>
            <View style={s.card}>
              {PERMIS.map((p, index) => (
                <View key={p.key}>
                  <View style={s.priceRow}>
                    <View style={[s.permisIconWrap, { backgroundColor: p.bg }]}>
                      <Ionicons
                        name={p.icon as any}
                        size={20}
                        color={p.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.permisLabel}>{p.label}</Text>
                      <Text style={s.permisSub}>{p.sublabel}</Text>
                    </View>
                    {editMode ? (
                      <View style={s.priceInputRow}>
                        <TextInput
                          style={s.priceInput}
                          placeholder="0"
                          placeholderTextColor="#aaa"
                          value={
                            typeof form[p.key as keyof ProfileData] === "string"
                              ? (form[p.key as keyof ProfileData] as string)
                              : ""
                          }
                          onChangeText={set(p.key as keyof ProfileData)}
                          keyboardType="numeric"
                        />
                        <Text style={[s.priceCurrency, { color: p.color }]}>
                          DT
                        </Text>
                      </View>
                    ) : (
                      <View style={[s.priceBadge, { backgroundColor: p.bg }]}>
                        <Text style={[s.priceBadgeText, { color: p.color }]}>
                          {data[p.key as keyof ProfileData]
                            ? `${data[p.key as keyof ProfileData]} DT`
                            : "— DT"}
                        </Text>
                      </View>
                    )}
                  </View>
                  {index < PERMIS.length - 1 && <RowDivider />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── TAB 3 : Contact ── */}
        {activeTab === 3 && (
          <View style={s.tabContent}>
            <SectionTitle title="Description" />
            <View style={s.card}>
              {editMode ? (
                <TextInput
                  style={s.bioInput}
                  placeholder="Décrivez votre expérience, votre méthode pédagogique..."
                  placeholderTextColor="#aaa"
                  value={form.bio}
                  onChangeText={set("bio")}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              ) : (
                <View style={{ padding: 16 }}>
                  <Text
                    style={[
                      s.infoValue,
                      !data.bio && s.emptyText,
                      { lineHeight: 22 },
                    ]}
                  >
                    {data.bio ||
                      "Aucune description — cliquez sur Modifier pour en ajouter."}
                  </Text>
                </View>
              )}
            </View>

            <SectionTitle title="Réseaux sociaux" />
            <View style={s.card}>
              <SocialRow
                icon="logo-facebook"
                iconBg="#e8f0fe"
                iconColor="#1877f2"
                label="Facebook"
                value={data.facebook}
                editValue={form.facebook}
                editMode={editMode}
                onChangeText={set("facebook")}
                placeholder="https://facebook.com/votre-page"
              />
              <RowDivider />
              <SocialRow
                icon="logo-instagram"
                iconBg="#fce7f3"
                iconColor="#e1306c"
                label="Instagram"
                value={data.instagram}
                editValue={form.instagram}
                editMode={editMode}
                onChangeText={set("instagram")}
                placeholder="@votre-compte"
              />
              <RowDivider />
              <SocialRow
                icon="globe-outline"
                iconBg="#f0fff4"
                iconColor="#38a169"
                label="Site web"
                value={data.website}
                editValue={form.website}
                editMode={editMode}
                onChangeText={set("website")}
                placeholder="https://votre-site.tn"
              />
            </View>
          </View>
        )}

        {/* BOUTON ENREGISTRER */}
        {editMode && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
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
                    size={20}
                    color="#fff"
                  />
                  <Text style={s.saveBtnText}>
                    Enregistrer les modifications
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODALS */}
      <SelectModal
        visible={showGouv}
        title="Choisir un gouvernorat"
        items={Object.keys(GOUVERNORATS_VILLES)}
        selected={form.gouvernorat}
        onSelect={(v: string) =>
          setForm((f) => ({ ...f, gouvernorat: v, ville: "" }))
        }
        onClose={() => setShowGouv(false)}
      />
      <SelectModal
        visible={showVille}
        title="Choisir une ville"
        items={villes}
        selected={form.ville}
        onSelect={(v: string) => setForm((f) => ({ ...f, ville: v }))}
        onClose={() => setShowVille(false)}
      />
    </View>
  );
}

// ─── COMPOSANTS ───────────────────────────────────────────────────────────────

function RowDivider() {
  return (
    <View
      style={{ height: 1, backgroundColor: "#f5f6fa", marginHorizontal: 16 }}
    />
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function InfoRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  editMode,
  editValue,
  onChangeText,
  keyboardType,
  autoCapitalize,
  placeholder,
  isSelect,
  onSelectPress,
  disabled,
}: any) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        {editMode ? (
          isSelect ? (
            <TouchableOpacity
              style={[s.selectBtn, disabled && { opacity: 0.4 }]}
              onPress={onSelectPress}
              disabled={disabled}
            >
              <Text style={[s.selectBtnText, !editValue && s.placeholder]}>
                {editValue || "Sélectionner..."}
              </Text>
              <Ionicons name="chevron-down-outline" size={14} color="#3b82f6" />
            </TouchableOpacity>
          ) : (
            <TextInput
              style={s.infoInput}
              value={typeof editValue === "string" ? editValue : ""}
              onChangeText={onChangeText}
              keyboardType={keyboardType || "default"}
              autoCapitalize={autoCapitalize || "sentences"}
              placeholder={placeholder || label}
              placeholderTextColor="#bbb"
            />
          )
        ) : (
          <Text style={[s.infoValue, (!value || value === "—") && s.emptyText]}>
            {value || "Non renseigné"}
          </Text>
        )}
      </View>
    </View>
  );
}

function SocialRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  editValue,
  editMode,
  onChangeText,
  placeholder,
}: any) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        {editMode ? (
          <TextInput
            style={s.infoInput}
            value={typeof editValue === "string" ? editValue : ""}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            keyboardType="url"
          />
        ) : (
          <Text style={[s.infoValue, !value && s.emptyText]} numberOfLines={1}>
            {value || "Non renseigné"}
          </Text>
        )}
      </View>
    </View>
  );
}

function SelectModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
}: any) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((i: string) =>
    i.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <View style={modal.modalHeader}>
            <Text style={modal.title}>{title}</Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                setSearch("");
              }}
            >
              <Ionicons name="close" size={22} color="#718096" />
            </TouchableOpacity>
          </View>

          <View style={modal.searchBox}>
            <Ionicons name="search-outline" size={16} color="#718096" />
            <TextInput
              style={modal.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(i) => i}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[modal.item, selected === item && modal.itemSelected]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                  setSearch("");
                }}
              >
                <Text
                  style={[
                    modal.itemText,
                    selected === item && modal.itemTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {selected === item && (
                  <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View
                style={{
                  height: 1,
                  backgroundColor: "#f5f6fa",
                  marginHorizontal: 4,
                }}
              />
            )}
          />

          <TouchableOpacity
            style={modal.closeBtn}
            onPress={() => {
              onClose();
              setSearch("");
            }}
          >
            <Text style={modal.closeBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bannerWrap: { height: 180, position: "relative" },
  bannerImg: { width: "100%", height: "100%" },
  bannerHeader: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  menuBtn: { padding: 4 },
  bannerName: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  bannerSub: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  bannerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  profileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  profileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  profileTitleText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a202c",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  editBtnText: { fontSize: 13, fontWeight: "700", color: "#3b82f6" },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
  tabsRow: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#a0aec0" },
  tabTextActive: { color: "#3b82f6" },
  tabContent: { padding: 16, gap: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a0aec0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Card
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

  // InfoRow
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
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
    paddingRight: 8,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#3b82f6",
    paddingVertical: 3,
    paddingRight: 4,
  },
  selectBtnText: { fontSize: 14, fontWeight: "600", color: "#1a202c" },
  placeholder: { color: "#bbb", fontWeight: "400" },

  // Photos
  photoUpload: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  photoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: { fontSize: 14, fontWeight: "700", color: "#3b82f6" },
  photoSub: { fontSize: 12, color: "#93c5fd" },
  noPhotosCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  noPhotosTitle: { fontSize: 15, fontWeight: "700", color: "#4a5568" },
  noPhotosText: {
    fontSize: 13,
    color: "#a0aec0",
    textAlign: "center",
    lineHeight: 20,
  },

  // Prix
  priceNote: {
    fontSize: 13,
    color: "#718096",
    marginBottom: 8,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  permisIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  permisLabel: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  permisSub: { fontSize: 11, color: "#a0aec0", marginTop: 2 },
  priceInputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  priceInput: {
    backgroundColor: "#f7f8fc",
    borderRadius: 10,
    padding: 8,
    width: 72,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a202c",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  priceCurrency: { fontSize: 14, fontWeight: "800" },
  priceBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  priceBadgeText: { fontSize: 14, fontWeight: "700" },

  // Bio
  bioInput: {
    padding: 16,
    fontSize: 14,
    color: "#1a202c",
    minHeight: 120,
    lineHeight: 22,
  },

  // Save
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    flex: 1,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#1a202c" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1a202c" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 4,
  },
  itemSelected: {},
  itemText: { fontSize: 15, color: "#1a202c" },
  itemTextSelected: { color: "#3b82f6", fontWeight: "700" },
  closeBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 12,
  },
  closeBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

const photoS = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photo: { width: "100%", height: "100%", backgroundColor: "#f5f6fa" },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  addBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 2,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addBtnText: { fontSize: 11, fontWeight: "600", color: "#3b82f6" },
  counter: { fontSize: 12, color: "#a0aec0", textAlign: "right", marginTop: 8 },
  loadingOverlay: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loadingText: { fontSize: 14, fontWeight: "600", color: "#3b82f6" },
});
