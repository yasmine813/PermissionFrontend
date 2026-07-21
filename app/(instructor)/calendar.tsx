import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { instructorApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

LocaleConfig.locales["fr"] = {
  monthNames: [
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
  ],
  monthNamesShort: [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Août",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ],
  dayNames: [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ],
  dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

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

const CALENDAR_HEADER_HEIGHT = 96;

function getInitials(fullName?: string) {
  if (!fullName) return "??";
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();

  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [showDayModal, setShowDayModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");

  const [gridAreaHeight, setGridAreaHeight] = useState(0);
  const dayCellHeight =
    gridAreaHeight > 0
      ? Math.floor((gridAreaHeight - CALENDAR_HEADER_HEIGHT) / 6)
      : 60;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/sessions/instructor`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json()),
        instructorApi.getStudents({}, accessToken!),
      ]);
      setSessions(sessionsRes.data?.sessions || []);
      setStudents(
        studentsRes.data.data.students.filter(
          (s: any) => s.studentRelation?.isActive,
        ),
      );
    } catch {
      Alert.alert("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
  Alert.alert(
    "Supprimer",
    "Voulez-vous supprimer définitivement cette séance ?",
    [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/sessions/${sessionId}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            setShowDayModal(false);
            loadData();
          } catch (err: any) {
            Alert.alert("Erreur", err.message);
          }
        },
      },
    ]
  );
};

  const sessionsByDate: Record<string, any[]> = {};
  sessions
    .filter((s) => !["REFUSED", "CANCELLED"].includes(s.status))
    .forEach((session) => {
      const date = session.scheduledAt.split("T")[0];
      if (!sessionsByDate[date]) sessionsByDate[date] = [];
      sessionsByDate[date].push(session);
    });

  const markedDates: any = {};
  Object.keys(sessionsByDate).forEach((date) => {
    markedDates[date] = { marked: true };
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
    };
  }

  const daySession = sessions.filter(
    (s) => s.scheduledAt.split("T")[0] === selectedDate,
  );

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setShowDayModal(true);
  };

  const openCreate = (date?: string) => {
    if (date) setSelectedDate(date);
    setShowDayModal(false);
    setShowCreateModal(true);
  };

  const goToSessionDetail = (sessionId: string) => {
    setShowDayModal(false);
    router.push(`/(instructor)/session/${sessionId}` as any);
  };

  const handleCreate = async () => {
    if (!selectedStudent) {
      Alert.alert("Erreur", "Choisissez un candidat");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Erreur", "Choisissez une date");
      return;
    }
    setCreating(true);
    try {
      const scheduledAt = new Date(
        `${selectedDate}T${scheduledTime}:00`,
      ).toISOString();
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          scheduledAt,
          durationMinutes: parseInt(duration),
          notes,
          sessionNumber:
            sessions.filter((s) => s.studentId === selectedStudent.id).length +
            1,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      Alert.alert("✅", "Séance créée !");
      setShowCreateModal(false);
      setSelectedStudent(null);
      setScheduledTime("10:00");
      setDuration("60");
      setNotes("");
      loadData();
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de créer la séance");
    } finally {
      setCreating(false);
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
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.headerTitle}>Calendrier</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => openCreate()}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Nouvelle séance</Text>
        </TouchableOpacity>
      </View>

      {/* Zone mesurée : Calendrier + Légende */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setGridAreaHeight(e.nativeEvent.layout.height)}
      >
        <Calendar
          key={dayCellHeight}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          hideExtraDays={true}
          enableSwipeMonths={true}
          style={{ height: CALENDAR_HEADER_HEIGHT + dayCellHeight * 6 }}
          dayComponent={({ date, state }: any) => {
            const dateStr = date?.dateString || "";
            const daySessions = sessionsByDate[dateStr] || [];
            const isSelected = dateStr === selectedDate;
            const isToday = state === "today";
            const isDisabled = state === "disabled";
            const visibleAvatars = daySessions.slice(0, 3);
            const extraCount = daySessions.length - visibleAvatars.length;

            return (
              <TouchableOpacity
                style={[
                  s.dayCell,
                  { height: dayCellHeight },
                  isSelected && s.dayCellSelected,
                ]}
                onPress={() =>
                  !isDisabled && handleDayPress({ dateString: dateStr })
                }
                activeOpacity={0.8}
                disabled={isDisabled}
              >
                <View style={[s.dayNumberWrap, isToday && s.dayNumberToday]}>
                  <Text
                    style={[
                      s.dayText,
                      isToday && s.dayTextToday,
                      isDisabled && s.dayTextDisabled,
                    ]}
                  >
                    {date?.day}
                  </Text>
                </View>

                {daySessions.length > 0 && (
                  <View style={s.avatarStack}>
                    {visibleAvatars.map((session: any, idx: number) => {
                      const color = STATUS_COLOR[session.status] || "#3b82f6";
                      return (
                        <View
                          key={session.id ?? idx}
                          style={[
                            s.miniAvatar,
                            {
                              backgroundColor: color,
                              marginLeft: idx > 0 ? -7 : 0,
                              zIndex: visibleAvatars.length - idx,
                            },
                          ]}
                        >
                          <Text style={s.miniAvatarText}>
                            {getInitials(session.student?.fullName)}
                          </Text>
                        </View>
                      );
                    })}
                    {extraCount > 0 && (
                      <View
                        style={[
                          s.miniAvatar,
                          s.miniAvatarMore,
                          { marginLeft: -7, zIndex: 0 },
                        ]}
                      >
                        <Text style={s.miniAvatarMoreText}>+{extraCount}</Text>
                      </View>
                    )}
                  </View>
                )}

                {daySessions.length > 0 && (
                  <Text style={s.countText} numberOfLines={1}>
                    {daySessions.length} séance
                    {daySessions.length > 1 ? "s" : ""}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          theme={{
            backgroundColor: "#fff",
            calendarBackground: "#fff",
            textSectionTitleColor: "#a0aec0",
            todayTextColor: "#3b82f6",
            dayTextColor: "#1a202c",
            textDisabledColor: "#e2e8f0",
            arrowColor: "#3b82f6",
            monthTextColor: "#1a202c",
            textMonthFontSize: 18,
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "600",
            textDayHeaderFontSize: 11,
          }}
        />

        <View
          style={[
            s.legend,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
          ]}
        >
          {[
            ["PENDING_STUDENT", "En attente"],
            ["CONFIRMED", "Confirmée"],
            ["IN_PROGRESS", "En cours"],
            ["PENDING_VALIDATION", "À valider"],
            ["COMPLETED", "Complétée"],
            ["REFUSED", "Refusée"],
            ["CANCELLED", "Annulée"],
          ].map(([key, label]) => (
            <View key={key} style={s.legendItem}>
              <View
                style={[s.legendDot, { backgroundColor: STATUS_COLOR[key] }]}
              />
              <Text style={s.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Modal Jour : liste simple cliquable → détail ── */}
      <Modal
        visible={showDayModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowDayModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDayModal(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>
                      {selectedDate
                        ? new Date(
                            selectedDate + "T12:00:00",
                          ).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })
                        : ""}
                    </Text>
                    <Text style={s.modalSubtitle}>
                      {daySession.length} séance
                      {daySession.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDayModal(false)}
                    style={s.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#718096" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 380 }}
                >
                  {daySession.length > 0 ? (
                    daySession
                      .slice()
                      .sort((a, b) =>
                        a.scheduledAt.localeCompare(b.scheduledAt),
                      )
                      .map((session) => (
                        <CandidateRow
                          key={session.id}
                          session={session}
                          onPress={() => goToSessionDetail(session.id)}
                        />
                      ))
                  ) : (
                    <View style={s.emptyDay}>
                      <Ionicons
                        name="calendar-outline"
                        size={36}
                        color="#e2e8f0"
                      />
                      <Text style={s.emptyDayText}>Aucune séance ce jour</Text>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={s.addDayBtn}
                  onPress={() => openCreate(selectedDate)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.addDayBtnText}>Ajouter une séance</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal Créer ── */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[s.modalCard, { maxHeight: "88%" }]}>
                <View style={s.createHeader}>
                  <View style={s.createIconWrap}>
                    <Ionicons name="calendar" size={20} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>Nouvelle séance</Text>
                    <Text style={s.modalSubtitle}>
                      {selectedDate
                        ? new Date(
                            selectedDate + "T12:00:00",
                          ).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "Choisissez une date"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCreateModal(false)}
                    style={s.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#718096" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={s.fieldLabel}>Candidat</Text>
                  <TouchableOpacity
                    style={s.selectField}
                    onPress={() => setShowStudentPicker(true)}
                  >
                    {selectedStudent ? (
                      <View style={s.selectedStudent}>
                        <View style={s.sAvatar}>
                          <Text style={s.sAvatarText}>
                            {getInitials(selectedStudent.fullName)}
                          </Text>
                        </View>
                        <View>
                          <Text style={s.sName}>
                            {selectedStudent.fullName}
                          </Text>
                          <Text style={s.sPhone}>{selectedStudent.phone}</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={s.selectPlaceholder}>
                        Sélectionner un candidat
                      </Text>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#a0aec0"
                    />
                  </TouchableOpacity>

                  <Text style={s.fieldLabel}>Date</Text>
                  <View style={s.inputField}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#3b82f6"
                    />
                    <TextInput
                      style={s.fieldInput}
                      value={selectedDate}
                      onChangeText={setSelectedDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#a0aec0"
                    />
                  </View>

                  <Text style={s.fieldLabel}>Heure de début</Text>
                  <View style={s.inputField}>
                    <Ionicons name="time-outline" size={16} color="#3b82f6" />
                    <TextInput
                      style={s.fieldInput}
                      value={scheduledTime}
                      onChangeText={setScheduledTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#a0aec0"
                    />
                  </View>

                  <Text style={s.fieldLabel}>Durée</Text>
                  <View style={s.durationRow}>
                    {[
                      ["30", "30 min"],
                      ["45", "45 min"],
                      ["60", "1h"],
                      ["90", "1h30"],
                      ["120", "2h"],
                    ].map(([val, label]) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          s.durationBtn,
                          duration === val && s.durationBtnActive,
                        ]}
                        onPress={() => setDuration(val)}
                      >
                        <Text
                          style={[
                            s.durationBtnText,
                            duration === val && s.durationBtnTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.fieldLabel}>Notes (optionnel)</Text>
                  <TextInput
                    style={s.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Ex: Prise en main, créneau parking..."
                    placeholderTextColor="#a0aec0"
                    multiline
                    numberOfLines={3}
                  />
                </ScrollView>

                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={s.cancelModalBtn}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={s.cancelModalBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, creating && { opacity: 0.6 }]}
                    onPress={handleCreate}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={s.saveBtnText}>Enregistrer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal Picker Candidat ── */}
      <Modal
        visible={showStudentPicker}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowStudentPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowStudentPicker(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Choisir un candidat</Text>
                  <TouchableOpacity
                    onPress={() => setShowStudentPicker(false)}
                    style={s.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#718096" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <TouchableOpacity
                        key={student.id}
                        style={s.pickerItem}
                        onPress={() => {
                          setSelectedStudent(student);
                          setShowStudentPicker(false);
                        }}
                      >
                        <View
                          style={[
                            s.sAvatar,
                            selectedStudent?.id === student.id && {
                              backgroundColor: "#38a169",
                            },
                          ]}
                        >
                          <Text style={s.sAvatarText}>
                            {getInitials(student.fullName)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sName}>{student.fullName}</Text>
                          <Text style={s.sPhone}>{student.phone}</Text>
                        </View>
                        {selectedStudent?.id === student.id && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#38a169"
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={s.emptyDay}>
                      <Text style={s.emptyDayText}>Aucun candidat lié</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

/**
 * Ligne simple dans le modal jour : avatar + nom + heure + statut.
 * Un tap redirige directement vers la page de détail de la séance.
 */
function CandidateRow({ session, onPress }: any) {
  const color = STATUS_COLOR[session.status] || "#3b82f6";
  const time = new Date(session.scheduledAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      style={s.candidateRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.candidateAvatar, { backgroundColor: color }]}>
        <Text style={s.candidateAvatarText}>
          {getInitials(session.student?.fullName)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.candidateName} numberOfLines={1}>
          {session.student?.fullName}
        </Text>
        <Text style={s.candidateTime}>
          {time} · {session.durationMinutes} min
        </Text>
      </View>
      <View style={[s.statusBadge, { backgroundColor: color + "20" }]}>
        <Text style={[s.statusText, { color }]}>
          {STATUS_LABEL[session.status]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e0" />
    </TouchableOpacity>
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  dayCell: {
    width: SCREEN_WIDTH / 7,
    alignItems: "center",
    paddingTop: 4,
    paddingHorizontal: 1,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  dayCellSelected: { backgroundColor: "#eff6ff" },
  dayNumberWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  dayNumberToday: { backgroundColor: "#3b82f6" },
  dayText: { fontSize: 12, fontWeight: "600", color: "#1a202c" },
  dayTextToday: { color: "#fff" },
  dayTextDisabled: { color: "#e2e8f0" },

  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  miniAvatar: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  miniAvatarText: { fontSize: 6.5, fontWeight: "bold", color: "#fff" },
  miniAvatarMore: { backgroundColor: "#e2e8f0" },
  miniAvatarMoreText: { fontSize: 6.5, fontWeight: "bold", color: "#718096" },
  countText: {
    fontSize: 8,
    color: "#a0aec0",
    marginTop: 2,
    fontWeight: "600",
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#718096" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1a202c" },
  modalSubtitle: {
    fontSize: 13,
    color: "#a0aec0",
    marginTop: 3,
    textTransform: "capitalize",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
  },
  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  createIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#718096",
    marginTop: 14,
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f8fc",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectPlaceholder: { fontSize: 14, color: "#a0aec0" },
  selectedStudent: { flexDirection: "row", alignItems: "center", gap: 10 },
  sAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sAvatarText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  sName: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  sPhone: { fontSize: 11, color: "#a0aec0", marginTop: 1 },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f7f8fc",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: { flex: 1, fontSize: 14, color: "#1a202c" },
  durationRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  durationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f7f8fc",
  },
  durationBtnActive: { backgroundColor: "#3b82f6" },
  durationBtnText: { fontSize: 12, fontWeight: "600", color: "#718096" },
  durationBtnTextActive: { color: "#fff" },
  notesInput: {
    backgroundColor: "#f7f8fc",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a202c",
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
  },
  cancelModalBtnText: { fontSize: 14, fontWeight: "600", color: "#718096" },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
  },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  emptyDay: { alignItems: "center", padding: 28, gap: 10 },
  emptyDayText: { fontSize: 13, color: "#a0aec0" },
  addDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    padding: 13,
    marginTop: 12,
  },
  addDayBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f7f8fc",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  candidateAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  candidateAvatarText: { fontSize: 13, fontWeight: "bold", color: "#fff" },
  candidateName: { fontSize: 13, fontWeight: "700", color: "#1a202c" },
  candidateTime: { fontSize: 11, color: "#a0aec0", marginTop: 1 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  statusText: { fontSize: 10, fontWeight: "700" },

  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f6fa",
  },
});
