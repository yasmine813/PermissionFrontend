import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi } from "../src/services/api";

// ─── Données Tunisie ──────────────────────────────────────────────────────────
const GOUVERNORATS_VILLES: Record<string, string[]> = {
  Tunis: ["Tunis", "La Marsa", "Le Bardo", "La Goulette", "Carthage"],
  Ariana: ["Ariana", "Ettadhamen", "Mnihla", "Kalaat el-Andalous"],
  "Ben Arous": ["Ben Arous", "Hammam Lif", "Hammam Chott", "Ezzahra"],
  Manouba: ["Manouba", "Den Den", "Douar Hicher", "Tebourba"],
  Nabeul: ["Nabeul", "Hammamet", "Kelibia", "Grombalia"],
  Zaghouan: ["Zaghouan", "Bir Mcherga", "El Fahs"],
  Bizerte: ["Bizerte", "Menzel Bourguiba", "Mateur", "Sejnane"],
  Béja: ["Béja", "Medjez el-Bab", "Testour", "Thibar"],
  Jendouba: ["Jendouba", "Tabarka", "Aïn Draham", "Fernana"],
  Kef: ["Le Kef", "Dahmani", "Sakiet Sidi Youssef"],
  Siliana: ["Siliana", "Makthar", "Rouhia"],
  Sousse: ["Sousse", "Msaken", "Hammam Sousse", "Kalaa Kebira"],
  Monastir: ["Monastir", "Moknine", "Ksar Hellal", "Teboulba"],
  Mahdia: ["Mahdia", "Ksour Essef", "El Jem", "Chebba"],
  Sfax: ["Sfax", "Sakiet Ezzit", "Sakiet Eddaïer", "El Ain", "Thyna"],
  Kairouan: ["Kairouan", "Sbikha", "Haffouz", "Nasrallah"],
  Kasserine: ["Kasserine", "Sbeitla", "Thala", "Feriana"],
  "Sidi Bouzid": ["Sidi Bouzid", "Jelma", "Meknassy", "Regueb"],
  Gabès: ["Gabès", "El Hamma", "Matmata", "Mareth"],
  Médenine: ["Médenine", "Djerba", "Zarzis", "Ben Gardane"],
  Tataouine: ["Tataouine", "Ghomrassen", "Remada", "Bir Lahmar"],
  Gafsa: ["Gafsa", "Metlaoui", "Moularès", "Redeyef"],
  Tozeur: ["Tozeur", "Nefta", "Degache", "Hazoua"],
  Kébili: ["Kébili", "Douz", "El Faouar", "Souk Lahad"],
};

