import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../../src/store/authStore";

const STATUS_COLOR: Record<string, string> = {
  PENDING_STUDENT: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  PENDING_VALIDATION: "#f97316",
  COMPLETED: "#38a169",
  COMPLETED_UNVERIFIED: "#f97316",
  DISPUTED: "#e53e3e",
  REFUSED: "#e53e3e",
  CANCELLED: "#a0aec0",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_STUDENT: "En attente du candidat",
  CONFIRMED: "Confirmee par le candidat",
  IN_PROGRESS: "En cours",
  PENDING_VALIDATION: "En attente de validation",
  COMPLETED: "Completee",
  COMPLETED_UNVERIFIED: "Completee sans QR",
  DISPUTED: "Contestee",
  REFUSED: "Refusee",
  CANCELLED: "Annulee",
};

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { accessToken } = useAuthStore();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const timerRef = useRef<any>(null);
  const qrCodeRef = useRef<string | null>(null);

  useEffect(() => {
    loadSession();
    const interval = setInterval(() => {
      if (!qrCodeRef.current) loadSession();
    }, 10000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (qrExpiry) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((qrExpiry.getTime() - Date.now()) / 1000),
        );
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(timerRef.current);
          setQrCode(null);
          setQrExpiry(null);
          qrCodeRef.current = null;
          loadSession();
        }
      }, 1000);
    }
  }, [qrExpiry]);

  const loadSession = async () => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/sessions/${id as string}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await res.json();
      if (data.success) setSession(data.data.session);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQr = async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/sessions/${id as string}/qr-generate`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      qrCodeRef.current = data.data.qrCode;
      setQrCode(data.data.qrCode);
      setQrExpiry(new Date(data.data.expiresAt));
      setTimeLeft(15 * 60);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async () => {
    Alert.alert(
      session?.studentValidated ? "Terminer la seance" : "Terminer sans QR",
      session?.studentValidated
        ? "Confirmez-vous la fin de cette seance ?"
        : "Le candidat n a pas scanne le QR Code. La seance sera marquee comme non verifiee et le candidat pourra contester dans 24h.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: session?.studentValidated ? "default" : "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/sessions/${id as string}/validate`,
                {
                  method: "PUT",
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
              );
              const data = await res.json();
              if (!data.success) throw new Error(data.message);
              Alert.alert(
                data.data?.verified
                  ? "Seance completee ✅"
                  : "Seance completee sans QR ⚠️",
                data.data?.verified
                  ? "La seance a ete completee avec succes !"
                  : "La seance est marquee comme non verifiee. Le candidat peut contester dans 24h.",
              );
              loadSession();
            } catch (err: any) {
              Alert.alert("Erreur", err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = async () => {
    Alert.alert("Annuler", "Voulez-vous annuler cette seance ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL}/sessions/${id as string}/cancel`,
              {
                method: "PUT",
                headers: { Authorization: `Bearer ${accessToken}` },
              },
            );
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            router.back();
          } catch (err: any) {
            Alert.alert("Erreur", err.message);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    Alert.alert(
      "Supprimer la seance",
      "Cette action est irreversible. La seance sera definitivement supprimee.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/sessions/${id as string}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
              );
              const data = await res.json();
              if (!data.success) throw new Error(data.message);
              Alert.alert("Seance supprimee");
              router.back();
            } catch (err: any) {
              Alert.alert("Erreur", err.message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) return null;

  const color = STATUS_COLOR[session.status] || "#3b82f6";
  const time = new Date(session.scheduledAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(session.scheduledAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const initials =
    session.student?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a202c" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Detail seance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
          gap: 16,
        }}
      >
        {/* Statut */}
        <View style={[s.statusCard, { borderLeftColor: color }]}>
          <View style={[s.statusBadge, { backgroundColor: color + "20" }]}>
            <Text style={[s.statusText, { color }]}>
              {STATUS_LABEL[session.status]}
            </Text>
          </View>
          <Text style={s.sessionNumber}>Seance #{session.sessionNumber}</Text>
        </View>

        {/* Candidat */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Candidat</Text>
          <View style={s.candidatRow}>
            <View style={s.candidatAvatar}>
              <Text style={s.candidatAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.candidatName}>{session.student?.fullName}</Text>
              <Text style={s.candidatPhone}>{session.student?.phone}</Text>
              <Text style={s.candidatEmail}>{session.student?.email}</Text>
            </View>
          </View>
        </View>

        {/* Détails */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Details</Text>
          <InfoRow icon="calendar-outline" label="Date" value={date} />
          <InfoRow
            icon="time-outline"
            label="Heure"
            value={`${time} · ${session.durationMinutes} min`}
          />
          {session.notes && (
            <InfoRow
              icon="document-text-outline"
              label="Notes"
              value={session.notes}
            />
          )}
        </View>

        {/* QR Code */}
        {(session.status === "CONFIRMED" ||
          (qrCode && session.status === "IN_PROGRESS")) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Demarrer la seance</Text>
            <Text style={s.qrHint}>
              Generez un QR Code et demandez au candidat de le scanner pour
              confirmer sa presence.
            </Text>
            {qrCode ? (
              <View style={s.qrContainer}>
                <QRCode
                  value={qrCode}
                  size={200}
                  color="#1a202c"
                  backgroundColor="#fff"
                />
                <View
                  style={[
                    s.timerBadge,
                    timeLeft < 60 && { backgroundColor: "#fee2e2" },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={timeLeft < 60 ? "#e53e3e" : "#3b82f6"}
                  />
                  <Text
                    style={[s.timerText, timeLeft < 60 && { color: "#e53e3e" }]}
                  >
                    {minutes}:{seconds.toString().padStart(2, "0")} restantes
                  </Text>
                </View>
              </View>
            ) : (
              session.status === "CONFIRMED" && (
                <TouchableOpacity
                  style={[s.generateBtn, generating && { opacity: 0.6 }]}
                  onPress={handleGenerateQr}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="qr-code-outline" size={20} color="#fff" />
                      <Text style={s.generateBtnText}>Generer le QR Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* Présence candidat — badge */}
        {["IN_PROGRESS", "PENDING_VALIDATION"].includes(session.status) &&
          session.studentValidated && (
            <View style={s.scannedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#38a169" />
              <Text style={s.scannedBadgeText}>
                Candidat present - QR Code scanne ✅
              </Text>
            </View>
          )}

        {/* Avertissement QR non scanné */}
        {["IN_PROGRESS", "PENDING_VALIDATION"].includes(session.status) &&
          !session.studentValidated && (
            <View style={s.warningCard}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={s.warningText}>
                Le candidat n a pas encore scanne le QR Code. Si vous terminez
                maintenant, la seance sera marquee comme non verifiee et le
                candidat pourra contester dans 24h.
              </Text>
            </View>
          )}

        {/* Bouton Terminer */}
        {["IN_PROGRESS", "PENDING_VALIDATION"].includes(session.status) && (
          <TouchableOpacity
            style={[
              s.validateBtn,
              {
                backgroundColor: session.studentValidated
                  ? "#38a169"
                  : "#f97316",
              },
              actionLoading && { opacity: 0.6 },
            ]}
            onPress={handleValidate}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={s.validateBtnText}>
                  {session.studentValidated
                    ? "Terminer la seance ✅"
                    : "Terminer sans QR ⚠️"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Séance contestée */}
        {session.status === "DISPUTED" && (
          <View style={s.disputedCard}>
            <Ionicons name="alert-circle" size={20} color="#e53e3e" />
            <View style={{ flex: 1 }}>
              <Text style={s.disputedTitle}>
                Seance contestee par le candidat
              </Text>
              {session.disputeReason && (
                <Text style={s.disputedReason}>
                  Raison : {session.disputeReason}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Séance non vérifiée */}
        {session.status === "COMPLETED_UNVERIFIED" && (
          <View style={s.unverifiedCard}>
            <Ionicons name="warning-outline" size={20} color="#f97316" />
            <Text style={s.unverifiedText}>
              Seance completee sans QR Code. Le candidat peut contester dans
              24h.
            </Text>
          </View>
        )}

        {/* Séance complétée */}
        {session.status === "COMPLETED" && (
          <View style={[s.card, { alignItems: "center", gap: 8 }]}>
            <Ionicons name="trophy-outline" size={48} color="#38a169" />
            <Text style={s.completedTitle}>Seance completee !</Text>
            <Text style={s.completedSub}>
              La seance a ete completee avec succes.
            </Text>
          </View>
        )}

        {/* Annuler + Supprimer */}
        {["PENDING_STUDENT", "CONFIRMED"].includes(session.status) && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
              <Ionicons name="close-outline" size={18} color="#e53e3e" />
              <Text style={s.cancelBtnText}>Annuler la seance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={s.deleteBtnText}>Supprimer definitivement</Text>
            </TouchableOpacity>
          </View>
        )}

        {["REFUSED", "CANCELLED", "DISPUTED", "COMPLETED_UNVERIFIED"].includes(
          session.status,
        ) && (
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={s.deleteBtnText}>Supprimer definitivement</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color="#718096" />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
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
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1a202c" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 13, fontWeight: "700" },
  sessionNumber: { fontSize: 13, color: "#a0aec0", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
    gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#1a202c" },
  candidatRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  candidatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  candidatAvatarText: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  candidatName: { fontSize: 16, fontWeight: "700", color: "#1a202c" },
  candidatPhone: { fontSize: 13, color: "#718096", marginTop: 3 },
  candidatEmail: { fontSize: 12, color: "#a0aec0", marginTop: 2 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 11, color: "#a0aec0", marginBottom: 2 },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    textTransform: "capitalize",
  },
  qrHint: { fontSize: 13, color: "#718096", lineHeight: 20 },
  qrContainer: { alignItems: "center", gap: 16, paddingVertical: 8 },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: { fontSize: 16, fontWeight: "700", color: "#3b82f6" },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#8b5cf6",
    borderRadius: 14,
    padding: 16,
  },
  generateBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  scannedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#d1fae5",
    padding: 12,
    borderRadius: 12,
  },
  scannedBadgeText: { fontSize: 13, fontWeight: "600", color: "#065f46" },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fffbeb",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  warningText: { flex: 1, fontSize: 12, color: "#d97706", lineHeight: 18 },
  validateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    padding: 16,
  },
  validateBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  completedTitle: { fontSize: 18, fontWeight: "bold", color: "#38a169" },
  completedSub: { fontSize: 13, color: "#718096", textAlign: "center" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#e53e3e" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e53e3e",
    borderRadius: 14,
    padding: 14,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  disputedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fee2e2",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  disputedTitle: { fontSize: 14, fontWeight: "700", color: "#dc2626" },
  disputedReason: { fontSize: 12, color: "#e53e3e", marginTop: 4 },
  unverifiedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fff7ed",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  unverifiedText: { flex: 1, fontSize: 12, color: "#f97316", lineHeight: 18 },
});
