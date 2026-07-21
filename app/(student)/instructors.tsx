import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  financeApi,
  instructorsApi,
  invitationsApi,
} from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";

const GOUVERNORATS_VILLES: Record<string, string[]> = {
  Tunis: ["Tunis", "La Marsa", "Le Bardo", "La Goulette", "Carthage"],
  Ariana: ["Ariana", "Ettadhamen", "Mnihla"],
  "Ben Arous": ["Ben Arous", "Hammam Lif", "Hammam Chott"],
  Manouba: ["Manouba", "Den Den", "Douar Hicher"],
  Nabeul: ["Nabeul", "Hammamet", "Kelibia"],
  Bizerte: ["Bizerte", "Menzel Bourguiba", "Mateur"],
  Beja: ["Beja", "Medjez el-Bab", "Testour"],
  Jendouba: ["Jendouba", "Tabarka", "Ain Draham"],
  Kef: ["Le Kef", "Dahmani"],
  Siliana: ["Siliana", "Makthar"],
  Sousse: ["Sousse", "Msaken", "Hammam Sousse"],
  Monastir: ["Monastir", "Moknine", "Ksar Hellal"],
  Mahdia: ["Mahdia", "Ksour Essef", "El Jem"],
  Sfax: ["Sfax", "Sakiet Ezzit", "El Ain", "Thyna"],
  Kairouan: ["Kairouan", "Sbikha", "Haffouz"],
  Kasserine: ["Kasserine", "Sbeitla", "Thala"],
  "Sidi Bouzid": ["Sidi Bouzid", "Jelma", "Meknassy"],
  Gabes: ["Gabes", "El Hamma", "Matmata"],
  Medenine: ["Medenine", "Djerba", "Zarzis"],
  Tataouine: ["Tataouine", "Ghomrassen", "Remada"],
  Gafsa: ["Gafsa", "Metlaoui", "Moulares"],
  Tozeur: ["Tozeur", "Nefta", "Degache"],
  Kebili: ["Kebili", "Douz", "El Faouar"],
};

const PERMIS_OPTIONS = ["B", "A", "C", "D"];

interface Instructor {
  id: string;
  nomCommercial: string;
  gouvernorat: string;
  ville: string;
  ratingAvg: number;
  prixPermisB: number | null;
  prixPermisA: number | null;
  prixPermisC: number | null;
  prixPermisD: number | null;
  user: { fullName: string; phone: string; email: string };
}

