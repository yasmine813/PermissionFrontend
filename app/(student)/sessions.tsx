import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sessionsApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  PENDING_VALIDATION: "À valider",
  COMPLETED: "Complétée",
  REFUSED: "Refusée",
  CANCELLED: "Annulée",
};

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function getWeekDays(baseDate: Date) {
  const days = [];
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const CELL_HEIGHT = Math.floor((SCREEN_HEIGHT - 320) / 3);

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, []),
  );

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionsApi.getStudentSessions(accessToken!);
      setSessions(res.data.data.sessions);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les séances");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    Alert.alert("Confirmer", "Voulez-vous confirmer cette séance ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        onPress: async () => {
          setActionLoading(id);
          try {
            await sessionsApi.confirm(id, accessToken!);
            setShowDetailModal(false);
            Alert.alert("✅", "Séance confirmée !");
            loadSessions();
          } catch (err: any) {
            Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleRefuse = async (id: string) => {
    Alert.alert("Refuser", "Voulez-vous refuser cette séance ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Refuser",
        style: "destructive",
        onPress: async () => {
          setActionLoading(id);
          try {
            await sessionsApi.refuse(id, accessToken!);
            setShowDetailModal(false);
            loadSessions();
          } catch (err: any) {
            Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission refusée", "Autorisez l'accès à la caméra");
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);
    try {
      await sessionsApi.scanQr(data, accessToken!);
      Alert.alert("✅", "Présence confirmée !");
      loadSessions();
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "QR invalide");
    }
  };

  const handleValidate = async (id: string) => {
    Alert.alert("Valider", "Confirmez-vous la fin de cette séance ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Valider",
        onPress: async () => {
          setActionLoading(id);
          try {
            const res = await sessionsApi.validate(id, accessToken!);
            setShowDetailModal(false);
            Alert.alert(
              "✅",
              res.data.data?.completed
                ? "Séance complétée ! 🎉"
                : "En attente du moniteur.",
            );
            loadSessions();
          } catch (err: any) {
            Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const sessionsByDate: Record<string, any[]> = {};
  sessions
    .filter((s) => !["REFUSED", "CANCELLED"].includes(s.status))
    .forEach((s) => {
      const date = s.scheduledAt.split("T")[0];
      if (!sessionsByDate[date]) sessionsByDate[date] = [];
      sessionsByDate[date].push(s);
    });

  const weekDays = getWeekDays(currentWeek);
  const completedCount = sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const totalCount = sessions.filter((s) => s.status !== "CANCELLED").length;
  const pendingCount = sessions.filter(
    (s) => s.status === "PENDING_STUDENT",
  ).length;

  const upcomingSessions = sessions
    .filter((s) =>
      [
        "PENDING_STUDENT",
        "CONFIRMED",
        "IN_PROGRESS",
        "PENDING_VALIDATION",
      ].includes(s.status),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  const pastSessions = sessions
    .filter((s) => ["COMPLETED", "REFUSED", "CANCELLED"].includes(s.status))
    .sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={s.headerTitle}>Mes séances</Text>
          <Text style={s.headerSub}>
            {completedCount}/{totalCount} complétées
          </Text>
        </View>
        <View style={s.headerRight}>
          {pendingCount > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingBadgeText}>{pendingCount} en attente</Text>
            </View>
          )}
          {/* Toggle */}
          <View style={s.viewToggle}>
            <TouchableOpacity
              style={[
                s.toggleBtn,
                viewMode === "calendar" && s.toggleBtnActive,
              ]}
              onPress={() => setViewMode("calendar")}
            >
              <Ionicons
                name="calendar-outline"
                size={17}
                color={viewMode === "calendar" ? "#fff" : "#718096"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, viewMode === "list" && s.toggleBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons
                name="list-outline"
                size={17}
                color={viewMode === "list" ? "#fff" : "#718096"}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.scanBtn} onPress={handleOpenScanner}>
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress */}
      {totalCount > 0 && (
        <View style={s.progressWrap}>
          <View style={s.progressBar}>
            <View
              style={[
                s.progressFill,
                { width: `${(completedCount / totalCount) * 100}%` as any },
              ]}
            />
          </View>
          <Text style={s.progressPct}>
            {Math.round((completedCount / totalCount) * 100)}%
          </Text>
        </View>
      )}

      {/* ── Vue Calendrier semaine ── */}
      {viewMode === "calendar" && (
        <>
          {/* Navigation semaine */}
          <View style={s.weekNav}>
            <TouchableOpacity
              style={s.weekNavBtn}
              onPress={() => {
                const d = new Date(currentWeek);
                d.setDate(d.getDate() - 7);
                setCurrentWeek(d);
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#3b82f6" />
            </TouchableOpacity>
            <Text style={s.weekNavTitle}>
              {MONTHS_FR[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
            </Text>
            <TouchableOpacity
              style={s.weekNavBtn}
              onPress={() => {
                const d = new Date(currentWeek);
                d.setDate(d.getDate() + 7);
                setCurrentWeek(d);
              }}
            >
              <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          {/* Header jours */}
          <View style={s.daysHeader}>
            {weekDays.map((day, idx) => {
              const isToday = toDateStr(day) === toDateStr(new Date());
              return (
                <View key={idx} style={s.dayHeaderCell}>
                  <Text style={s.dayHeaderLabel}>{DAYS_FR[day.getDay()]}</Text>
                  <View
                    style={[s.dayHeaderNum, isToday && s.dayHeaderNumToday]}
                  >
                    <Text
                      style={[
                        s.dayHeaderNumText,
                        isToday && s.dayHeaderNumTextToday,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Grille */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.grid}>
              {weekDays.map((day, idx) => {
                const dateStr = toDateStr(day);
                const daySessions = sessionsByDate[dateStr] || [];
                const isToday = dateStr === toDateStr(new Date());
                return (
                  <View
                    key={idx}
                    style={[
                      s.gridCell,
                      {
                        height: Math.max(
                          CELL_HEIGHT,
                          daySessions.length * 72 + 20,
                        ),
                      },
                      isToday && s.gridCellToday,
                    ]}
                  >
                    {daySessions.map((session: any, sidx: number) => {
                      const color = STATUS_COLOR[session.status] || "#3b82f6";
                      const time = new Date(
                        session.scheduledAt,
                      ).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const initials =
                        session.instructor?.user?.fullName
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "??";
                      return (
                        <TouchableOpacity
                          key={sidx}
                          style={[s.sessionPill, { backgroundColor: color }]}
                          onPress={() => {
                            setSelectedSession(session);
                            setShowDetailModal(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={s.pillAvatar}>
                            <Text style={s.pillAvatarText}>{initials}</Text>
                          </View>
                          <Text style={s.pillTime}>{time}</Text>
                          <Text style={s.pillStatus} numberOfLines={1}>
                            {STATUS_LABEL[session.status]}
                          </Text>
                          {session.status === "PENDING_STUDENT" && (
                            <View style={s.pillDot} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            {/* Légende */}
            <View style={[s.legend, { paddingBottom: insets.bottom + 80 }]}>
              {[
                ["PENDING_STUDENT", "En attente"],
                ["CONFIRMED", "Confirmée"],
                ["IN_PROGRESS", "En cours"],
                ["COMPLETED", "Complétée"],
              ].map(([key, label]) => (
                <View key={key} style={s.legendItem}>
                  <View
                    style={[
                      s.legendDot,
                      { backgroundColor: STATUS_COLOR[key] },
                    ]}
                  />
                  <Text style={s.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* ── Vue Liste ── */}
      {viewMode === "list" && (
        <>
          <View style={s.tabsRow}>
            <TouchableOpacity
              style={[s.tab, activeTab === "upcoming" && s.tabActive]}
              onPress={() => setActiveTab("upcoming")}
            >
              <Text
                style={[s.tabText, activeTab === "upcoming" && s.tabTextActive]}
              >
                À venir ({upcomingSessions.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeTab === "past" && s.tabActive]}
              onPress={() => setActiveTab("past")}
            >
              <Text
                style={[s.tabText, activeTab === "past" && s.tabTextActive]}
              >
                Passées ({pastSessions.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              paddingBottom: insets.bottom + 80,
            }}
          >
            {activeTab === "upcoming" &&
              (upcomingSessions.length > 0 ? (
                upcomingSessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      s.listCard,
                      { borderLeftColor: STATUS_COLOR[session.status] },
                    ]}
                    onPress={() => {
                      setSelectedSession(session);
                      setShowDetailModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={s.listCardTop}>
                      <View
                        style={[
                          s.listAvatar,
                          {
                            backgroundColor:
                              STATUS_COLOR[session.status] + "25",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.listAvatarText,
                            { color: STATUS_COLOR[session.status] },
                          ]}
                        >
                          {session.instructor?.user?.fullName
                            ?.split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "??"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.listInstructor}>
                          {session.instructor?.user?.fullName}
                        </Text>
                        <Text style={s.listDate}>
                          {new Date(session.scheduledAt).toLocaleDateString(
                            "fr-FR",
                            { weekday: "long", day: "numeric", month: "long" },
                          )}
                          {" · "}
                          {new Date(session.scheduledAt).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.listBadge,
                          {
                            backgroundColor:
                              STATUS_COLOR[session.status] + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.listBadgeText,
                            { color: STATUS_COLOR[session.status] },
                          ]}
                        >
                          {STATUS_LABEL[session.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.listTap}>Appuyer pour les actions →</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={s.emptyCard}>
                  <Ionicons name="calendar-outline" size={40} color="#cbd5e0" />
                  <Text style={s.emptyTitle}>Aucune séance à venir</Text>
                  <Text style={s.emptyText}>
                    Votre moniteur vous proposera des séances
                  </Text>
                </View>
              ))}
            {activeTab === "past" &&
              (pastSessions.length > 0 ? (
                pastSessions.map((session) => (
                  <View
                    key={session.id}
                    style={[
                      s.listCard,
                      {
                        borderLeftColor: STATUS_COLOR[session.status],
                        opacity: 0.75,
                      },
                    ]}
                  >
                    <View style={s.listCardTop}>
                      <View
                        style={[
                          s.listAvatar,
                          {
                            backgroundColor:
                              STATUS_COLOR[session.status] + "25",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.listAvatarText,
                            { color: STATUS_COLOR[session.status] },
                          ]}
                        >
                          {session.instructor?.user?.fullName
                            ?.split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "??"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.listInstructor}>
                          {session.instructor?.user?.fullName}
                        </Text>
                        <Text style={s.listDate}>
                          {new Date(session.scheduledAt).toLocaleDateString(
                            "fr-FR",
                            { weekday: "long", day: "numeric", month: "long" },
                          )}
                          {" · "}
                          {new Date(session.scheduledAt).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.listBadge,
                          {
                            backgroundColor:
                              STATUS_COLOR[session.status] + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.listBadgeText,
                            { color: STATUS_COLOR[session.status] },
                          ]}
                        >
                          {STATUS_LABEL[session.status]}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={s.emptyCard}>
                  <Ionicons name="time-outline" size={40} color="#cbd5e0" />
                  <Text style={s.emptyTitle}>Aucune séance passée</Text>
                </View>
              ))}
          </ScrollView>
        </>
      )}

      {/* ── Modal détail séance ── */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <TouchableOpacity
          style={m.overlay}
          activeOpacity={1}
          onPress={() => setShowDetailModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={m.modal}>
            {selectedSession &&
              (() => {
                const color = STATUS_COLOR[selectedSession.status] || "#3b82f6";
                const time = new Date(
                  selectedSession.scheduledAt,
                ).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const date = new Date(
                  selectedSession.scheduledAt,
                ).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                const initials =
                  selectedSession.instructor?.user?.fullName
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "??";
                const isLoading = actionLoading === selectedSession.id;

                return (
                  <>
                    <View style={[m.modalHeader, { backgroundColor: color }]}>
                      <TouchableOpacity
                        style={m.closeBtn}
                        onPress={() => setShowDetailModal(false)}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                      <View style={m.modalAvatar}>
                        <Text style={m.modalAvatarText}>{initials}</Text>
                      </View>
                      <Text style={m.modalInstructor}>
                        {selectedSession.instructor?.user?.fullName}
                      </Text>
                      <View style={m.modalStatusBadge}>
                        <Text style={m.modalStatusText}>
                          {STATUS_LABEL[selectedSession.status]}
                        </Text>
                      </View>
                    </View>

                    <View style={m.modalBody}>
                      <View style={m.infoRow}>
                        <View
                          style={[m.infoIcon, { backgroundColor: "#eff6ff" }]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color="#3b82f6"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={m.infoLabel}>Date</Text>
                          <Text style={m.infoValue}>{date}</Text>
                        </View>
                      </View>
                      <View style={m.infoRow}>
                        <View
                          style={[m.infoIcon, { backgroundColor: "#fffbeb" }]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color="#f59e0b"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={m.infoLabel}>Heure · Durée</Text>
                          <Text style={m.infoValue}>
                            {time} · {selectedSession.durationMinutes} min
                          </Text>
                        </View>
                      </View>
                      {selectedSession.notes && (
                        <View style={m.infoRow}>
                          <View
                            style={[m.infoIcon, { backgroundColor: "#f0fdf4" }]}
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={18}
                              color="#38a169"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={m.infoLabel}>Note</Text>
                            <Text style={m.infoValue}>
                              {selectedSession.notes}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={m.actions}>
                        {selectedSession.status === "PENDING_STUDENT" && (
                          <>
                            <TouchableOpacity
                              style={[
                                m.refuseBtn,
                                isLoading && { opacity: 0.6 },
                              ]}
                              onPress={() => handleRefuse(selectedSession.id)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#e53e3e"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="close-circle-outline"
                                    size={18}
                                    color="#e53e3e"
                                  />
                                  <Text style={m.refuseBtnText}>Refuser</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                m.confirmBtn,
                                isLoading && { opacity: 0.6 },
                              ]}
                              onPress={() => handleConfirm(selectedSession.id)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={18}
                                    color="#fff"
                                  />
                                  <Text style={m.confirmBtnText}>
                                    Confirmer
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                        {selectedSession.status === "CONFIRMED" && (
                          <TouchableOpacity
                            style={m.scanActionBtn}
                            onPress={() => {
                              setShowDetailModal(false);
                              handleOpenScanner();
                            }}
                          >
                            <Ionicons
                              name="qr-code-outline"
                              size={18}
                              color="#fff"
                            />
                            <Text style={m.scanActionBtnText}>
                              Scanner le QR Code
                            </Text>
                          </TouchableOpacity>
                        )}
                        {["IN_PROGRESS", "PENDING_VALIDATION"].includes(
                          selectedSession.status,
                        ) && (
                          <TouchableOpacity
                            style={[
                              m.validateBtn,
                              isLoading && { opacity: 0.6 },
                            ]}
                            onPress={() => handleValidate(selectedSession.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={18}
                                  color="#fff"
                                />
                                <Text style={m.validateBtnText}>
                                  Valider la fin
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        {selectedSession.status === "COMPLETED" && (
                          <View style={m.completedBadge}>
                            <Ionicons
                              name="trophy-outline"
                              size={20}
                              color="#38a169"
                            />
                            <Text style={m.completedText}>
                              Séance complétée ✅
                            </Text>
                          </View>
                        )}
                        {selectedSession?.status === "COMPLETED_UNVERIFIED" && (
  <TouchableOpacity
    style={m.disputeBtn}
    onPress={() => {
      setShowDetailModal(false);
      Alert.alert(
        "Contester la seance",
        "Voulez-vous contester cette seance ? (vous avez 24h)",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Contester",
            style: "destructive",
            onPress: async () => {
              try {
                await sessionsApi.disputeSession(
                  selectedSession.id,
                  "Je n ai pas effectue cette seance",
                  accessToken!
                );
                Alert.alert("Seance contestee", "Votre contestation a ete envoyee au moniteur.");
                loadSessions();
              } catch (err: any) {
                Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
              }
            },
          },
        ]
      );
    }}
  >
    <Ionicons name="alert-circle-outline" size={18} color="#fff" />
    <Text style={m.disputeBtnText}>Contester cette seance</Text>
  </TouchableOpacity>
)}

{selectedSession?.status === "DISPUTED" && (
  <View style={m.disputedBadge}>
    <Ionicons name="alert-circle" size={18} color="#e53e3e" />
    <Text style={m.disputedBadgeText}>Seance contestee - En cours de traitement</Text>
  </View>
)}

{selectedSession?.status === "COMPLETED_UNVERIFIED" && (
  <View style={m.unverifiedInfo}>
    <Ionicons name="information-circle-outline" size={16} color="#f97316" />
    <Text style={m.unverifiedInfoText}>
      Seance validee sans QR Code. Vous pouvez contester dans 24h.
    </Text>
  </View>
)}
                      </View>
                    </View>
                  </>
                );
              })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Scanner QR */}
      <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleScan}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={s.scanOverlay}>
            <View style={[s.scanHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={s.scanCloseBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={s.scanTitle}>Scanner le QR Code</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={s.scanFrame}>
              <View style={[s.scanCorner, s.scanCornerTL]} />
              <View style={[s.scanCorner, s.scanCornerTR]} />
              <View style={[s.scanCorner, s.scanCornerBL]} />
              <View style={[s.scanCorner, s.scanCornerBR]} />
            </View>
            <Text style={s.scanHint}>
              Pointez vers le QR Code de votre moniteur
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1a202c" },
  headerSub: { fontSize: 13, color: "#718096", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: "700", color: "#d97706" },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#f5f6fa",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: { padding: 7, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: "#3b82f6" },
  scanBtn: { backgroundColor: "#8b5cf6", padding: 10, borderRadius: 12 },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
  },
  progressFill: { height: 6, backgroundColor: "#38a169", borderRadius: 3 },
  progressPct: { fontSize: 12, fontWeight: "700", color: "#38a169", width: 36 },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  weekNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  weekNavTitle: { fontSize: 15, fontWeight: "700", color: "#1a202c" },
  daysHeader: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dayHeaderCell: {
    width: SCREEN_WIDTH / 7,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#a0aec0",
    marginBottom: 4,
  },
  dayHeaderNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderNumToday: { backgroundColor: "#3b82f6" },
  dayHeaderNumText: { fontSize: 13, fontWeight: "700", color: "#1a202c" },
  dayHeaderNumTextToday: { color: "#fff" },
  grid: { flexDirection: "row" },
  gridCell: {
    width: SCREEN_WIDTH / 7,
    borderRightWidth: 0.5,
    borderColor: "#f0f0f0",
    padding: 3,
    gap: 4,
  },
  gridCellToday: { backgroundColor: "#f8faff" },
  sessionPill: { borderRadius: 8, padding: 5, gap: 2 },
  pillAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillAvatarText: { fontSize: 7, fontWeight: "bold", color: "#fff" },
  pillTime: { fontSize: 8, color: "#fff", fontWeight: "700" },
  pillStatus: { fontSize: 7, color: "rgba(255,255,255,0.85)" },
  pillDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#718096" },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#a0aec0" },
  tabTextActive: { color: "#3b82f6" },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderLeftWidth: 4,
    elevation: 1,
    gap: 6,
  },
  listCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  listAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  listAvatarText: { fontSize: 14, fontWeight: "bold" },
  listInstructor: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  listDate: {
    fontSize: 12,
    color: "#718096",
    marginTop: 2,
    textTransform: "capitalize",
  },
  listBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  listBadgeText: { fontSize: 11, fontWeight: "700" },
  listTap: { fontSize: 11, color: "#a0aec0", fontStyle: "italic" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#4a5568" },
  emptyText: { fontSize: 13, color: "#a0aec0", textAlign: "center" },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingBottom: 60,
  },
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  scanCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  scanFrame: {
    width: 250,
    height: 250,
    alignSelf: "center",
    position: "relative",
  },
  scanCorner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#fff",
    borderWidth: 3,
  },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    elevation: 20,
  },
  modalHeader: {
    padding: 24,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  modalInstructor: { fontSize: 17, fontWeight: "800", color: "#fff" },
  modalStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  modalStatusText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  modalBody: { padding: 20, gap: 4 },
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
    textTransform: "capitalize",
  },
  actions: { marginTop: 16, gap: 10 },
  refuseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff5f5",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  refuseBtnText: { fontSize: 14, fontWeight: "700", color: "#e53e3e" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingVertical: 13,
    borderRadius: 14,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  scanActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8b5cf6",
    paddingVertical: 13,
    borderRadius: 14,
  },
  scanActionBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  validateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#38a169",
    paddingVertical: 13,
    borderRadius: 14,
  },
  validateBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d1fae5",
    paddingVertical: 13,
    borderRadius: 14,
  },
  completedText: { fontSize: 14, fontWeight: "700", color: "#065f46" },
  disputeBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#e53e3e", paddingVertical: 13, borderRadius: 14 },
disputeBtnText:   { fontSize: 14, fontWeight: "700", color: "#fff" },
disputedBadge:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fee2e2", padding: 13, borderRadius: 14 },
disputedBadgeText:{ fontSize: 13, fontWeight: "600", color: "#dc2626" },
unverifiedInfo:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff7ed", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa" },
unverifiedInfoText:{ flex: 1, fontSize: 12, color: "#f97316" },
});
