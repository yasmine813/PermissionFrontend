import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
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
import { useAuthStore } from "../src/store/authStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    try {
      await login({ email: email.trim(), password });
      const { user } = useAuthStore.getState();
      if (user?.role === "INSTRUCTOR") {
        router.replace("/(instructor)/dashboard" as any);
      } else {
        router.replace("/(student)/dashboard" as any);
      }
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err.response?.data?.message || "Identifiants incorrects",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Image de fond */}
        <ImageBackground
          source={require("../assets/images/photo auto_ecole.png")}
          style={{ height: SCREEN_HEIGHT * 0.42 }}
          resizeMode="cover"
        />

        {/* Card formulaire */}
        <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.title}>Se connecter</Text>
          <Text style={styles.subtitle}>Entrez vos détails</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.com"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPass(!showPass)}
            >
              <Text style={{ fontSize: 18 }}>{showPass ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push("/register" as any)}
          >
            <Text style={styles.registerText}>
              Vous n avez pas encore de compte ?{" "}
              <Text style={styles.registerTextBold}>Inscrivez-vous</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    padding: 28,
    paddingTop: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1a202c",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#4a5568", marginBottom: 6 },
  input: {
    backgroundColor: "#f5f6fa",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1a202c",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  passRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  eyeBtn: { position: "absolute", right: 14 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: 6 },
  forgotText: { fontSize: 13, color: "#3b82f6", fontWeight: "600" },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  registerLink: { marginTop: 20, alignItems: "center" },
  registerText: { fontSize: 13, color: "#718096", textAlign: "center" },
  registerTextBold: { color: "#3b82f6", fontWeight: "bold" },
});
