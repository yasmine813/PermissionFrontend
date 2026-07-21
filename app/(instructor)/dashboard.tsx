import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { instructorApi, invitationsApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const STATUS_COLOR: Record<string, string> = {
  PENDING_STUDENT: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  PENDING_VALIDATION: "#f97316",
  COMPLETED: "#38a169",
  REFUSED: "#e53e3e",
  CANCELLED: "#a0aec0",
};

const DAYS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function getInitials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuthStore();

  const [sessions, setSessions] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, invitRes, studentsRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/sessions/instructor`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json()),
        invitationsApi.getReceived(accessToken!),
        instructorApi.getStudents({}, accessToken!),
      ]);
      setSessions(sessionsRes.data?.sessions || []);
      setInvitations(invitRes.data.data.invitations || []);
      setStudents(studentsRes.data.data.students || []);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await invitationsApi.accept(id, accessToken!);
      loadData();
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (id: string) => {
    Alert.alert("Refuser", "Voulez-vous refuser cette invitation ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Refuser",
        style: "destructive",
        onPress: async () => {
          setActionLoading(id);
          try {
            await invitationsApi.refuse(id, accessToken!);
            loadData();
          } catch {
            Alert.alert("Erreur", "Impossible de refuser");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter(
    (s) =>
      s.scheduledAt.split("T")[0] === today &&
      !["REFUSED", "CANCELLED"].includes(s.status),
  );

  const confirmedToday = todaySessions.filter(
    (s) => s.status === "CONFIRMED",
  ).length;
  const pendingToday = todaySessions.filter(
    (s) => s.status === "PENDING_STUDENT",
  ).length;
  const inProgressToday = todaySessions.filter((s) =>
    ["IN_PROGRESS", "PENDING_VALIDATION"].includes(s.status),
  ).length;

  const totalStudents = students.filter(
    (s) => s.studentRelation?.isActive,
  ).length;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const pendingSessions = sessions.filter(
    (s) => s.status === "PENDING_STUDENT",
  ).length;

  const now = new Date();
  const dateStr = `${DAYS_FR[now.getDay()]} ${now.getDate()} ${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
  const firstName = user?.fullName?.split(" ")[0] || "Moniteur";

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f7f8fc" }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* ── Hero ── */}
      <View style={[s.heroCard, { paddingTop: insets.top + 20 }]}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroGreeting}>Bonjour {firstName} 👋</Text>
            <Text style={s.heroDate}>{dateStr}</Text>
          </View>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>{getInitials(user?.fullName)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{totalStudents}</Text>
            <Text style={s.statLabel}>Candidats</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{totalSessions}</Text>
            <Text style={s.statLabel}>Séances</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: "#4ade80" }]}>
              {completedSessions}
            </Text>
            <Text style={s.statLabel}>Complétées</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: "#fde68a" }]}>
              {pendingSessions}
            </Text>
            <Text style={s.statLabel}>En attente</Text>
          </View>
        </View>
      </View>

      {/* ── Séances du jour ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="calendar" size={18} color="#3b82f6" />
            </View>
            <Text style={s.sectionTitle}>Séances de jour</Text>
            {todaySessions.length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{todaySessions.length}</Text>
              </View>
            )}
          </View>
          {todaySessions.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/(instructor)/today" as any)}
            >
              <Text style={s.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          )}
        </View>

        {todaySessions.length > 0 ? (
          <TouchableOpacity
            style={s.todayCard}
            onPress={() => router.push("/(instructor)/today" as any)}
            activeOpacity={0.85}
          >
            {/* Indicateurs colorés */}
            <View style={s.todayIndicators}>
              {confirmedToday > 0 && (
                <View style={s.indicatorItem}>
                  <View
                    style={[s.indicatorDot, { backgroundColor: "#3b82f6" }]}
                  />
                  <Text style={s.indicatorText}>
                    {confirmedToday} confirmée{confirmedToday > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              {pendingToday > 0 && (
                <View style={s.indicatorItem}>
                  <View
                    style={[s.indicatorDot, { backgroundColor: "#f59e0b" }]}
                  />
                  <Text style={s.indicatorText}>{pendingToday} en attente</Text>
                </View>
              )}
              {inProgressToday > 0 && (
                <View style={s.indicatorItem}>
                  <View
                    style={[s.indicatorDot, { backgroundColor: "#8b5cf6" }]}
                  />
                  <Text style={s.indicatorText}>
                    {inProgressToday} en cours
                  </Text>
                </View>
              )}
            </View>

            {/* Aperçu avatars candidats */}
            <View style={s.todayAvatarsRow}>
              {todaySessions.slice(0, 4).map((session, idx) => (
                <View
                  key={session.id}
                  style={[
                    s.todayAvatar,
                    {
                      backgroundColor: STATUS_COLOR[session.status],
                      marginLeft: idx > 0 ? -10 : 0,
                      zIndex: 10 - idx,
                    },
                  ]}
                >
                  <Text style={s.todayAvatarText}>
                    {getInitials(session.student?.fullName)}
                  </Text>
                </View>
              ))}
              {todaySessions.length > 4 && (
                <View
                  style={[
                    s.todayAvatar,
                    s.todayAvatarMore,
                    { marginLeft: -10 },
                  ]}
                >
                  <Text style={s.todayAvatarMoreText}>
                    +{todaySessions.length - 4}
                  </Text>
                </View>
              )}
              <View style={s.todaySeeBtn}>
                <Text style={s.todaySeeBtnText}>Voir les séances</Text>
                <Ionicons name="arrow-forward" size={14} color="#3b82f6" />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="sunny-outline" size={28} color="#f59e0b" />
            </View>
            <Text style={s.emptyTitle}>Aucune séance de jour</Text>
            <Text style={s.emptyText}>Profitez de votre journée !</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push("/(instructor)/calendar" as any)}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnText}>Planifier une séance</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Invitations ── */}
      {invitations.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionIconWrap, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="people-outline" size={18} color="#d97706" />
              </View>
              <Text style={s.sectionTitle}>Invitations en attente</Text>
              <View style={[s.countBadge, { backgroundColor: "#fef3c7" }]}>
                <Text style={[s.countBadgeText, { color: "#d97706" }]}>
                  {invitations.length}
                </Text>
              </View>
            </View>
          </View>

          {invitations.map((inv) => (
            <View key={inv.id} style={s.invitCard}>
              <View style={s.invitTop}>
                <View style={s.invitAvatar}>
                  <Text style={s.invitAvatarText}>
                    {getInitials(inv.sender?.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.invitName}>{inv.sender?.fullName}</Text>
                  <Text style={s.invitPhone}>{inv.sender?.phone}</Text>
                </View>
                <Text style={s.invitDate}>
                  {new Date(inv.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
              {inv.message && <Text style={s.invitMessage}>{inv.message}</Text>}
              <View style={s.invitActions}>
                <TouchableOpacity
                  style={[
                    s.refuseBtn,
                    actionLoading === inv.id && { opacity: 0.6 },
                  ]}
                  onPress={() => handleRefuse(inv.id)}
                  disabled={!!actionLoading}
                >
                  <Ionicons name="close" size={16} color="#e53e3e" />
                  <Text style={s.refuseBtnText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.acceptBtn,
                    actionLoading === inv.id && { opacity: 0.6 },
                  ]}
                  onPress={() => handleAccept(inv.id)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === inv.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={s.acceptBtnText}>Accepter</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Accès rapides ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionIconWrap, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="flash-outline" size={18} color="#38a169" />
            </View>
            <Text style={s.sectionTitle}>Accès rapides</Text>
          </View>
        </View>
        <View style={s.quickLinksRow}>
          {[
            {
              label: "Calendrier",
              icon: "calendar-outline",
              color: "#eff6ff",
              iconColor: "#3b82f6",
              route: "/(instructor)/calendar",
            },
            {
              label: "Candidats",
              icon: "people-outline",
              color: "#f0fdf4",
              iconColor: "#38a169",
              route: "/(instructor)/students",
            },
            {
              label: "Notifs",
              icon: "notifications-outline",
              color: "#fef3c7",
              iconColor: "#d97706",
              route: "/(instructor)/notifications",
            },
            {
              label: "Profil",
              icon: "person-outline",
              color: "#f5f3ff",
              iconColor: "#8b5cf6",
              route: "/(instructor)/profile",
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={s.quickLink}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[s.quickLinkIcon, { backgroundColor: item.color }]}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={item.iconColor}
                />
              </View>
              <Text style={s.quickLinkText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  heroDate: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textTransform: "capitalize",
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1a202c" },
  countBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: "#3b82f6" },
  seeAllText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  todayCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    gap: 14,
  },
  todayIndicators: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  indicatorItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  indicatorDot: { width: 8, height: 8, borderRadius: 4 },
  indicatorText: { fontSize: 13, fontWeight: "600", color: "#4a5568" },
  todayAvatarsRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  todayAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  todayAvatarText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  todayAvatarMore: { backgroundColor: "#e2e8f0" },
  todayAvatarMoreText: { fontSize: 11, fontWeight: "700", color: "#718096" },
  todaySeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto" as any,
  },
  todaySeeBtnText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1a202c" },
  emptyText: { fontSize: 13, color: "#a0aec0" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  invitCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fef3c7",
    elevation: 1,
    gap: 10,
  },
  invitTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  invitAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  invitAvatarText: { fontSize: 15, fontWeight: "700", color: "#d97706" },
  invitName: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  invitPhone: { fontSize: 12, color: "#a0aec0", marginTop: 2 },
  invitDate: { fontSize: 11, color: "#a0aec0" },
  invitMessage: {
    fontSize: 13,
    color: "#4a5568",
    fontStyle: "italic",
    backgroundColor: "#fffbeb",
    padding: 10,
    borderRadius: 10,
  },
  invitActions: { flexDirection: "row", gap: 10 },
  refuseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff5f5",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  refuseBtnText: { fontSize: 13, fontWeight: "600", color: "#e53e3e" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3b82f6",
    paddingVertical: 11,
    borderRadius: 12,
  },
  acceptBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  quickLinksRow: { flexDirection: "row", gap: 12 },
  quickLink: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLinkText: { fontSize: 12, fontWeight: "600", color: "#4a5568" },
});
