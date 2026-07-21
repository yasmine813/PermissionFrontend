import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  notificationsApi,
  sessionsApi,
} from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const TYPE_ICON: Record<string, string> = {
  NEW_SESSION: "calendar-outline",
  SESSION_CONFIRMED: "checkmark-circle-outline",
  SESSION_REFUSED: "close-circle-outline",
  SESSION_STARTED: "car-outline",
  SESSION_CANCELLED: "ban-outline",
  SESSION_COMPLETED: "trophy-outline",
  GENERAL: "notifications-outline",
};

const TYPE_COLOR: Record<string, string> = {
  NEW_SESSION: "#3b82f6",
  SESSION_CONFIRMED: "#38a169",
  SESSION_REFUSED: "#e53e3e",
  SESSION_STARTED: "#8b5cf6",
  SESSION_CANCELLED: "#a0aec0",
  SESSION_COMPLETED: "#38a169",
  GENERAL: "#718096",
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuthStore();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "invitations">(
    "notifications",
  );
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionAction, setSessionAction] = useState<string | null>(null);

  // Permit modal states
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [pendingInvitId, setPendingInvitId] = useState<string | null>(null);
  const [instructorData, setInstructorData] = useState<any>(null);
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [selectedPayMode, setSelectedPayMode] = useState<
    "PER_SESSION" | "FORFAIT" | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, invitRes] = await Promise.all([
        notificationsApi.getAll(accessToken!),
        invitationsApi.getAll(accessToken!),
      ]);
      setNotifications(notifRes.data.data.notifications);
      setInvitations([
        ...invitRes.data.data.received,
        ...invitRes.data.data.sent,
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id, accessToken!);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead(accessToken!);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleNotifPress = async (notif: any) => {
    await handleMarkRead(notif.id);
    if (notif.data?.sessionId && notif.type === "NEW_SESSION") {
      setSessionDetail(null);
      setSessionLoading(true);
      setShowSessionModal(true);
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/sessions/${notif.data.sessionId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const data = await res.json();
        if (data.success) setSessionDetail(data.data.session);
      } catch {
      } finally {
        setSessionLoading(false);
      }
    }
  };

  const handleSessionAccept = async () => {
    if (!sessionDetail) return;
    setSessionAction("accepting");
    try {
      await sessionsApi.confirm(sessionDetail.id, accessToken!);
      setShowSessionModal(false);
      Alert.alert("Seance confirmee", "La seance a ete confirmee !", [
        {
          text: "Voir mes seances",
          onPress: () => router.push("/(student)/sessions" as any),
        },
        { text: "OK" },
      ]);
      loadData();
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
    } finally {
      setSessionAction(null);
    }
  };

  const handleSessionRefuse = async () => {
    if (!sessionDetail) return;
    Alert.alert("Refuser", "Voulez-vous refuser cette seance ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Refuser",
        style: "destructive",
        onPress: async () => {
          setSessionAction("refusing");
          try {
            await sessionsApi.refuse(sessionDetail.id, accessToken!);
            setShowSessionModal(false);
            Alert.alert("Seance refusee", "La seance a ete refusee.");
            loadData();
          } catch (err: any) {
            Alert.alert("Erreur", err?.response?.data?.message || "Erreur");
          } finally {
            setSessionAction(null);
          }
        },
      },
    ]);
  };

  // Ouvre le modal permis avant d'accepter
  const handleAccept = async (id: string) => {
    const inv = invitations.find((i) => i.id === id);
    if (inv?.sender) {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/instructors/${inv.sender.id || inv.senderId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const data = await res.json();
        if (data.success) setInstructorData(data.data.instructor);
      } catch {}
    }
    setPendingInvitId(id);
    setSelectedPermit(null);
    setSelectedPayMode(null);
    setShowPermitModal(true);
  };

  const handleConfirmAccept = async () => {
    if (!pendingInvitId || !selectedPermit) {
      Alert.alert("Erreur", "Veuillez choisir un type de permis ");
      return;
    }
    setActionLoading(pendingInvitId);
    try {
      await invitationsApi.accept(pendingInvitId, accessToken!);

      const price =
        selectedPermit === "B"
          ? instructorData?.prixPermisB
          : selectedPermit === "A"
            ? instructorData?.prixPermisA
            : selectedPermit === "C"
              ? instructorData?.prixPermisC
              : instructorData?.prixPermisD;

      await financeApi.updatePermit(
        user!.id,
        {
          permitType: selectedPermit,
          paymentMode: selectedPayMode,
          pricePerSession: selectedPayMode === "PER_SESSION" ? price : null,
          totalForfeit: selectedPayMode === "FORFAIT" ? price * 30 : null,
        },
        accessToken!,
      );

      setShowPermitModal(false);
      Alert.alert(
        "Invitation acceptee",
        "Vous etes maintenant lie a votre moniteur !",
      );
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

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingInvites = invitations.filter(
    (i) => i.status === "PENDING" && i.sender,
  ).length;

  // Permis disponibles selon le moniteur
  const availablePermits = [
    {
      type: "B",
      label: "Permis B",
      icon: "car-outline",
      price: instructorData?.prixPermisB,
    },
    {
      type: "A",
      label: "Permis A",
      icon: "bicycle-outline",
      price: instructorData?.prixPermisA,
    },
    {
      type: "C",
      label: "Permis C",
      icon: "bus-outline",
      price: instructorData?.prixPermisC,
    },
    {
      type: "D",
      label: "Permis D",
      icon: "train-outline",
      price: instructorData?.prixPermisD,
    },
  ].filter((p) => p.price);

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
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={s.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === "notifications" && s.tabActive]}
          onPress={() => setActiveTab("notifications")}
        >
          <Text
            style={[
              s.tabText,
              activeTab === "notifications" && s.tabTextActive,
            ]}
          >
            Seances {unreadCount > 0 ? `(${unreadCount})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === "invitations" && s.tabActive]}
          onPress={() => setActiveTab("invitations")}
        >
          <Text
            style={[s.tabText, activeTab === "invitations" && s.tabTextActive]}
          >
            Invitations {pendingInvites > 0 ? `(${pendingInvites})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 80,
          gap: 10,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            colors={["#3b82f6"]}
          />
        }
      >
        {/* ── Tab Notifications ── */}
        {activeTab === "notifications" &&
          (notifications.length > 0 ? (
            notifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                style={[s.notifCard, !notif.read && s.notifCardUnread]}
                onPress={() => handleNotifPress(notif)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    s.notifIcon,
                    {
                      backgroundColor:
                        (TYPE_COLOR[notif.type] || "#718096") + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      (TYPE_ICON[notif.type] || "notifications-outline") as any
                    }
                    size={22}
                    color={TYPE_COLOR[notif.type] || "#718096"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.notifTitle, !notif.read && { fontWeight: "800" }]}
                  >
                    {notif.title}
                  </Text>
                  <Text style={s.notifBody} numberOfLines={2}>
                    {notif.body}
                  </Text>
                  <Text style={s.notifDate}>
                    {new Date(notif.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {!notif.read && <View style={s.unreadDot} />}
                  {notif.type === "NEW_SESSION" && notif.data?.sessionId && (
                    <View style={s.tapBadge}>
                      <Text style={s.tapBadgeText}>Appuyer</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={s.emptyCard}>
              <Ionicons
                name="notifications-outline"
                size={40}
                color="#cbd5e0"
              />
              <Text style={s.emptyText}>Aucune notification</Text>
            </View>
          ))}

        {/* ── Tab Invitations ── */}
        {activeTab === "invitations" &&
          (invitations.length > 0 ? (
            invitations.map((inv) => (
              <View key={inv.id} style={s.invitCard}>
                <View style={s.invitTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {(inv.sender || inv.receiver)?.fullName
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.invitName}>
                      {(inv.sender || inv.receiver)?.fullName}
                    </Text>
                    <Text style={s.invitDate}>
                      {new Date(inv.createdAt).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.statusBadge,
                      {
                        backgroundColor:
                          inv.status === "PENDING"
                            ? "#fef3c7"
                            : inv.status === "ACCEPTED"
                              ? "#d1fae5"
                              : "#fee2e2",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.statusText,
                        {
                          color:
                            inv.status === "PENDING"
                              ? "#d97706"
                              : inv.status === "ACCEPTED"
                                ? "#065f46"
                                : "#dc2626",
                        },
                      ]}
                    >
                      {inv.status === "PENDING"
                        ? "En attente"
                        : inv.status === "ACCEPTED"
                          ? "Acceptee"
                          : "Refusee"}
                    </Text>
                  </View>
                </View>
                {inv.status === "PENDING" && inv.sender && (
                  <View style={s.invitActions}>
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
                        <>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={s.acceptBtnText}>Accepter</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.refuseBtn}
                      onPress={() => handleRefuse(inv.id)}
                    >
                      <Ionicons name="close" size={16} color="#e53e3e" />
                      <Text style={s.refuseBtnText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="mail-outline" size={40} color="#cbd5e0" />
              <Text style={s.emptyText}>Aucune invitation</Text>
            </View>
          ))}
      </ScrollView>

      {/* ── Modal detail seance ── */}
      <Modal
        visible={showSessionModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowSessionModal(false)}
      >
        <TouchableOpacity
          style={sn.overlay}
          activeOpacity={1}
          onPress={() => setShowSessionModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={sn.modal}>
            <View style={sn.modalHeader}>
              <TouchableOpacity
                style={sn.closeBtn}
                onPress={() => setShowSessionModal(false)}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={sn.modalIconWrap}>
                <Ionicons name="car-sport-outline" size={36} color="#fff" />
              </View>
              <Text style={sn.modalHeaderTitle}>Nouvelle seance proposee</Text>
              <Text style={sn.modalHeaderSub}>
                Votre moniteur vous a planifie une seance
              </Text>
            </View>

            {sessionLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : sessionDetail ? (
              <View style={sn.modalBody}>
                <View style={sn.infoRow}>
                  <View
                    style={[sn.infoIconWrap, { backgroundColor: "#eff6ff" }]}
                  >
                    <Ionicons name="person-outline" size={18} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sn.infoLabel}>Moniteur</Text>
                    <Text style={sn.infoValue}>
                      {sessionDetail.instructor?.user?.fullName}
                    </Text>
                  </View>
                </View>
                <View style={sn.infoRow}>
                  <View
                    style={[sn.infoIconWrap, { backgroundColor: "#f5f3ff" }]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#8b5cf6"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sn.infoLabel}>Date</Text>
                    <Text style={sn.infoValue}>
                      {new Date(sessionDetail.scheduledAt).toLocaleDateString(
                        "fr-FR",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </Text>
                  </View>
                </View>
                <View style={sn.infoRow}>
                  <View
                    style={[sn.infoIconWrap, { backgroundColor: "#fffbeb" }]}
                  >
                    <Ionicons name="time-outline" size={18} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sn.infoLabel}>Heure - Duree</Text>
                    <Text style={sn.infoValue}>
                      {new Date(sessionDetail.scheduledAt).toLocaleTimeString(
                        "fr-FR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                      {" - "}
                      {sessionDetail.durationMinutes} min
                    </Text>
                  </View>
                </View>
                {sessionDetail.notes && (
                  <View style={sn.infoRow}>
                    <View
                      style={[sn.infoIconWrap, { backgroundColor: "#f0fdf4" }]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color="#38a169"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sn.infoLabel}>Note du moniteur</Text>
                      <Text style={sn.infoValue}>{sessionDetail.notes}</Text>
                    </View>
                  </View>
                )}
                {sessionDetail.status === "PENDING_STUDENT" ? (
                  <View style={sn.actions}>
                    <TouchableOpacity
                      style={[
                        sn.refuseBtn,
                        sessionAction === "refusing" && { opacity: 0.6 },
                      ]}
                      onPress={handleSessionRefuse}
                      disabled={!!sessionAction}
                    >
                      {sessionAction === "refusing" ? (
                        <ActivityIndicator size="small" color="#e53e3e" />
                      ) : (
                        <>
                          <Ionicons
                            name="close-circle-outline"
                            size={20}
                            color="#e53e3e"
                          />
                          <Text style={sn.refuseBtnText}>Refuser</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        sn.acceptBtn,
                        sessionAction === "accepting" && { opacity: 0.6 },
                      ]}
                      onPress={handleSessionAccept}
                      disabled={!!sessionAction}
                    >
                      {sessionAction === "accepting" ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={sn.acceptBtnText}>Accepter</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={[
                      sn.alreadyTreated,
                      {
                        backgroundColor:
                          sessionDetail.status === "CONFIRMED"
                            ? "#d1fae5"
                            : sessionDetail.status === "REFUSED"
                              ? "#fee2e2"
                              : "#f3f4f6",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        sn.alreadyTreatedText,
                        {
                          color:
                            sessionDetail.status === "CONFIRMED"
                              ? "#065f46"
                              : sessionDetail.status === "REFUSED"
                                ? "#dc2626"
                                : "#6b7280",
                        },
                      ]}
                    >
                      {sessionDetail.status === "CONFIRMED"
                        ? "Seance deja confirmee"
                        : sessionDetail.status === "REFUSED"
                          ? "Seance deja refusee"
                          : "Seance traitee"}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ padding: 30, alignItems: "center" }}>
                <Text style={{ color: "#a0aec0" }}>
                  Impossible de charger la seance
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal choix permis ── */}
      <Modal
        visible={showPermitModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowPermitModal(false)}
      >
        <TouchableOpacity
          style={pm.overlay}
          activeOpacity={1}
          onPress={() => setShowPermitModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={pm.modal}>
            {/* Header */}
            <View style={pm.header}>
              <View style={pm.headerIcon}>
                <Ionicons name="car-sport-outline" size={28} color="#3b82f6" />
              </View>
              <Text style={pm.title}>Choisissez votre permis</Text>
              <Text style={pm.subtitle}>Selectionnez le type de permis</Text>
            </View>

            {/* Types de permis */}
            <Text style={pm.sectionLabel}>Type de permis</Text>
            {availablePermits.length === 0 ? (
              <View style={pm.noPermitWrap}>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color="#f59e0b"
                />
                <Text style={pm.noPermitText}>
                  Ce moniteur n a pas encore configure ses tarifs
                </Text>
              </View>
            ) : (
              <View style={pm.permitsRow}>
                {availablePermits.map((permit) => (
                  <TouchableOpacity
                    key={permit.type}
                    style={[
                      pm.permitBtn,
                      selectedPermit === permit.type && pm.permitBtnActive,
                    ]}
                    onPress={() => setSelectedPermit(permit.type)}
                  >
                    <Ionicons
                      name={permit.icon as any}
                      size={22}
                      color={
                        selectedPermit === permit.type ? "#fff" : "#3b82f6"
                      }
                    />
                    <Text
                      style={[
                        pm.permitBtnLabel,
                        selectedPermit === permit.type && { color: "#fff" },
                      ]}
                    >
                      {permit.label}
                    </Text>
                    <Text
                      style={[
                        pm.permitBtnPrice,
                        selectedPermit === permit.type && {
                          color: "rgba(255,255,255,0.85)",
                        },
                      ]}
                    >
                      {permit.price} DT/seance
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={pm.actions}>
              <TouchableOpacity
                style={[
                  pm.confirmBtn,
                  (!selectedPermit || !!actionLoading) && { opacity: 0.5 },
                ]}
                onPress={handleConfirmAccept}
                disabled={!selectedPermit || !!actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={pm.confirmBtnText}>Confirmer</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  pm.confirmBtn,
                  (!selectedPermit || !selectedPayMode || !!actionLoading) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleConfirmAccept}
                disabled={
                  !selectedPermit || !selectedPayMode || !!actionLoading
                }
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={pm.confirmBtnText}>Confirmer</Text>
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
  markAllBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  markAllText: { fontSize: 12, fontWeight: "600", color: "#3b82f6" },
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
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
  },
  notifCardUnread: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: 3,
  },
  notifBody: { fontSize: 13, color: "#4a5568", lineHeight: 18 },
  notifDate: { fontSize: 11, color: "#a0aec0", marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  tapBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tapBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  invitCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
    gap: 12,
  },
  invitTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: "#3b82f6" },
  invitName: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  invitDate: { fontSize: 11, color: "#a0aec0", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  invitActions: { flexDirection: "row", gap: 10 },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    padding: 12,
  },
  acceptBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  refuseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff5f5",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  refuseBtnText: { fontSize: 14, fontWeight: "600", color: "#e53e3e" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  emptyText: { fontSize: 13, color: "#a0aec0" },
});

const sn = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 28,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    elevation: 20,
  },
  modalHeader: {
    backgroundColor: "#3b82f6",
    padding: 28,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  modalHeaderSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  modalBody: { padding: 20, gap: 2 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f6fa",
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#a0aec0",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    textTransform: "capitalize",
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  refuseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff5f5",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  refuseBtnText: { fontSize: 15, fontWeight: "700", color: "#e53e3e" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 16,
  },
  acceptBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  alreadyTreated: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  alreadyTreatedText: { fontSize: 14, fontWeight: "600" },
});

const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "flex-end",
    padding: 0,
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
    elevation: 20,
  },
  header: { alignItems: "center", gap: 6 },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#1a202c" },
  subtitle: { fontSize: 13, color: "#a0aec0", textAlign: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  permitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  permitBtn: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  permitBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  permitBtnLabel: { fontSize: 13, fontWeight: "700", color: "#3b82f6" },
  permitBtnPrice: { fontSize: 11, color: "#3b82f6" },
  noPermitWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 12,
  },
  noPermitText: { fontSize: 13, color: "#d97706", flex: 1 },
  payModes: { gap: 10 },
  payModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f7f8fc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  payModeBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  payModeBtnActivePurple: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  payModeLabel: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  payModeDesc: { fontSize: 12, color: "#718096", marginTop: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
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
    backgroundColor: "#3b82f6",
    paddingVertical: 13,
    borderRadius: 14,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
