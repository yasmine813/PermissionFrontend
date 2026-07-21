import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { instructorApi, invitationsApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

function getInitials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#38a169",
  "#f59e0b",
  "#e53e3e",
  "#06b6d4",
  "#ec4899",
];
function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "find">("mine");

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, []),
  );

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await instructorApi.getStudents({}, accessToken!);
      setAllStudents(res.data.data.students);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les candidats");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearch(text);
    try {
      const res = await instructorApi.getStudents(
        { search: text },
        accessToken!,
      );
      setAllStudents(res.data.data.students);
    } catch {}
  };

  const handleInvite = async (studentId: string, studentName: string) => {
    setActionLoading(studentId);
    try {
      await invitationsApi.send(studentId, undefined, accessToken!);
      setInvitedIds((prev) => [...prev, studentId]);
      Alert.alert(
        "Invitation envoyee",
        `Votre invitation a ${studentName} a ete envoyee`,
      );
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err?.response?.data?.message || "Impossible d envoyer",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const myStudents = allStudents.filter(
    (s) => s.studentRelation?.isActive === true,
  );
  const otherStudents = allStudents.filter((s) => !s.studentRelation?.isActive);

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
        <Text style={s.headerTitle}>Candidats</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === "mine" && s.tabActive]}
          onPress={() => setActiveTab("mine")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "mine" ? "#3b82f6" : "#a0aec0"}
          />
          <Text style={[s.tabText, activeTab === "mine" && s.tabTextActive]}>
            Mes candidats
          </Text>
          {myStudents.length > 0 && (
            <View
              style={[s.tabBadge, activeTab === "mine" && s.tabBadgeActive]}
            >
              <Text
                style={[
                  s.tabBadgeText,
                  activeTab === "mine" && { color: "#3b82f6" },
                ]}
              >
                {myStudents.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === "find" && s.tabActive]}
          onPress={() => setActiveTab("find")}
        >
          <Ionicons
            name="search"
            size={16}
            color={activeTab === "find" ? "#3b82f6" : "#a0aec0"}
          />
          <Text style={[s.tabText, activeTab === "find" && s.tabTextActive]}>
            Trouver
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Mes candidats ── */}
      {activeTab === "mine" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 80,
          }}
        >
          {myStudents.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="people-outline" size={40} color="#a0aec0" />
              </View>
              <Text style={s.emptyTitle}>Aucun candidat lie</Text>
              <Text style={s.emptyText}>
                Invitez des candidats depuis l onglet Trouver
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => setActiveTab("find")}
              >
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={s.emptyBtnText}>Trouver des candidats</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.sectionLabel}>
                {myStudents.length} candidat{myStudents.length > 1 ? "s" : ""}{" "}
                actif{myStudents.length > 1 ? "s" : ""}
              </Text>
              {myStudents.map((student) => {
                const color = getColor(student.fullName);
                const initials = getInitials(student.fullName);
                return (
                  <TouchableOpacity
                    key={student.id}
                    style={s.myCard}
                    onPress={() =>
                      router.push(`/(instructor)/student/${student.id}` as any)
                    }
                    activeOpacity={0.85}
                  >
                    {/* Avatar grand */}
                    <View style={[s.myAvatar, { backgroundColor: color }]}>
                      <Text style={s.myAvatarText}>{initials}</Text>
                    </View>

                    {/* Infos */}
                    <View style={s.myCardInfo}>
                      <Text style={s.myCardName}>{student.fullName}</Text>
                      <View style={s.myCardMeta}>
                        {student.phone && (
                          <View style={s.metaItem}>
                            <Ionicons
                              name="call-outline"
                              size={12}
                              color="#718096"
                            />
                            <Text style={s.metaText}>{student.phone}</Text>
                          </View>
                        )}
                        <View style={s.metaItem}>
                          <Ionicons
                            name="mail-outline"
                            size={12}
                            color="#718096"
                          />
                          <Text style={s.metaText} numberOfLines={1}>
                            {student.email}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Chevron */}
                    <View style={s.myCardRight}>
                      <View style={s.activeDot} />
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#cbd5e0"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Tab Trouver ── */}
      {activeTab === "find" && (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#a0aec0" />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher par nom ou email..."
              placeholderTextColor="#a0aec0"
              value={search}
              onChangeText={handleSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  loadStudents();
                }}
              >
                <Ionicons name="close-circle" size={18} color="#a0aec0" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={otherStudents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 16,
              gap: 10,
              paddingBottom: insets.bottom + 80,
            }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              otherStudents.length > 0 ? (
                <Text style={s.sectionLabel}>
                  {otherStudents.length} candidat
                  {otherStudents.length > 1 ? "s" : ""} disponible
                  {otherStudents.length > 1 ? "s" : ""}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="search-outline" size={40} color="#a0aec0" />
                </View>
                <Text style={s.emptyTitle}>Aucun resultat</Text>
                <Text style={s.emptyText}>Essayez un autre nom ou email</Text>
              </View>
            }
            renderItem={({ item }) => {
              const color = getColor(item.fullName);
              const initials = getInitials(item.fullName);
              const invited = invitedIds.includes(item.id);
              const isLoading = actionLoading === item.id;

              return (
                <View style={s.findCard}>
                  <View
                    style={[s.findAvatar, { backgroundColor: color + "25" }]}
                  >
                    <Text style={[s.findAvatarText, { color }]}>
                      {initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.findName}>{item.fullName}</Text>
                    <Text style={s.findEmail} numberOfLines={1}>
                      {item.email}
                    </Text>
                    {item.phone && (
                      <Text style={s.findPhone}>{item.phone}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      s.inviteBtn,
                      invited && s.inviteBtnSent,
                      isLoading && { opacity: 0.6 },
                    ]}
                    onPress={() =>
                      !invited && handleInvite(item.id, item.fullName)
                    }
                    disabled={invited || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : invited ? (
                      <>
                        <Ionicons name="time-outline" size={14} color="#fff" />
                        <Text style={s.inviteBtnText}>Envoye</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="paper-plane-outline"
                          size={14}
                          color="#fff"
                        />
                        <Text style={s.inviteBtnText}>Inviter</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1a202c" },
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
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#a0aec0" },
  tabTextActive: { color: "#3b82f6" },
  tabBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeActive: { backgroundColor: "#eff6ff" },
  tabBadgeText: { fontSize: 11, fontWeight: "700", color: "#a0aec0" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#718096",
    marginBottom: 4,
  },
  myCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 2,
  },
  myAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  myAvatarText: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  myCardInfo: { flex: 1, gap: 4 },
  myCardName: { fontSize: 16, fontWeight: "700", color: "#1a202c" },
  myCardMeta: { gap: 3 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: "#718096" },
  myCardRight: { alignItems: "center", gap: 6 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38a169",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1a202c" },
  findCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
  },
  findAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  findAvatarText: { fontSize: 15, fontWeight: "bold" },
  findName: { fontSize: 14, fontWeight: "700", color: "#1a202c" },
  findEmail: { fontSize: 12, color: "#a0aec0", marginTop: 2 },
  findPhone: { fontSize: 12, color: "#718096", marginTop: 1 },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  inviteBtnSent: { backgroundColor: "#a0aec0" },
  inviteBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#4a5568" },
  emptyText: { fontSize: 13, color: "#a0aec0", textAlign: "center" },
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
});
