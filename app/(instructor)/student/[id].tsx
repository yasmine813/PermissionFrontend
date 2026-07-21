import { useAuthStore } from "@/src/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { financeApi } from "../../../src/services/api";

const STATUS_COLOR: Record<string, string> = {
  PENDING_STUDENT:      "#f59e0b",
  CONFIRMED:            "#3b82f6",
  IN_PROGRESS:          "#8b5cf6",
  PENDING_VALIDATION:   "#f97316",
  COMPLETED:            "#38a169",
  COMPLETED_UNVERIFIED: "#f97316",
  DISPUTED:             "#e53e3e",
  REFUSED:              "#e53e3e",
  CANCELLED:            "#a0aec0",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_STUDENT:      "En attente",
  CONFIRMED:            "Confirmee",
  IN_PROGRESS:          "En cours",
  PENDING_VALIDATION:   "A valider",
  COMPLETED:            "Completee",
  COMPLETED_UNVERIFIED: "Non verifiee",
  DISPUTED:             "Contestee",
  REFUSED:              "Refusee",
  CANCELLED:            "Annulee",
};

const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#38a169",
  "#f59e0b",
  "#e53e3e",
  "#06b6d4",
  "#ec4899",
];
const TOTAL_SESSIONS = 30;

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentProfileScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();
  const { id } = useLocalSearchParams();

  const [student, setStudent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "info" | "sessions" | "progress" | "finance"
  >("info");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, financeRes] = await Promise.all([
        fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/sessions/instructor?studentId=${id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ).then((r) => r.json()),
        financeApi.getFinance(id as string, accessToken!).catch(() => null),
      ]);

      const allSessions = sessionsRes.data?.sessions || [];
      setSessions(allSessions);
      if (allSessions.length > 0) setStudent(allSessions[0].student);
      if (financeRes?.data?.data?.finance)
        setFinance(financeRes.data.data.finance);
    } catch {
      Alert.alert("Erreur", "Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Erreur", "Montant invalide");
      return;
    }
    setPayLoading(true);
    try {
      await financeApi.recordPayment(id as string, amount, accessToken!);
      setShowPayModal(false);
      setPayAmount("");
      Alert.alert(
        "Paiement enregistre",
        `${amount} DT enregistres avec succes`,
      );
      loadData();
    } catch {
      Alert.alert("Erreur", "Impossible d enregistrer le paiement");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const color = getColor(student?.fullName || "");
  const initials = getInitials(student?.fullName);

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

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      {/* Header */}
      <View
        style={[
          s.header,
          { paddingTop: insets.top + 10, backgroundColor: color },
        ]}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{initials}</Text>
        </View>
        <Text style={s.headerName}>{student?.fullName || "Candidat"}</Text>
        <View style={s.headerActiveBadge}>
          <View style={s.headerActiveDot} />
          <Text style={s.headerActiveText}>Actif</Text>
        </View>
      </View>

      {/* Stats rapides */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {completedSessions}/{TOTAL_SESSIONS}
          </Text>
          <Text style={s.statLabel}>Seances</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: "#3b82f6" }]}>
            {upcomingSessions.length}
          </Text>
          <Text style={s.statLabel}>A venir</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: color }]}>{progressPct}%</Text>
          <Text style={s.statLabel}>Progression</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text
            style={[
              s.statValue,
              { color: remaining > 0 ? "#e53e3e" : "#38a169", fontSize: 16 },
            ]}
          >
            {amountDue} DT
          </Text>
          <Text style={s.statLabel}>Montant du</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {[
          { key: "info", label: "Infos", icon: "person-outline" },
          { key: "sessions", label: "Seances", icon: "calendar-outline" },
          { key: "progress", label: "Stats", icon: "trending-up-outline" },
          { key: "finance", label: "Finance", icon: "wallet-outline" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? "#3b82f6" : "#a0aec0"}
            />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab Infos ── */}
      {activeTab === "info" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 80,
          }}
        >
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Coordonnees</Text>
            <View style={s.infoRow}>
              <View style={[s.infoIcon, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="person-outline" size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Nom complet</Text>
                <Text style={s.infoValue}>{student?.fullName || "-"}</Text>
              </View>
            </View>
            <View style={s.infoRow}>
              <View style={[s.infoIcon, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="call-outline" size={18} color="#38a169" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Telephone</Text>
                <Text style={s.infoValue}>{student?.phone || "-"}</Text>
              </View>
            </View>
            <View style={s.infoRow}>
              <View style={[s.infoIcon, { backgroundColor: "#fffbeb" }]}>
                <Ionicons name="mail-outline" size={18} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{student?.email || "-"}</Text>
              </View>
            </View>
            {finance?.permitType && (
              <View style={s.infoRow}>
                <View style={[s.infoIcon, { backgroundColor: "#f5f3ff" }]}>
                  <Ionicons name="ribbon-outline" size={18} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>Type de permis</Text>
                  <Text style={s.infoValue}>Permis {finance.permitType}</Text>
                </View>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={s.scheduleBtn}
            onPress={() => router.push("/(instructor)/calendar" as any)}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={s.scheduleBtnText}>Planifier une seance</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Tab Séances ── */}
      {activeTab === "sessions" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: insets.bottom + 80,
          }}
        >
          {sessions.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color="#cbd5e0" />
              <Text style={s.emptyTitle}>Aucune seance</Text>
              <Text style={s.emptyText}>
                Planifiez une seance pour ce candidat
              </Text>
            </View>
          ) : (
            sessions
              .sort(
                (a, b) =>
                  new Date(b.scheduledAt).getTime() -
                  new Date(a.scheduledAt).getTime(),
              )
              .map((session) => {
                const c = STATUS_COLOR[session.status] || "#3b82f6";
                const time = new Date(session.scheduledAt).toLocaleTimeString(
                  "fr-FR",
                  { hour: "2-digit", minute: "2-digit" },
                );
                const date = new Date(session.scheduledAt).toLocaleDateString(
                  "fr-FR",
                  { weekday: "short", day: "numeric", month: "short" },
                );
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[s.sessionCard, { borderLeftColor: c }]}
                    onPress={() =>
                      router.push(`/(instructor)/session/${session.id}` as any)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={s.sessionCardTop}>
                      <View style={[s.sessionDot, { backgroundColor: c }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.sessionDate}>
                          {date} · {time}
                        </Text>
                        <Text style={s.sessionDuration}>
                          {session.durationMinutes} min
                        </Text>
                      </View>
                      <View
                        style={[s.sessionBadge, { backgroundColor: c + "20" }]}
                      >
                        <Text style={[s.sessionBadgeText, { color: c }]}>
                          {STATUS_LABEL[session.status]}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#cbd5e0"
                      />
                    </View>
                    {session.notes && (
                      <Text style={s.sessionNotes} numberOfLines={1}>
                        {session.notes}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
          )}
        </ScrollView>
      )}

      {/* ── Tab Progression ── */}
      {activeTab === "progress" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 80,
          }}
        >
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <Text style={s.progressTitle}>Progression generale</Text>
              <Text style={[s.progressPct, { color }]}>{progressPct}%</Text>
            </View>
            <View style={s.progressBarWrap}>
              <View
                style={[
                  s.progressBarFill,
                  {
                    width: `${Math.min(progressPct, 100)}%` as any,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={s.progressSub}>
              {completedSessions} / {TOTAL_SESSIONS} seances completees
            </Text>
          </View>

          {/* Grille visuelle 30 séances */}
          <View style={s.sessionsGrid}>
            <Text style={s.statsDetailTitle}>
              Suivi des {TOTAL_SESSIONS} seances
            </Text>
            <View style={s.gridDots}>
              {Array.from({ length: TOTAL_SESSIONS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.gridDot,
                    i < completedSessions && { backgroundColor: color },
                  ]}
                />
              ))}
            </View>
            <Text style={s.gridLegend}>
              {completedSessions} completees ·{" "}
              {TOTAL_SESSIONS - completedSessions} restantes
            </Text>
          </View>

          <View style={s.statsDetailCard}>
            <Text style={s.statsDetailTitle}>Statistiques detaillees</Text>
            {[
              {
                label: "Seances completees",
                value: completedSessions,
                color: "#38a169",
                icon: "checkmark-circle-outline",
              },
              {
                label: "Seances confirmees",
                value: sessions.filter((s) => s.status === "CONFIRMED").length,
                color: "#3b82f6",
                icon: "calendar-outline",
              },
              {
                label: "En attente",
                value: sessions.filter((s) => s.status === "PENDING_STUDENT")
                  .length,
                color: "#f59e0b",
                icon: "time-outline",
              },
              {
                label: "Seances refusees",
                value: sessions.filter((s) => s.status === "REFUSED").length,
                color: "#e53e3e",
                icon: "close-circle-outline",
              },
              {
                label: "Seances annulees",
                value: sessions.filter((s) => s.status === "CANCELLED").length,
                color: "#a0aec0",
                icon: "ban-outline",
              },
            ].map((item) => (
              <View key={item.label} style={s.statsDetailRow}>
                <View
                  style={[
                    s.statsDetailIcon,
                    { backgroundColor: item.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={16}
                    color={item.color}
                  />
                </View>
                <Text style={s.statsDetailLabel}>{item.label}</Text>
                <Text style={[s.statsDetailValue, { color: item.color }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Tab Finance ── */}
      {activeTab === "finance" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 80,
          }}
        >
          {!finance?.permitType ? (
            <View style={s.emptyWrap}>
              <View style={f.emptyFinanceIcon}>
                <Ionicons name="wallet-outline" size={36} color="#a0aec0" />
              </View>
              <Text style={s.emptyTitle}>Aucune info financiere</Text>
              <Text style={s.emptyText}>
                Le candidat n a pas encore configure son type de permis
              </Text>
            </View>
          ) : (
            <>
              {/* Permis + prix */}
              <View style={f.permitCard}>
                <View style={f.permitCardLeft}>
                  <View style={f.permitIcon}>
                    <Ionicons name="ribbon-outline" size={22} color="#8b5cf6" />
                  </View>
                  <View>
                    <Text style={f.permitLabel}>Type de permis</Text>
                    <Text style={f.permitValue}>
                      Permis {finance.permitType}
                    </Text>
                  </View>
                </View>
                {finance.pricePerSession && (
                  <View style={f.permitPriceBadge}>
                    <Text style={f.permitPriceText}>
                      {finance.pricePerSession} DT/seance
                    </Text>
                  </View>
                )}
              </View>

              {/* Cards montants */}
              <View style={f.amountsRow}>
                <View style={[f.amountCard, { borderTopColor: "#f59e0b" }]}>
                  <Ionicons name="receipt-outline" size={18} color="#f59e0b" />
                  <Text style={f.amountCardLabel}>Total du</Text>
                  <Text style={[f.amountCardValue, { color: "#f59e0b" }]}>
                    {amountDue} DT
                  </Text>
                  <Text style={f.amountCardSub}>
                    {completedSessions} seances x {finance.pricePerSession} DT
                  </Text>
                </View>
                <View style={[f.amountCard, { borderTopColor: "#38a169" }]}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#38a169"
                  />
                  <Text style={f.amountCardLabel}>Paye</Text>
                  <Text style={[f.amountCardValue, { color: "#38a169" }]}>
                    {amountPaid} DT
                  </Text>
                  <Text style={f.amountCardSub}>Encaisse</Text>
                </View>
                <View
                  style={[
                    f.amountCard,
                    { borderTopColor: remaining > 0 ? "#e53e3e" : "#38a169" },
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
                  <Text style={f.amountCardLabel}>Reste</Text>
                  <Text
                    style={[
                      f.amountCardValue,
                      { color: remaining > 0 ? "#e53e3e" : "#38a169" },
                    ]}
                  >
                    {remaining} DT
                  </Text>
                  <Text style={f.amountCardSub}>
                    {remaining > 0 ? "A regler" : "Solde"}
                  </Text>
                </View>
              </View>

              {/* Barre paiement */}
              {amountDue > 0 && (
                <View style={f.payProgressCard}>
                  <View style={f.payProgressHeader}>
                    <Text style={f.payProgressLabel}>
                      Progression du paiement
                    </Text>
                    <Text style={f.payProgressPct}>
                      {Math.round((amountPaid / amountDue) * 100)}%
                    </Text>
                  </View>
                  <View style={f.payProgressBar}>
                    <View
                      style={[
                        f.payProgressFill,
                        {
                          width:
                            `${Math.min(100, Math.round((amountPaid / amountDue) * 100))}%` as any,
                        },
                      ]}
                    />
                  </View>
                  <Text style={f.payProgressSub}>
                    {amountPaid} DT payes sur {amountDue} DT
                  </Text>
                </View>
              )}

              {remaining > 0 ? (
                <TouchableOpacity
                  style={f.payBtn}
                  onPress={() => setShowPayModal(true)}
                >
                  <Ionicons name="cash-outline" size={20} color="#fff" />
                  <Text style={f.payBtnText}>Enregistrer un paiement</Text>
                </TouchableOpacity>
              ) : amountDue > 0 ? (
                <View style={f.paidBadge}>
                  <Ionicons name="checkmark-circle" size={22} color="#38a169" />
                  <Text style={f.paidBadgeText}>
                    Compte solde - Tout est paye
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Modal paiement ── */}
      <Modal
        visible={showPayModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowPayModal(false)}
      >
        <TouchableOpacity
          style={f.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPayModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={f.modal}>
            <View style={f.modalHeader}>
              <View style={f.modalIcon}>
                <Ionicons name="cash-outline" size={26} color="#38a169" />
              </View>
              <Text style={f.modalTitle}>Enregistrer un paiement</Text>
              <Text style={f.modalSub}>Reste a payer : {remaining} DT</Text>
            </View>

            <View style={f.inputWrap}>
              <TextInput
                style={f.input}
                placeholder="Montant"
                placeholderTextColor="#a0aec0"
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />
              <Text style={f.inputCurrency}>DT</Text>
            </View>

            <View style={f.quickAmounts}>
              {[remaining, Math.round(remaining / 2), 50, 100]
                .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
                .slice(0, 4)
                .map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={f.quickAmountBtn}
                    onPress={() => setPayAmount(String(amt))}
                  >
                    <Text style={f.quickAmountText}>{amt} DT</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={f.modalActions}>
              <TouchableOpacity
                style={f.cancelBtn}
                onPress={() => {
                  setShowPayModal(false);
                  setPayAmount("");
                }}
              >
                <Text style={f.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  f.confirmBtn,
                  (!payAmount || payLoading) && { opacity: 0.5 },
                ]}
                onPress={handleRecordPayment}
                disabled={!payAmount || payLoading}
              >
                {payLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={f.confirmBtnText}>Confirmer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 0,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  headerAvatarText: { fontSize: 26, fontWeight: "bold", color: "#fff" },
  headerName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  headerActiveText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "#f0f0f0", marginVertical: 4 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1a202c" },
  statLabel: { fontSize: 11, color: "#a0aec0", marginTop: 2 },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#a0aec0" },
  tabTextActive: { color: "#3b82f6" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a202c",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f6fa",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#a0aec0",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    marginTop: 2,
  },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    padding: 14,
  },
  scheduleBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#4a5568" },
  emptyText: { fontSize: 13, color: "#a0aec0", textAlign: "center" },
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
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a202c",
    textTransform: "capitalize",
  },
  sessionDuration: { fontSize: 12, color: "#a0aec0", marginTop: 2 },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sessionBadgeText: { fontSize: 10, fontWeight: "700" },
  sessionNotes: { fontSize: 12, color: "#718096", fontStyle: "italic" },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitle: { fontSize: 15, fontWeight: "800", color: "#1a202c" },
  progressPct: { fontSize: 22, fontWeight: "800" },
  progressBarWrap: {
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: { height: 10, borderRadius: 5 },
  progressSub: { fontSize: 13, color: "#718096" },
  sessionsGrid: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  gridDots: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gridDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f0f0f0",
  },
  gridLegend: { fontSize: 12, color: "#718096" },
  statsDetailCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  statsDetailTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a202c",
    marginBottom: 8,
  },
  statsDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f6fa",
  },
  statsDetailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statsDetailLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5568",
  },
  statsDetailValue: { fontSize: 18, fontWeight: "800" },
});

const f = StyleSheet.create({
  emptyFinanceIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
  },
  permitCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  permitCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  permitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  permitLabel: {
    fontSize: 11,
    color: "#a0aec0",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  permitValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a202c",
    marginTop: 2,
  },
  permitPriceBadge: {
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  permitPriceText: { fontSize: 13, fontWeight: "700", color: "#8b5cf6" },
  amountsRow: { flexDirection: "row", gap: 10 },
  amountCard: {
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
  amountCardLabel: { fontSize: 11, color: "#a0aec0", fontWeight: "600" },
  amountCardValue: { fontSize: 18, fontWeight: "800" },
  amountCardSub: { fontSize: 9, color: "#a0aec0", textAlign: "center" },
  payProgressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  payProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payProgressLabel: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  payProgressPct: { fontSize: 18, fontWeight: "800", color: "#38a169" },
  payProgressBar: {
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    overflow: "hidden",
  },
  payProgressFill: { height: 10, backgroundColor: "#38a169", borderRadius: 5 },
  payProgressSub: { fontSize: 12, color: "#718096" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#38a169",
    borderRadius: 16,
    padding: 16,
  },
  payBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d1fae5",
    padding: 14,
    borderRadius: 14,
  },
  paidBadgeText: { fontSize: 14, fontWeight: "700", color: "#065f46" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
    elevation: 20,
  },
  modalHeader: { alignItems: "center", gap: 6 },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1a202c" },
  modalSub: { fontSize: 13, color: "#718096" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#1a202c",
    paddingVertical: 14,
  },
  inputCurrency: { fontSize: 18, fontWeight: "700", color: "#a0aec0" },
  quickAmounts: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickAmountBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickAmountText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#718096" },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#38a169",
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
