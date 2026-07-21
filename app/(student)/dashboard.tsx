import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  financeApi,
  invitationsApi,
  sessionsApi,
} from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const TOTAL_SESSIONS = 30;

const STATUS_COLOR: Record<string, string> = {
  PENDING_STUDENT: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  PENDING_VALIDATION: "#f97316",
  COMPLETED: "#38a169",
  REFUSED: "#e53e3e",
  CANCELLED: "#a0aec0",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_STUDENT: "En attente",
  CONFIRMED: "Confirmee",
  IN_PROGRESS: "En cours",
  PENDING_VALIDATION: "A valider",
  COMPLETED: "Completee",
  REFUSED: "Refusee",
  CANCELLED: "Annulee",
};

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const [myInstructor, setMyInstructor] = useState<any>(null);
  const [receivedInvitations, setReceived] = useState<any[]>([]);
  const [sentInvitations, setSent] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";
  const firstName = user?.fullName?.split(" ")[0] || "Candidat";

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [instructorRes, receivedRes, sentRes, sessionsRes] =
        await Promise.all([
          invitationsApi.getMyInstructor(accessToken!),
          invitationsApi.getReceived(accessToken!),
          invitationsApi.getSent(accessToken!),
          sessionsApi.getStudentSessions(accessToken!),
        ]);
      setMyInstructor(instructorRes.data.data.instructor);
      setReceived(receivedRes.data.data.invitations);
      setSent(sentRes.data.data.invitations);
      setSessions(sessionsRes.data.data.sessions || []);

      // Charger les infos financières si lié à un moniteur
      if (instructorRes.data.data.instructor && user?.id) {
        try {
          const finRes = await financeApi.getFinance(user.id, accessToken!);
          if (finRes?.data?.data?.finance) setFinance(finRes.data.data.finance);
        } catch {}
      }
    } catch {
      Alert.alert("Erreur", "Impossible de charger les donnees");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await invitationsApi.accept(id, accessToken!);
      Alert.alert("Invitation acceptee !");
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

  const handleCancel = async (id: string) => {
    Alert.alert("Annuler", "Voulez-vous annuler cette invitation ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler",
        style: "destructive",
        onPress: async () => {
          setActionLoading(id);
          try {
            await invitationsApi.cancel(id, accessToken!);
            loadData();
          } catch {
            Alert.alert("Erreur", "Impossible d annuler");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  // Stats
  const completedSessions = sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const upcomingSessions = sessions.filter((s) =>
    ["CONFIRMED", "PENDING_STUDENT"].includes(s.status),
  );
  const progressPct = Math.round((completedSessions / TOTAL_SESSIONS) * 100);
  const amountDue = finance?.amountDue || 0;
  const amountPaid = finance?.amountPaid || 0;
  const remaining = Math.max(0, amountDue - amountPaid);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={s.greeting}>Bonjour {firstName} 👋</Text>
          <Text style={s.date}>{today}</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 80,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            colors={["#3b82f6"]}
          />
        }
      >
        {/* ── Section Finance (si lié et données disponibles) ── */}
        {myInstructor && finance?.permitType && (
          <>
            <Text style={s.sectionTitle}>Mon suivi</Text>

            {/* Progression séances */}
            <View style={s.progressCard}>
              <View style={s.progressTop}>
                <View style={s.progressLeft}>
                  <Ionicons name="car-outline" size={20} color="#3b82f6" />
                  <View>
                    <Text style={s.progressLabel}>Progression</Text>
                    <Text style={s.progressSub}>
                      Permis {finance.permitType}
                    </Text>
                  </View>
                </View>
                <Text style={s.progressPct}>{progressPct}%</Text>
              </View>
              <View style={s.progressBar}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${Math.min(progressPct, 100)}%` as any },
                  ]}
                />
              </View>
              <View style={s.progressStats}>
                <Text style={s.progressStatText}>
                  {completedSessions}/{TOTAL_SESSIONS} seances completees
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(student)/sessions" as any)}
                >
                  <Text style={s.progressLink}>Voir mes seances →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cards financières */}
            <View style={s.financeRow}>
              <View style={[s.financeCard, { borderTopColor: "#f59e0b" }]}>
                <View style={[s.financeIcon, { backgroundColor: "#fffbeb" }]}>
                  <Ionicons name="receipt-outline" size={18} color="#f59e0b" />
                </View>
                <Text style={s.financeCardLabel}>Total du</Text>
                <Text style={[s.financeCardValue, { color: "#f59e0b" }]}>
                  {amountDue} DT
                </Text>
                <Text style={s.financeCardSub}>
                  {completedSessions} seances
                </Text>
              </View>

              <View style={[s.financeCard, { borderTopColor: "#38a169" }]}>
                <View style={[s.financeIcon, { backgroundColor: "#f0fdf4" }]}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#38a169"
                  />
                </View>
                <Text style={s.financeCardLabel}>Paye</Text>
                <Text style={[s.financeCardValue, { color: "#38a169" }]}>
                  {amountPaid} DT
                </Text>
                <Text style={s.financeCardSub}>Regle</Text>
              </View>

              <View
                style={[
                  s.financeCard,
                  { borderTopColor: remaining > 0 ? "#e53e3e" : "#38a169" },
                ]}
              >
                <View
                  style={[
                    s.financeIcon,
                    { backgroundColor: remaining > 0 ? "#fff5f5" : "#f0fdf4" },
                  ]}
                >
                  <Ionicons
                    name={
                      remaining > 0
                        ? "alert-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={remaining > 0 ? "#e53e3e" : "#38a169"}
                  />
                </View>
                <Text style={s.financeCardLabel}>Reste</Text>
                <Text
                  style={[
                    s.financeCardValue,
                    { color: remaining > 0 ? "#e53e3e" : "#38a169" },
                  ]}
                >
                  {remaining} DT
                </Text>
                <Text style={s.financeCardSub}>
                  {remaining > 0 ? "A payer" : "Solde"}
                </Text>
              </View>
            </View>

            {/* Alerte si reste à payer */}
            {remaining > 0 && (
              <View style={s.alertCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#f59e0b"
                />
                <Text style={s.alertText}>
                  Vous avez {remaining} DT a regler aupres de votre moniteur
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Prochaines séances ── */}
        {myInstructor && upcomingSessions.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Prochaines seances</Text>
              <TouchableOpacity
                onPress={() => router.push("/(student)/sessions" as any)}
              >
                <Text style={s.seeAllText}>Tout voir →</Text>
              </TouchableOpacity>
            </View>
            {upcomingSessions.slice(0, 2).map((session) => {
              const color = STATUS_COLOR[session.status] || "#3b82f6";
              const time = new Date(session.scheduledAt).toLocaleTimeString(
                "fr-FR",
                { hour: "2-digit", minute: "2-digit" },
              );
              const date = new Date(session.scheduledAt).toLocaleDateString(
                "fr-FR",
                { weekday: "long", day: "numeric", month: "long" },
              );
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[s.sessionCard, { borderLeftColor: color }]}
                  onPress={() => router.push("/(student)/sessions" as any)}
                  activeOpacity={0.8}
                >
                  <View style={s.sessionCardTop}>
                    <View
                      style={[s.sessionStatusDot, { backgroundColor: color }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionDate}>{date}</Text>
                      <Text style={s.sessionTime}>
                        {time} · {session.durationMinutes} min
                      </Text>
                    </View>
                    <View
                      style={[
                        s.sessionBadge,
                        { backgroundColor: color + "20" },
                      ]}
                    >
                      <Text style={[s.sessionBadgeText, { color }]}>
                        {STATUS_LABEL[session.status]}
                      </Text>
                    </View>
                  </View>
                  {session.status === "PENDING_STUDENT" && (
                    <View
                      style={[s.sessionHint, { backgroundColor: color + "10" }]}
                    >
                      <Ionicons name="time-outline" size={13} color={color} />
                      <Text style={[s.sessionHintText, { color }]}>
                        En attente de votre confirmation
                      </Text>
                    </View>
                  )}
                  {session.status === "CONFIRMED" && (
                    <View
                      style={[s.sessionHint, { backgroundColor: color + "10" }]}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={13}
                        color={color}
                      />
                      <Text style={[s.sessionHintText, { color }]}>
                        Preparez-vous a scanner le QR Code
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Mon moniteur ── */}
        <Text style={s.sectionTitle}>Mon moniteur</Text>
        {myInstructor ? (
          <TouchableOpacity
            style={s.instructorCard}
            onPress={() =>
              router.push(`/(student)/instructor/${myInstructor.id}` as any)
            }
          >
            <View style={s.instructorAvatar}>
              <Text style={s.instructorAvatarText}>
                {myInstructor.user?.fullName
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.instructorName}>
                {myInstructor.user?.fullName}
              </Text>
              {myInstructor.nomCommercial && (
                <Text style={s.instructorCommercial}>
                  {myInstructor.nomCommercial}
                </Text>
              )}
              {myInstructor.ville && (
                <View style={s.instructorLocation}>
                  <Ionicons name="location-outline" size={12} color="#718096" />
                  <Text style={s.instructorLocationText}>
                    {myInstructor.ville}, {myInstructor.gouvernorat}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
          </TouchableOpacity>
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="person-outline" size={32} color="#a0aec0" />
            </View>
            <Text style={s.emptyTitle}>Aucun moniteur lie</Text>
            <Text style={s.emptyText}>
              Trouvez et invitez un moniteur pour commencer
            </Text>
            <TouchableOpacity
              style={s.findBtn}
              onPress={() => router.push("/(student)/instructors" as any)}
            >
              <Ionicons name="search-outline" size={16} color="#fff" />
              <Text style={s.findBtnText}>Trouver un moniteur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Invitations reçues ── */}
        {receivedInvitations.length > 0 && (
          <>
            <Text style={s.sectionTitle}>
              Invitations recues ({receivedInvitations.length})
            </Text>
            {receivedInvitations.map((inv) => (
              <View key={inv.id} style={s.invitationCard}>
                <View style={s.invAvatar}>
                  <Text style={s.invAvatarText}>
                    {inv.sender?.fullName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.invName}>{inv.sender?.fullName}</Text>
                  {inv.message && (
                    <Text style={s.invMessage}>{inv.message}</Text>
                  )}
                  <Text style={s.invDate}>
                    {new Date(inv.createdAt).toLocaleDateString("fr")}
                  </Text>
                </View>
                <View style={s.invActions}>
                  <TouchableOpacity
                    style={[
                      s.acceptBtn,
                      actionLoading === inv.id && { opacity: 0.6 },
                    ]}
                    onPress={() => handleAccept(inv.id)}
                    disabled={actionLoading === inv.id}
                  >
                    {actionLoading === inv.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.refuseBtn}
                    onPress={() => handleRefuse(inv.id)}
                    disabled={actionLoading === inv.id}
                  >
                    <Ionicons name="close" size={18} color="#e53e3e" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Invitations envoyées ── */}
        {sentInvitations.length > 0 && (
          <>
            <Text style={s.sectionTitle}>
              Invitations envoyees ({sentInvitations.length})
            </Text>
            {sentInvitations.map((inv) => (
              <View key={inv.id} style={s.invitationCard}>
                <View style={[s.invAvatar, { backgroundColor: "#f5f3ff" }]}>
                  <Text style={[s.invAvatarText, { color: "#7c3aed" }]}>
                    {inv.receiver?.fullName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.invName}>{inv.receiver?.fullName}</Text>
                  <View style={s.pendingBadge}>
                    <View style={s.pendingDot} />
                    <Text style={s.pendingText}>En attente</Text>
                  </View>
                  <Text style={s.invDate}>
                    {new Date(inv.createdAt).toLocaleDateString("fr")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => handleCancel(inv.id)}
                  disabled={actionLoading === inv.id}
                >
                  <Text style={s.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
  greeting: { fontSize: 20, fontWeight: "bold", color: "#1a202c" },
  date: {
    fontSize: 12,
    color: "#718096",
    marginTop: 2,
    textTransform: "capitalize",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1a202c" },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAllText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },

  // Progress
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressLabel: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  progressSub: { fontSize: 12, color: "#718096", marginTop: 2 },
  progressPct: { fontSize: 22, fontWeight: "800", color: "#3b82f6" },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: "#3b82f6", borderRadius: 4 },
  progressStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressStatText: { fontSize: 12, color: "#718096" },
  progressLink: { fontSize: 12, fontWeight: "600", color: "#3b82f6" },

  // Finance
  financeRow: { flexDirection: "row", gap: 10 },
  financeCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderTopWidth: 3,
    elevation: 1,
    alignItems: "center",
    gap: 4,
  },
  financeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  financeCardLabel: { fontSize: 11, color: "#a0aec0", fontWeight: "600" },
  financeCardValue: { fontSize: 18, fontWeight: "800" },
  financeCardSub: { fontSize: 10, color: "#a0aec0" },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fffbeb",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#d97706" },

  // Sessions
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderLeftWidth: 4,
    elevation: 1,
    gap: 8,
  },
  sessionCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  sessionStatusDot: { width: 10, height: 10, borderRadius: 5 },
  sessionDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a202c",
    textTransform: "capitalize",
  },
  sessionTime: { fontSize: 12, color: "#718096", marginTop: 2 },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sessionBadgeText: { fontSize: 10, fontWeight: "700" },
  sessionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  sessionHintText: { fontSize: 12, fontWeight: "500", flex: 1 },

  // Instructor
  instructorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  instructorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  instructorAvatarText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  instructorName: { fontSize: 15, fontWeight: "700", color: "#1a202c" },
  instructorCommercial: { fontSize: 13, color: "#718096", marginTop: 2 },
  instructorLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  instructorLocationText: { fontSize: 12, color: "#718096" },

  // Empty
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#4a5568" },
  emptyText: { fontSize: 13, color: "#a0aec0", textAlign: "center" },
  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  findBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Invitations
  invitationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  invAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  invAvatarText: { fontSize: 15, fontWeight: "700", color: "#3b82f6" },
  invName: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  invMessage: { fontSize: 12, color: "#718096", marginTop: 2 },
  invDate: { fontSize: 11, color: "#a0aec0", marginTop: 4 },
  invActions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  refuseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff5f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  pendingText: { fontSize: 12, color: "#f59e0b", fontWeight: "600" },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  cancelBtnText: { fontSize: 12, fontWeight: "600", color: "#e53e3e" },
});
