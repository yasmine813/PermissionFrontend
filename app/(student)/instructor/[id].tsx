import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { instructorsApi, invitationsApi } from "../../../src/services/api";

import { useAuthStore } from "../../../src/store/authStore";

const { width } = Dimensions.get("window");

const PERMIS = [
  {
    key: "prixPermisB",
    label: "B",
    sublabel: "Voiture",
    color: "#3b82f6",
    lightColor: "#eff6ff",
  },
  {
    key: "prixPermisA",
    label: "A",
    sublabel: "Moto",
    color: "#10b981",
    lightColor: "#f0fff4",
  },
  {
    key: "prixPermisC",
    label: "C",
    sublabel: "Poids lourd",
    color: "#f59e0b",
    lightColor: "#fffbeb",
  },
  {
    key: "prixPermisD",
    label: "D",
    sublabel: "Bus",
    color: "#ef4444",
    lightColor: "#fff5f5",
  },
];

const TABS = ["À propos", "Véhicule", "Tarifs"];

export default function InstructorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { accessToken } = useAuthStore();
  const [instructor, setInstructor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [inviting, setInviting] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<string | null>(null);

  const [alreadyLinked, setAlreadyLinked] = useState(false);
  const [alreadyInvited, setAlreadyInvited] = useState(false);

  const loadInstructor = async () => {
    try {
      const [res, myInstructorRes] = await Promise.all([
        instructorsApi.getById(id as string, accessToken!),
        invitationsApi.getMyInstructor(accessToken!),
      ]);
      setInstructor(res.data.data.instructor);
      if (myInstructorRes.data.data.instructor) {
        setAlreadyLinked(true);
      }
    } catch {
      Alert.alert("Erreur", "Impossible de charger le profil");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructor();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!instructor) return null;

  const initials =
    instructor.user?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const availablePermis = PERMIS.filter((p) => instructor[p.key]);
  const minPrice =
    availablePermis.length > 0
      ? Math.min(...availablePermis.map((p) => instructor[p.key]))
      : null;

  const handleInvite = async () => {
    setInviting(true);
    try {
      await invitationsApi.send(id as string, undefined, accessToken!);
      setInvitationStatus("PENDING");
      Alert.alert("✅", "Invitation envoyée avec succès !");
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err?.response?.data?.message || "Impossible d'envoyer l'invitation",
      );
    } finally {
      setInviting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section avec fond coloré */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGradient}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
              </View>
            </View>

            <Text style={styles.heroName}>{instructor.user?.fullName}</Text>
            {instructor.nomCommercial && (
              <Text style={styles.heroCommercial}>
                {instructor.nomCommercial}
              </Text>
            )}

            <View style={styles.heroMeta}>
              {instructor.ratingAvg > 0 && (
                <View style={styles.heroMetaItem}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.heroMetaText}>
                    {instructor.ratingAvg?.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{availablePermis.length}</Text>
              <Text style={styles.statLabel}>Catégories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {instructor.ratingAvg?.toFixed(1) || "—"}
              </Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {minPrice ? `${minPrice}` : "—"}
              </Text>
              <Text style={styles.statLabel}>À partir de (DT/h)</Text>
            </View>
          </View>
        </View>

        {/* Tabs Modernes */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.tab, activeTab === i && styles.tabActive]}
                onPress={() => setActiveTab(i)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === i && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
                {activeTab === i && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Tab 0 : Infos */}
          {activeTab === 0 && (
            <View style={styles.section}>
              {instructor.bio && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="person-outline" size={20} color="#3b82f6" />
                    <Text style={styles.cardTitle}>À propos</Text>
                  </View>
                  <Text style={styles.bioText}>{instructor.bio}</Text>
                </View>
              )}

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="call-outline" size={20} color="#3b82f6" />
                  <Text style={styles.cardTitle}>Coordonnées</Text>
                </View>
                <InfoItem
                  icon="call-outline"
                  label="Téléphone"
                  value={instructor.user?.phone || "—"}
                />
                <InfoItem
                  icon="mail-outline"
                  label="Email"
                  value={instructor.user?.email || "—"}
                />
                <InfoItem
                  icon="location-outline"
                  label="Gouvernorat"
                  value={instructor.gouvernorat || "—"}
                />
                <InfoItem
                  icon="home-outline"
                  label="Ville"
                  value={instructor.ville || "—"}
                />
                <InfoItem
                  icon="map-outline"
                  label="Adresse"
                  value={instructor.adresse || "—"}
                />
                <InfoItem
                  icon="archive-outline"
                  label="Code postal"
                  value={instructor.codePostal || "—"}
                />
              </View>

              {(instructor.facebook ||
                instructor.instagram ||
                instructor.website) && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name="share-social-outline"
                      size={20}
                      color="#3b82f6"
                    />
                    <Text style={styles.cardTitle}>Réseaux sociaux</Text>
                  </View>
                  {instructor.facebook && (
                    <SocialItem
                      platform="facebook"
                      value={instructor.facebook}
                    />
                  )}
                  {instructor.instagram && (
                    <SocialItem
                      platform="instagram"
                      value={instructor.instagram}
                    />
                  )}
                  {instructor.website && (
                    <SocialItem platform="website" value={instructor.website} />
                  )}
                </View>
              )}
            </View>
          )}

          {/* Tab 1 : Voiture */}
          {activeTab === 1 && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="car-outline" size={20} color="#3b82f6" />
                  <Text style={styles.cardTitle}>Véhicule </Text>
                </View>
                <InfoItem
                  icon="car-outline"
                  label="Marque"
                  value={instructor.voitureMarque || "—"}
                />
                <InfoItem
                  icon="car-sport-outline"
                  label="Modèle"
                  value={instructor.voitureModel || "—"}
                />
                <InfoItem
                  icon="barcode-outline"
                  label="Série"
                  value={instructor.voitureSerie || "—"}
                />
                <InfoItem
                  icon="calendar-outline"
                  label="Date d'achat"
                  value={
                    instructor.voitureDateAchat
                      ? new Date(
                          instructor.voitureDateAchat,
                        ).toLocaleDateString("fr")
                      : "—"
                  }
                />
              </View>

              {instructor.voiturePhotos?.length > 0 ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="images-outline" size={20} color="#3b82f6" />
                    <Text style={styles.cardTitle}>Galerie photos</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                  >
                    {instructor.voiturePhotos.map(
                      (photo: string, i: number) => (
                        <Image
                          key={i}
                          source={{ uri: photo }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
                      ),
                    )}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="images-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Aucune photo disponible</Text>
                </View>
              )}
            </View>
          )}

          {/* Tab 2 : Tarifs */}
          {activeTab === 2 && (
            <View style={styles.section}>
              {availablePermis.length > 0 ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="cash-outline" size={20} color="#3b82f6" />
                    <Text style={styles.cardTitle}>Tarifs par catégorie</Text>
                  </View>
                  {availablePermis.map((p, i) => (
                    <View key={p.key}>
                      <View style={styles.priceItem}>
                        <View
                          style={[
                            styles.priceIcon,
                            { backgroundColor: p.lightColor },
                          ]}
                        >
                          <Text
                            style={[styles.priceIconText, { color: p.color }]}
                          >
                            {p.label}
                          </Text>
                        </View>
                        <View style={styles.priceInfo}>
                          <Text style={styles.priceName}>Permis {p.label}</Text>
                          <Text style={styles.priceSub}>{p.sublabel}</Text>
                        </View>
                        <View style={styles.priceValue}>
                          <Text
                            style={[styles.priceAmount, { color: p.color }]}
                          >
                            {instructor[p.key]}
                          </Text>
                          <Text style={styles.priceCurrency}>DT/h</Text>
                        </View>
                      </View>
                      {i < availablePermis.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Aucun tarif renseigné</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bouton Inviter */}
      <View
        style={[styles.inviteContainer, { paddingBottom: insets.bottom || 16 }]}
      >
        <TouchableOpacity
          style={[
            styles.inviteBtn,
            (inviting || invitationStatus === "PENDING" || alreadyLinked) && {
              opacity: 0.6,
            },
          ]}
          onPress={handleInvite}
          disabled={inviting || invitationStatus === "PENDING" || alreadyLinked}
        >
          <View style={styles.inviteGradient}>
            {inviting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={
                    alreadyLinked
                      ? "lock-closed-outline"
                      : invitationStatus === "PENDING"
                        ? "time-outline"
                        : "paper-plane-outline"
                  }
                  size={20}
                  color="#fff"
                />
                <Text style={styles.inviteBtnText}>
                  {alreadyLinked
                    ? "Vous avez déjà un moniteur"
                    : invitationStatus === "PENDING"
                      ? "Invitation envoyée"
                      : "Inviter ce moniteur"}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Composants réutilisables
function InfoItem({ icon, label, value }: any) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#64748b" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SocialItem({ platform, value }: any) {
  const getIcon = () => {
    switch (platform) {
      case "facebook":
        return "logo-facebook";
      case "instagram":
        return "logo-instagram";
      case "website":
        return "globe-outline";
      default:
        return "link-outline";
    }
  };

  const getColor = () => {
    switch (platform) {
      case "facebook":
        return "#1877f2";
      case "instagram":
        return "#e1306c";
      case "website":
        return "#10b981";
      default:
        return "#64748b";
    }
  };

  return (
    <View style={styles.socialItem}>
      <View style={[styles.socialIcon, { backgroundColor: getColor() + "10" }]}>
        <Ionicons name={getIcon()} size={20} color={getColor()} />
      </View>
      <Text style={styles.socialLabel}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </Text>
      <Text style={styles.socialValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#5b95e2",
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroContent: {
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#3b82f6",
    padding: 3,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "700",
    color: "#3b82f6",
  },
  statusBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  heroCommercial: {
    fontSize: 15,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  heroMeta: {
    flexDirection: "row",
    gap: 16,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginTop: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  tabsWrapper: {
    backgroundColor: "#fff",
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  tabsContainer: {
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },
  tabTextActive: {
    color: "#3b82f6",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -2,
    width: 30,
    height: 3,
    backgroundColor: "#3b82f6",
    borderRadius: 2,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  permisGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  permisCard: {
    flex: 1,
    minWidth: (width - 72) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  permisIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  permisLetter: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  permisSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  permisPrice: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  bioText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  socialItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
    marginRight: 8,
    minWidth: 70,
  },
  socialValue: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
  },
  photosScroll: {
    flexDirection: "row",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  priceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  priceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  priceIconText: {
    fontSize: 20,
    fontWeight: "700",
  },
  priceInfo: {
    flex: 1,
  },
  priceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  priceSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  priceValue: {
    alignItems: "flex-end",
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  priceCurrency: {
    fontSize: 11,
    color: "#94a3b8",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  inviteContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  inviteBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  inviteGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    backgroundColor: "#3b82f6",
  },
  inviteBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