// ─── Validation mot de passe ──────────────────────────────────────────────────
const validatePassword = (pwd: string) => {
  const checks = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, isStrong: score >= 4 };
};

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState(1); // pour moniteur étape 2 : 1 ou 2
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    email: "",
    role: "STUDENT" as "STUDENT" | "INSTRUCTOR",
    phone: "+216",
    nomCommercial: "",
    adresse: "",
    gouvernorat: "",
    ville: "",
    codePostal: "",
    matricule: "",
    phonePro: "+216",
    sponsorCode: "",
    password: "",
    confirmPassword: "",
  });

  const set = (key: string) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isInstructor = form.role === "INSTRUCTOR";
  const villes = form.gouvernorat
    ? GOUVERNORATS_VILLES[form.gouvernorat] || []
    : [];

  // ─── Envoyer OTP ─────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const phone = isInstructor ? form.phonePro : form.phone;
    if (!phone || phone === "+216") {
      Alert.alert("Erreur", "Entrez votre numéro de téléphone");
      return;
    }
    setSendingOtp(true);
    try {
      // En production : appel API pour envoyer OTP
      // Pour le dev : simuler un envoi
      await new Promise((r) => setTimeout(r, 1000));
      setOtpSent(true);
      Alert.alert(
        "Code envoyé ✅",
        `Un code a été envoyé au ${phone}\n\n(Dev: utilisez 1234)`,
      );
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer le code");
    } finally {
      setSendingOtp(false);
    }
  };

  // ─── Vérifier OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = () => {
    if (otpCode === "1234") {
      setOtpVerified(true);
      Alert.alert("Vérifié ✅", "Numéro vérifié avec succès !");
    } else {
      Alert.alert("Erreur", "Code incorrect");
    }
  };

  // ─── Validation étape ────────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 0) {
      if (!form.lastName || !form.firstName || !form.email) {
        Alert.alert("Erreur", "Tous les champs sont obligatoires");
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(form.email)) {
        Alert.alert("Erreur", "Email invalide");
        return false;
      }
    }

    if (step === 1) {
      if (!isInstructor) {
        if (!form.phone || form.phone === "+216") {
          Alert.alert("Erreur", "Numéro de téléphone requis");
          return false;
        }
        if (!otpVerified) {
          Alert.alert("Erreur", "Veuillez vérifier votre numéro de téléphone");
          return false;
        }
      } else {
        if (subStep === 1) {
          if (
            !form.nomCommercial ||
            !form.adresse ||
            !form.gouvernorat ||
            !form.ville ||
            !form.codePostal
          ) {
            Alert.alert("Erreur", "Tous les champs sont obligatoires");
            return false;
          }
          setSubStep(2);
          return false; // rester sur étape 1, passer à sub 2
        }
        if (subStep === 2) {
          if (!form.matricule || !form.phonePro || form.phonePro === "+216") {
            Alert.alert("Erreur", "Matricule et téléphone sont obligatoires");
            return false;
          }
          if (!otpVerified) {
            Alert.alert(
              "Erreur",
              "Veuillez vérifier votre numéro de téléphone",
            );
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => s + 1);
    setSubStep(1);
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode("");
  };

  const handleRegister = async () => {
    const { checks, isStrong } = validatePassword(form.password);
    if (!isStrong) {
      Alert.alert(
        "Mot de passe trop faible",
        (!checks.length ? "• 8 caractères minimum\n" : "") +
          (!checks.uppercase ? "• Une majuscule\n" : "") +
          (!checks.lowercase ? "• Une minuscule\n" : "") +
          (!checks.number ? "• Un chiffre\n" : "") +
          (!checks.special ? "• Un caractère spécial (!@#$%^&*)" : ""),
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        fullName: `${form.lastName} ${form.firstName}`,
        email: form.email,
        phone: isInstructor ? form.phonePro : form.phone,
        password: form.password,
        role: form.role,
        nomCommercial: form.nomCommercial,
        adresse: form.adresse,
        gouvernorat: form.gouvernorat,
        ville: form.ville,
        codePostal: form.codePostal,
        matricule: form.matricule,
      });
      Alert.alert("Succès 🎉", "Compte créé !", [
        {
          text: "Se connecter",
          onPress: () => router.replace("/login" as any),
        },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err.response?.data?.message || "Inscription échouée",
      );
    } finally {
      setLoading(false);
    }
  };

  const pwdVal = validatePassword(form.password);

  // ─── Labels étapes ────────────────────────────────────────────────────────────
  const stepLabels = ["Profil", "Contact", "Sécurité"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {step > 0 && (
            <TouchableOpacity
              onPress={() => {
                if (isInstructor && step === 1 && subStep === 2) {
                  setSubStep(1);
                } else {
                  setStep((s) => s - 1);
                }
              }}
            >
              <Text style={styles.backText}>← Retour</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>S inscrire</Text>
          <Text style={styles.subtitle}>Créer votre profil</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsRow}>
          {stepLabels.map((label, i) => (
            <View key={i} style={styles.stepWrap}>
              <View
                style={[
                  styles.stepDot,
                  i <= step && styles.stepDotActive,
                  i < step && styles.stepDotDone,
                ]}
              >
                {i < step ? (
                  <Text style={styles.stepIcon}>✓</Text>
                ) : (
                  <Text
                    style={[styles.stepNum, i <= step && { color: "#fff" }]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.stepLabel, i <= step && styles.stepLabelActive]}
              >
                {label}
              </Text>
              {i < 2 && (
                <View
                  style={[styles.stepLine, i < step && styles.stepLineActive]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Sous-étape label pour moniteur */}
        {isInstructor && step === 1 && (
          <Text style={styles.subStepLabel}>Étape {subStep}/2</Text>
        )}

        {/* ── ÉTAPE 1 : Profil ─────────────────────────────────────────── */}
        {step === 0 && (
          <View style={styles.form}>
            <Field
              label="Nom *"
              placeholder="Bensalem"
              value={form.lastName}
              onChangeText={set("lastName")}
            />
            <Field
              label="Prénom *"
              placeholder="Ahmed"
              value={form.firstName}
              onChangeText={set("firstName")}
            />
            <Field
              label="Email *"
              placeholder="votre@email.com"
              value={form.email}
              onChangeText={set("email")}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Rôle *</Text>
            <View style={styles.roleRow}>
              {(["STUDENT", "INSTRUCTOR"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    form.role === r && styles.roleBtnActive,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, role: r }))}
                >
                  <Text style={{ fontSize: 26 }}>
                    {r === "STUDENT" ? "🎓" : "🚗"}
                  </Text>
                  <Text
                    style={[
                      styles.roleBtnText,
                      form.role === r && styles.roleBtnTextActive,
                    ]}
                  >
                    {r === "STUDENT" ? "Élève" : "Moniteur"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── ÉTAPE 2 ÉLÈVE : Téléphone + OTP ─────────────────────────── */}
        {step === 1 && !isInstructor && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>📱 Vérification du téléphone</Text>

            <Field
              label="Numéro de téléphone *"
              placeholder="+216"
              value={form.phone}
              onChangeText={(v: string) => {
                set("phone")(v);
                setOtpSent(false);
                setOtpVerified(false);
              }}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[
                styles.otpSendBtn,
                (otpSent || sendingOtp) && { opacity: 0.6 },
              ]}
              onPress={handleSendOtp}
              disabled={otpSent || sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.otpSendBtnText}>
                  {otpSent ? "Code envoyé ✓" : "Envoyer le code SMS"}
                </Text>
              )}
            </TouchableOpacity>

            {otpSent && (
              <View style={styles.otpRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      marginBottom: 0,
                      letterSpacing: 8,
                      textAlign: "center",
                      fontSize: 20,
                      fontWeight: "bold",
                    },
                  ]}
                  placeholder="- - - -"
                  placeholderTextColor="#aaa"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={[
                    styles.otpVerifyBtn,
                    otpVerified && styles.otpVerifiedBtn,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={otpVerified}
                >
                  <Text style={styles.otpVerifyText}>
                    {otpVerified ? "✓ Vérifié" : "Vérifier"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {otpVerified && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  ✅ Numéro vérifié avec succès !
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── ÉTAPE 2 MONITEUR 2/1 : Auto-école ───────────────────────── */}
        {step === 1 && isInstructor && subStep === 1 && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>🏫 Informations auto-école</Text>

            <Field
              label="Nom commercial *"
              placeholder="Auto-école Sfax Centre"
              value={form.nomCommercial}
              onChangeText={set("nomCommercial")}
            />
            <Field
              label="Adresse *"
              placeholder="12 Avenue Hedi Chaker"
              value={form.adresse}
              onChangeText={set("adresse")}
            />

            <Text style={styles.fieldLabel}>Gouvernorat *</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={form.gouvernorat}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, gouvernorat: v, ville: "" }))
                }
                style={styles.picker}
              >
                <Picker.Item label="Sélectionner un gouvernorat..." value="" />
                {Object.keys(GOUVERNORATS_VILLES).map((g) => (
                  <Picker.Item key={g} label={g} value={g} />
                ))}
              </Picker>
            </View>

            <Text style={styles.fieldLabel}>Ville *</Text>
            <View
              style={[styles.pickerWrap, !form.gouvernorat && { opacity: 0.5 }]}
            >
              <Picker
                selectedValue={form.ville}
                onValueChange={(v) => setForm((f) => ({ ...f, ville: v }))}
                style={styles.picker}
                enabled={!!form.gouvernorat}
              >
                <Picker.Item label="Sélectionner une ville..." value="" />
                {villes.map((v) => (
                  <Picker.Item key={v} label={v} value={v} />
                ))}
              </Picker>
            </View>

            <Field
              label="Code postal *"
              placeholder="3000"
              value={form.codePostal}
              onChangeText={set("codePostal")}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* ── ÉTAPE 2 MONITEUR 2/2 : Matricule + OTP ──────────────────── */}
        {step === 1 && isInstructor && subStep === 2 && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>
              📋 Informations professionnelles
            </Text>

            <Field
              label="Matricule *"
              placeholder="LIC-001-TN"
              value={form.matricule}
              onChangeText={set("matricule")}
              autoCapitalize="characters"
            />

            <Field
              label="Téléphone professionnel *"
              placeholder="+21698XXXXXX"
              value={form.phonePro}
              onChangeText={(v: string) => {
                set("phonePro")(v);
                setOtpSent(false);
                setOtpVerified(false);
              }}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[
                styles.otpSendBtn,
                (otpSent || sendingOtp) && { opacity: 0.6 },
              ]}
              onPress={handleSendOtp}
              disabled={otpSent || sendingOtp}
            >
              {sendingOtp ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.otpSendBtnText}>
                  {otpSent ? "Code envoyé ✓" : "Envoyer le code SMS"}
                </Text>
              )}
            </TouchableOpacity>

            {otpSent && (
              <View style={styles.otpRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      marginBottom: 0,
                      letterSpacing: 8,
                      textAlign: "center",
                      fontSize: 20,
                      fontWeight: "bold",
                    },
                  ]}
                  placeholder="- - - -"
                  placeholderTextColor="#aaa"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={[
                    styles.otpVerifyBtn,
                    otpVerified && styles.otpVerifiedBtn,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={otpVerified}
                >
                  <Text style={styles.otpVerifyText}>
                    {otpVerified ? "✓ Vérifié" : "Vérifier"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {otpVerified && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  ✅ Numéro vérifié avec succès !
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── ÉTAPE 3 : Sécurité ───────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>🔒 Sécurité</Text>

            <Field
              label="Code de parrainage (optionnel)"
              placeholder="Ex: ROKHSA2025"
              value={form.sponsorCode}
              onChangeText={set("sponsorCode")}
              autoCapitalize="characters"
            />

            <Field
              label="Mot de passe *"
              placeholder="••••••••"
              value={form.password}
              onChangeText={set("password")}
              secureTextEntry
            />

            {form.password.length > 0 && (
              <View style={styles.pwdWrap}>
                <View style={styles.pwdBar}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.pwdSeg,
                        {
                          backgroundColor:
                            i <= pwdVal.score
                              ? pwdVal.score <= 2
                                ? "#e53e3e"
                                : pwdVal.score <= 3
                                  ? "#dd6b20"
                                  : "#38a169"
                              : "#e2e8f0",
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[
                    styles.pwdStrLabel,
                    {
                      color:
                        pwdVal.score <= 2
                          ? "#e53e3e"
                          : pwdVal.score <= 3
                            ? "#dd6b20"
                            : "#38a169",
                    },
                  ]}
                >
                  {pwdVal.score <= 2
                    ? "🔴 Faible"
                    : pwdVal.score <= 3
                      ? "🟠 Moyen"
                      : "🟢 Fort"}
                </Text>
                <View style={styles.pwdChecks}>
                  {[
                    { label: "8 caractères min.", ok: pwdVal.checks.length },
                    { label: "Majuscule (A-Z)", ok: pwdVal.checks.uppercase },
                    { label: "Minuscule (a-z)", ok: pwdVal.checks.lowercase },
                    { label: "Chiffre (0-9)", ok: pwdVal.checks.number },
                    { label: "Spécial (!@#$...)", ok: pwdVal.checks.special },
                  ].map((c) => (
                    <Text
                      key={c.label}
                      style={[
                        styles.pwdCheck,
                        { color: c.ok ? "#38a169" : "#a0aec0" },
                      ]}
                    >
                      {c.ok ? "✓" : "○"} {c.label}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <Field
              label="Confirmer le mot de passe *"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChangeText={set("confirmPassword")}
              secureTextEntry
            />

            {form.confirmPassword.length > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  marginTop: -8,
                  marginBottom: 12,
                  color:
                    form.password === form.confirmPassword
                      ? "#38a169"
                      : "#e53e3e",
                }}
              >
                {form.password === form.confirmPassword
                  ? "✓ Les mots de passe correspondent"
                  : "✗ Ne correspondent pas"}
              </Text>
            )}
          </View>
        )}

        {/* ── Bouton ───────────────────────────────────────────────────── */}
        {step < 2 ? (
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Continuer →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Créer mon compte 🎉</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{ marginTop: 20, alignItems: "center", paddingBottom: 20 }}
          onPress={() => router.replace("/login" as any)}
        >
          <Text style={{ fontSize: 13, color: "#718096" }}>
            Déjà un compte ?{" "}
            <Text style={{ color: "#3b82f6", fontWeight: "bold" }}>
              Se connecter
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "sentences"}
        secureTextEntry={secureTextEntry || false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 24 },
  header: { paddingTop: 50, marginBottom: 20 },
  backText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a202c",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 4,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  stepWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#3b82f6" },
  stepDotDone: { backgroundColor: "#38a169" },
  stepNum: { fontSize: 13, fontWeight: "bold", color: "#718096" },
  stepIcon: { fontSize: 13, fontWeight: "bold", color: "#fff" },
  stepLabel: { fontSize: 11, color: "#a0aec0" },
  stepLabelActive: { color: "#3b82f6", fontWeight: "600" },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 2,
  },
  stepLineActive: { backgroundColor: "#38a169" },
  subStepLabel: {
    textAlign: "center",
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "600",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 16,
  },
  form: { marginBottom: 8, marginTop: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1a202c",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  roleBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    gap: 8,
  },
  roleBtnActive: { backgroundColor: "#eff6ff", borderColor: "#3b82f6" },
  roleBtnText: { fontSize: 14, fontWeight: "600", color: "#718096" },
  roleBtnTextActive: { color: "#3b82f6" },
  pickerWrap: {
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    marginBottom: 14,
    overflow: "hidden",
  },
  picker: { height: 50, color: "#1a202c" },
  otpSendBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  otpSendBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  otpVerifyBtn: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  otpVerifiedBtn: { backgroundColor: "#38a169" },
  otpVerifyText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  successBox: {
    backgroundColor: "#f0fff4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#9ae6b4",
  },
  successText: { fontSize: 13, color: "#38a169", fontWeight: "600" },
  pwdWrap: { marginTop: -4, marginBottom: 14 },
  pwdBar: { flexDirection: "row", gap: 4, marginBottom: 6 },
  pwdSeg: { flex: 1, height: 5, borderRadius: 3 },
  pwdStrLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  pwdChecks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pwdCheck: { fontSize: 11 },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
