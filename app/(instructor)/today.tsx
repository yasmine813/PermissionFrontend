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
import { useAuthStore } from "../../src/store/authStore";

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

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "jun",
  "jul",
  "aoû",
  "sep",
  "oct",
  "nov",
  "déc",
];
const MONTHS_FULL = [
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

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
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

// Génère les 7 jours autour d'une date
function getWeekAround(center: Date) {
  const days = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, []),
  );

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/sessions/instructor`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await res.json();
      setAllSessions(data.data?.sessions || []);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les séances");
    } finally {
      setLoading(false);
    }
  };

  const weekDays = getWeekAround(selectedDate);
  const dateStr = toDateStr(selectedDate);
  const todayStr = toDateStr(new Date());

  const daySessions = allSessions
    .filter((s) => s.scheduledAt.split("T")[0] === dateStr)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // Sessions par date pour les indicateurs
  const sessionsByDate: Record<string, number> = {};
  allSessions
    .filter((s) => !["REFUSED", "CANCELLED"].includes(s.status))
    .forEach((s) => {
      const d = s.scheduledAt.split("T")[0];
      sessionsByDate[d] = (sessionsByDate[d] || 0) + 1;
    });

  const isToday = dateStr === todayStr;
  const displayStr = `${DAYS_FR[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_FULL[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

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
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a202c" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Séances</Text>
          <Text style={s.headerSub}>{displayStr}</Text>
        </View>
        <TouchableOpacity
          style={s.todayBtn}
          onPress={() => setSelectedDate(new Date())}
        >
          <Text style={s.headerSub}>{displayStr}</Text>
        </TouchableOpacity>
      </View>

      {/* Sélecteur de date — scroll horizontal 7 jours */}
      <View style={s.dateSelector}>
        <TouchableOpacity
          style={s.arrowBtn}
          onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 7);
            setSelectedDate(d);
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#3b82f6" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.daysRow}
        >
          {weekDays.map((day, idx) => {
            const dStr = toDateStr(day);
            const isSelected = dStr === dateStr;
            const isT = dStr === todayStr;
            const hasSession = !!sessionsByDate[dStr];

            return (
              <TouchableOpacity
                key={idx}
                style={[s.dayBtn, isSelected && s.dayBtnSelected]}
                onPress={() => setSelectedDate(new Date(day))}
              >
                <Text style={[s.dayLabel, isSelected && s.dayLabelSelected]}>
                  {DAYS_FR[day.getDay()]}
                </Text>
                <View
                  style={[
                    s.dayNum,
                    isSelected && s.dayNumSelected,
                    isT && !isSelected && s.dayNumToday,
                  ]}
                >
                  <Text
                    style={[
                      s.dayNumText,
                      isSelected && s.dayNumTextSelected,
                      isT && !isSelected && { color: "#3b82f6" },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
                {hasSession && (
                  <View
                    style={[
                      s.dayDot,
                      isSelected && { backgroundColor: "#fff" },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={s.arrowBtn}
          onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 7);
            setSelectedDate(d);
          }}
        >
          <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Compteur */}
      <View style={s.countRow}>
        <Text style={s.countText}>
          {daySessions.length === 0
            ? "Aucune séance"
            : `${daySessions.length} séance${daySessions.length > 1 ? "s" : ""}`}
        </Text>
        {daySessions.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{daySessions.length}</Text>
          </View>
        )}
      </View>

      {daySessions.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="sunny-outline" size={40} color="#f59e0b" />
          </View>
          <Text style={s.emptyTitle}>
            {isToday ? "Aucune séance aujourd'hui" : "Aucune séance ce jour"}
          </Text>
          <Text style={s.emptyText}>
            {isToday
              ? "Profitez de votre journée !"
              : "Pas de séance planifiée pour cette date."}
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push("/(instructor)/calendar" as any)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.emptyBtnText}>Planifier une séance</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: insets.bottom + 80,
          }}
        >
          {daySessions.map((session, idx) => {
            const color = STATUS_COLOR[session.status] || "#3b82f6";
            const time = new Date(session.scheduledAt).toLocaleTimeString(
              "fr-FR",
              { hour: "2-digit", minute: "2-digit" },
            );
            const initials = getInitials(session.student?.fullName);

            return (
              <TouchableOpacity
                key={session.id}
                style={s.card}
                onPress={() =>
                  router.push(`/(instructor)/session/${session.id}` as any)
                }
                activeOpacity={0.85}
              >
                {/* Index */}
                <View style={s.cardIndex}>
                  <Text style={s.cardIndexText}>
                    {String(idx + 1).padStart(2, "0")}
                  </Text>
                </View>

                {/* Barre colorée */}
                <View style={[s.cardBar, { backgroundColor: color }]} />

                {/* Contenu */}
                <View style={s.cardContent}>
                  {/* Heure + statut */}
                  <View style={s.cardTopRow}>
                    <View style={s.timeWrap}>
                      <Ionicons name="time-outline" size={14} color="#718096" />
                      <Text style={s.timeText}>{time}</Text>
                      <Text style={s.durationText}>
                        · {session.durationMinutes} min
                      </Text>
                    </View>
                    <View
                      style={[s.statusBadge, { backgroundColor: color + "20" }]}
                    >
                      <Text style={[s.statusText, { color }]}>
                        {STATUS_LABEL[session.status]}
                      </Text>
                    </View>
                  </View>

                  {/* Candidat */}
                  <View style={s.candidatRow}>
                    <View style={[s.avatar, { backgroundColor: color }]}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.candidatName}>
                        {session.student?.fullName}
                      </Text>
                      <Text style={s.candidatPhone}>
                        {session.student?.phone}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#cbd5e0"
                    />
                  </View>

                  {/* Notes */}
                  {session.notes && (
                    <View style={s.notesWrap}>
                      <Ionicons
                        name="document-text-outline"
                        size={13}
                        color="#a0aec0"
                      />
                      <Text style={s.notesText} numberOfLines={1}>
                        {session.notes}
                      </Text>
                    </View>
                  )}

                  {/* Hint */}
                  <View style={[s.hintRow, { backgroundColor: color + "10" }]}>
                    <Ionicons
                      name={
                        session.status === "CONFIRMED"
                          ? "qr-code-outline"
                          : session.status === "IN_PROGRESS"
                            ? "checkmark-circle-outline"
                            : session.status === "PENDING_VALIDATION"
                              ? "hourglass-outline"
                              : session.status === "PENDING_STUDENT"
                                ? "time-outline"
                                : "information-circle-outline"
                      }
                      size={14}
                      color={color}
                    />
                    <Text style={[s.hintText, { color }]}>
                      {session.status === "CONFIRMED"
                        ? "Appuyer pour générer le QR Code"
                        : session.status === "IN_PROGRESS"
                          ? "Séance en cours — valider à la fin"
                          : session.status === "PENDING_VALIDATION"
                            ? "En attente de validation"
                            : session.status === "PENDING_STUDENT"
                              ? "En attente de confirmation du candidat"
                              : "Voir les détails"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1a202c" },
  headerSub: {
    fontSize: 12,
    color: "#a0aec0",
    marginTop: 1,
    textTransform: "capitalize",
  },
  todayBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  todayBtnText: { fontSize: 12, fontWeight: "700", color: "#3b82f6" },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  daysRow: { gap: 4, paddingHorizontal: 4 },
  dayBtn: {
    width: 44,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  dayBtnSelected: { backgroundColor: "#3b82f6" },
  dayLabel: { fontSize: 10, fontWeight: "600", color: "#a0aec0" },
  dayLabelSelected: { color: "rgba(255,255,255,0.8)" },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  dayNumToday: { borderWidth: 1.5, borderColor: "#3b82f6", borderRadius: 14 },
  dayNumText: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  dayNumTextSelected: { color: "#fff" },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#3b82f6" },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  countBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: "#3b82f6" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1a202c" },
  emptyText: {
    fontSize: 14,
    color: "#a0aec0",
    textAlign: "center",
    paddingHorizontal: 40,
  },
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
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardIndex: {
    width: 36,
    backgroundColor: "#f7f8fc",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIndexText: { fontSize: 13, fontWeight: "800", color: "#cbd5e0" },
  cardBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 10 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  timeText: { fontSize: 15, fontWeight: "800", color: "#1a202c" },
  durationText: { fontSize: 12, color: "#a0aec0" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },
  candidatRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  candidatName: { fontSize: 15, fontWeight: "700", color: "#1a202c" },
  candidatPhone: { fontSize: 12, color: "#a0aec0", marginTop: 2 },
  notesWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  notesText: { fontSize: 12, color: "#718096", fontStyle: "italic", flex: 1 },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 10,
  },
  hintText: { fontSize: 12, fontWeight: "600", flex: 1 },
});