export default function InstructorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGouv, setSelectedGouv] = useState("");
  const [selectedVille, setSelectedVille] = useState("");
  const [selectedPermis, setSelectedPermis] = useState("");
  const [showGouvModal, setShowGouvModal] = useState(false);
  const [showVilleModal, setShowVilleModal] = useState(false);
  const [showPermisModal, setShowPermisModal] = useState(false);
  const [alreadyLinked, setAlreadyLinked] = useState(false);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  // Permit modal states
  const [showPermitChoiceModal, setShowPermitChoiceModal] = useState(false);
  const [pendingInstructor, setPendingInstructor] = useState<Instructor | null>(
    null,
  );
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const villes = selectedGouv ? GOUVERNORATS_VILLES[selectedGouv] || [] : [];

  useEffect(() => {
    checkIfLinked();
  }, []);
  useEffect(() => {
    loadInstructors();
  }, [selectedGouv, selectedVille, selectedPermis]);

  const checkIfLinked = async () => {
    try {
      const res = await invitationsApi.getMyInstructor(accessToken!);
      if (res.data.data.instructor) setAlreadyLinked(true);
    } catch {}
  };

  const loadInstructors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedGouv) params.gouvernorat = selectedGouv;
      if (selectedVille) params.ville = selectedVille;
      if (selectedPermis) params.permis = selectedPermis;
      const res = await instructorsApi.getAll(params, accessToken!);
      setInstructors(res.data.data.instructors);
    } catch {
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (instructor: Instructor) => {
    setPendingInstructor(instructor);
    setSelectedPermit(null);
    setShowPermitChoiceModal(true);
  };

  const handleConfirmInvite = async () => {
    if (!pendingInstructor || !selectedPermit) {
      Alert.alert("Erreur", "Veuillez choisir un type de permis");
      return;
    }
    setInviteLoading(true);
    try {
      await invitationsApi.send(pendingInstructor.id, undefined, accessToken!);

      const price =
        selectedPermit === "B"
          ? pendingInstructor.prixPermisB
          : selectedPermit === "A"
            ? pendingInstructor.prixPermisA
            : selectedPermit === "C"
              ? pendingInstructor.prixPermisC
              : pendingInstructor.prixPermisD;

      await financeApi.updatePermit(
        user!.id,
        {
          permitType: selectedPermit,
          pricePerSession: price,
        },
        accessToken!,
      );

      setInvitedIds((prev) => [...prev, pendingInstructor.id]);
      setShowPermitChoiceModal(false);
      Alert.alert(
        "Invitation envoyee",
        `Votre invitation a ${pendingInstructor.user.fullName} a ete envoyee !`,
      );
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err?.response?.data?.message || "Impossible d envoyer",
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const filtered = instructors.filter(
    (i) =>
      i.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (i.nomCommercial || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.ville || "").toLowerCase().includes(search.toLowerCase()),
  );

  const getPermisLabels = (i: Instructor) => {
    const labels = [];
    if (i.prixPermisB) labels.push("B");
    if (i.prixPermisA) labels.push("A");
    if (i.prixPermisC) labels.push("C");
    if (i.prixPermisD) labels.push("D");
    return labels;
  };

  const resetFilters = () => {
    setSelectedGouv("");
    setSelectedVille("");
    setSelectedPermis("");
    setSearch("");
  };
  const hasFilters = !!(selectedGouv || selectedVille || selectedPermis);

  const availablePermits = pendingInstructor
    ? [
        {
          type: "B",
          label: "Permis B",
          icon: "car-outline",
          price: pendingInstructor.prixPermisB,
        },
        {
          type: "A",
          label: "Permis A",
          icon: "bicycle-outline",
          price: pendingInstructor.prixPermisA,
        },
        {
          type: "C",
          label: "Permis C",
          icon: "bus-outline",
          price: pendingInstructor.prixPermisC,
        },
        {
          type: "D",
          label: "Permis D",
          icon: "train-outline",
          price: pendingInstructor.prixPermisD,
        },
      ].filter((p) => p.price)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f8fc" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={s.headerTitle}>Moniteurs</Text>
          <Text style={s.headerSub}>Trouvez votre moniteur ideal</Text>
        </View>
        {hasFilters && (
          <TouchableOpacity style={s.resetBtn} onPress={resetFilters}>
            <Ionicons name="refresh-outline" size={14} color="#ef4444" />
            <Text style={s.resetBtnText}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#a0aec0" />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un moniteur, une ville..."
          placeholderTextColor="#a0aec0"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#a0aec0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <View style={s.filtersSection}>
        <Text style={s.filtersLabel}>Filtres</Text>
        <View style={s.filtersGrid}>
          <TouchableOpacity
            style={[s.filterBtn, selectedGouv && s.filterBtnActive]}
            onPress={() => setShowGouvModal(true)}
          >
            <Ionicons
              name="location-outline"
              size={16}
              color={selectedGouv ? "#fff" : "#3b82f6"}
            />
            <Text
              style={[s.filterBtnText, selectedGouv && s.filterBtnTextActive]}
              numberOfLines={1}
            >
              {selectedGouv || "Gouvernorat"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={selectedGouv ? "#fff" : "#3b82f6"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.filterBtn,
              selectedVille && s.filterBtnActive,
              !selectedGouv && s.filterBtnDisabled,
            ]}
            onPress={() => selectedGouv && setShowVilleModal(true)}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={selectedVille ? "#fff" : "#3b82f6"}
            />
            <Text
              style={[s.filterBtnText, selectedVille && s.filterBtnTextActive]}
              numberOfLines={1}
            >
              {selectedVille || "Ville"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={selectedVille ? "#fff" : "#3b82f6"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterBtn, selectedPermis && s.filterBtnActive]}
            onPress={() => setShowPermisModal(true)}
          >
            <Ionicons
              name="ribbon-outline"
              size={16}
              color={selectedPermis ? "#fff" : "#3b82f6"}
            />
            <Text
              style={[s.filterBtnText, selectedPermis && s.filterBtnTextActive]}
              numberOfLines={1}
            >
              {selectedPermis ? `Permis ${selectedPermis}` : "Permis"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={selectedPermis ? "#fff" : "#3b82f6"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: "#a0aec0", marginTop: 12, fontSize: 13 }}>
            Chargement...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={s.resultsCount}>
              {filtered.length} moniteur{filtered.length > 1 ? "s" : ""} trouve
              {filtered.length > 1 ? "s" : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="people-outline" size={40} color="#a0aec0" />
              </View>
              <Text style={s.emptyTitle}>Aucun moniteur trouve</Text>
              <Text style={s.emptyText}>
                Essayez de modifier vos filtres de recherche
              </Text>
              {hasFilters && (
                <TouchableOpacity
                  style={s.emptyResetBtn}
                  onPress={resetFilters}
                >
                  <Text style={s.emptyResetText}>Effacer les filtres</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const permis = getPermisLabels(item);
            const initials = item.user.fullName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{item.user.fullName}</Text>
                    {item.nomCommercial && (
                      <Text style={s.cardCommercial}>{item.nomCommercial}</Text>
                    )}
                    <View style={s.locationRow}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#718096"
                      />
                      <Text style={s.locationText}>
                        {[item.ville, item.gouvernorat]
                          .filter(Boolean)
                          .join(", ") || "Non renseigne"}
                      </Text>
                    </View>
                  </View>
                  {item.ratingAvg > 0 && (
                    <View style={s.ratingBadge}>
                      <Ionicons name="star" size={13} color="#f59e0b" />
                      <Text style={s.ratingText}>
                        {item.ratingAvg?.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {permis.length > 0 && (
                  <View style={s.permisRow}>
                    {permis.map((p) => (
                      <View key={p} style={s.permisBadge}>
                        <Text style={s.permisBadgeText}>Permis {p}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={s.cardBtns}>
                  <TouchableOpacity
                    style={[
                      s.inviteBtn,
                      (alreadyLinked || invitedIds.includes(item.id)) && {
                        opacity: 0.5,
                        borderColor: "#a0aec0",
                      },
                    ]}
                    onPress={() =>
                      !alreadyLinked &&
                      !invitedIds.includes(item.id) &&
                      handleInvite(item)
                    }
                    disabled={alreadyLinked || invitedIds.includes(item.id)}
                  >
                    <Ionicons
                      name={
                        invitedIds.includes(item.id)
                          ? "time-outline"
                          : "paper-plane-outline"
                      }
                      size={15}
                      color={
                        invitedIds.includes(item.id) ? "#a0aec0" : "#3b82f6"
                      }
                    />
                    <Text
                      style={[
                        s.inviteBtnText,
                        invitedIds.includes(item.id) && { color: "#a0aec0" },
                      ]}
                    >
                      {invitedIds.includes(item.id) ? "Envoyee" : "Inviter"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() =>
                      router.push(`/(student)/instructor/${item.id}` as any)
                    }
                  >
                    <Text style={s.viewBtnText}>Voir profil</Text>
                    <Ionicons name="chevron-forward" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modals filtres */}
      <SelectModal
        visible={showGouvModal}
        title="Gouvernorat"
        items={Object.keys(GOUVERNORATS_VILLES)}
        selected={selectedGouv}
        onSelect={(v: string) => {
          setSelectedGouv(v);
          setSelectedVille("");
          setShowGouvModal(false);
        }}
        onClose={() => setShowGouvModal(false)}
        onReset={() => {
          setSelectedGouv("");
          setSelectedVille("");
          setShowGouvModal(false);
        }}
      />
      <SelectModal
        visible={showVilleModal}
        title="Ville"
        items={villes}
        selected={selectedVille}
        onSelect={(v: string) => {
          setSelectedVille(v);
          setShowVilleModal(false);
        }}
        onClose={() => setShowVilleModal(false)}
        onReset={() => {
          setSelectedVille("");
          setShowVilleModal(false);
        }}
      />
      <SelectModal
        visible={showPermisModal}
        title="Categorie de permis"
        items={PERMIS_OPTIONS}
        selected={selectedPermis}
        onSelect={(v: string) => {
          setSelectedPermis(v);
          setShowPermisModal(false);
        }}
        onClose={() => setShowPermisModal(false)}
        onReset={() => {
          setSelectedPermis("");
          setShowPermisModal(false);
        }}
        renderItem={(item: string) => `Permis ${item}`}
      />

      {/* ── Modal choix permis ── */}
      <Modal
        visible={showPermitChoiceModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowPermitChoiceModal(false)}
      >
        <TouchableOpacity
          style={pm.overlay}
          activeOpacity={1}
          onPress={() => setShowPermitChoiceModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={pm.modal}>
            <View style={pm.header}>
              <View style={pm.headerIcon}>
                <Ionicons name="car-sport-outline" size={28} color="#3b82f6" />
              </View>
              <Text style={pm.title}>Type de permis</Text>
              <Text style={pm.subtitle}>
                Choisissez le permis que vous preparez avec{" "}
                {pendingInstructor?.user.fullName}
              </Text>
            </View>

            <Text style={pm.sectionLabel}>Permis disponibles</Text>

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
                      size={26}
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
                    {selectedPermit === permit.type && (
                      <View style={pm.permitCheck}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#fff"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={pm.actions}>
              <TouchableOpacity
                style={pm.cancelBtn}
                onPress={() => setShowPermitChoiceModal(false)}
              >
                <Text style={pm.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  pm.confirmBtn,
                  (!selectedPermit || inviteLoading) && { opacity: 0.5 },
                ]}
                onPress={handleConfirmInvite}
                disabled={!selectedPermit || inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane-outline"
                      size={16}
                      color="#fff"
                    />
                    <Text style={pm.confirmBtnText}>Envoyer</Text>
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

// ─── Modal selection ──────────────────────────────────────────────────────────
function SelectModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  onReset,
  renderItem,
}: any) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((i: string) =>
    (renderItem ? renderItem(i) : i)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                setSearch("");
              }}
            >
              <Ionicons name="close" size={22} color="#718096" />
            </TouchableOpacity>
          </View>
          <View style={s.modalSearch}>
            <Ionicons name="search-outline" size={16} color="#718096" />
            <TextInput
              style={s.modalSearchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(i: string) => i}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: { item: string }) => (
              <TouchableOpacity
                style={s.modalItem}
                onPress={() => {
                  onSelect(item);
                  setSearch("");
                }}
              >
                <Text
                  style={[
                    s.modalItemText,
                    selected === item && s.modalItemTextActive,
                  ]}
                >
                  {renderItem ? renderItem(item) : item}
                </Text>
                {selected === item && (
                  <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: "#f5f6fa" }} />
            )}
          />
          <TouchableOpacity
            style={s.modalResetBtn}
            onPress={() => {
              onReset();
              setSearch("");
            }}
          >
            <Text style={s.modalResetText}>Reinitialiser ce filtre</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1a202c" },
  headerSub: { fontSize: 13, color: "#718096", marginTop: 2 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    marginTop: 4,
  },
  resetBtnText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
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
  filtersSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filtersLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a0aec0",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  filtersGrid: { flexDirection: "row", gap: 10 },
  filterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  filterBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  filterBtnDisabled: { opacity: 0.4 },
  filterBtnText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#3b82f6" },
  filterBtnTextActive: { color: "#fff" },
  resultsCount: {
    fontSize: 13,
    color: "#718096",
    marginBottom: 10,
    fontWeight: "500",
  },
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
  emptyResetBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
  },
  emptyResetText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 3,
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontWeight: "bold", color: "#fff" },
  cardName: { fontSize: 15, fontWeight: "700", color: "#1a202c" },
  cardCommercial: { fontSize: 13, color: "#718096", marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  locationText: { fontSize: 12, color: "#718096" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#d97706" },
  permisRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  permisBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permisBadgeText: { fontSize: 12, fontWeight: "600", color: "#3b82f6" },
  cardBtns: { flexDirection: "row", gap: 8 },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  inviteBtnText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
  },
  viewBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "80%",
    flex: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1a202c" },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: "#1a202c" },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  modalItemText: { fontSize: 15, color: "#1a202c" },
  modalItemTextActive: { color: "#3b82f6", fontWeight: "700" },
  modalResetBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  modalResetText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
});

const pm = StyleSheet.create({
  overlay: {
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
  header: { alignItems: "center", gap: 6, marginBottom: 4 },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1a202c" },
  subtitle: { fontSize: 13, color: "#a0aec0", textAlign: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  permitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  permitBtn: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#bfdbfe",
    position: "relative",
  },
  permitBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  permitBtnLabel: { fontSize: 14, fontWeight: "700", color: "#3b82f6" },
  permitBtnPrice: { fontSize: 12, color: "#3b82f6", fontWeight: "500" },
  permitCheck: { position: "absolute", top: 8, right: 8 },
  noPermitWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 12,
  },
  noPermitText: { fontSize: 13, color: "#d97706", flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4, paddingBottom: 8 },
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
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
