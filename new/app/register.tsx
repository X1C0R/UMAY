import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { login as loginAPI, register as registerAPI } from "@/lib/api";

import { storeToken, storeUserData } from "@/lib/storage";

const LANGUAGE_OPTIONS = ["en", "ja", "ph"];
const STYLE_OPTIONS = ["visual", "auditory", "reading", "kinesthetic", "mixed"];

const PASSWORD_POLICY = [
  "At least 8 characters long",
  "Includes an uppercase letter",
  "Includes a lowercase letter",
  "Includes a number",
];

export default function RegistrationScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [learningStyle, setLearningStyle] = useState(STYLE_OPTIONS[0]);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
  // Validate password policy
  const meetsPolicy =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  if (!meetsPolicy) {
    setFormError("Password must meet all listed requirements.");
    return;
  }

  if (password !== confirmPassword) {
    setFormError("Passwords do not match.");
    return;
  }

  if (!firstName.trim() || !lastName.trim()) {
    setFormError("First name and last name are required.");
    return;
  }

  setFormError("");

  try {
    // --- Call REGISTER API ---
    const fullName = `${firstName} ${middleName} ${lastName}`.trim();

    const registerResponse = await registerAPI({
      email: email.trim(),
      password: password.trim(),
      fullName,
      avatarUrl: avatarUrl || undefined,
      preferredLanguage,
      learningStyle,
    });

    // --- Auto-login right after successful registration ---
    const loginResponse = await loginAPI({
      email: email.trim(),
      password: password.trim(),
    });

    // --- Store token & user data ---
    await storeToken(loginResponse.token);
    await storeUserData({
      email: loginResponse.email,
      fullName: loginResponse.fullName,
      avatarUrl: loginResponse.avatarUrl,
      preferredLanguage: loginResponse.preferredLanguage,
      learningStyle: loginResponse.learningStyle,
    });

    // --- Navigate to onboarding ---
    router.push("/onboarding");

  } catch (error: any) {
    const errorMessage = error.message || "Registration failed. Please try again.";

    let userMessage = errorMessage;

    if (errorMessage.includes("Cannot connect to server")) {
      userMessage = "Cannot connect to server. Please check your connection.";
    } else if (errorMessage.includes("already exists")) {
      userMessage = "Email is already registered.";
    }

    setFormError(userMessage);

    setTimeout(() => setFormError(""), 5000);
  }
};


  return (
    <LinearGradient
      colors={["#D9F4FF", "#F8FBFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <View pointerEvents="none" style={styles.decorLayer}>
          <LinearGradient
            colors={["rgba(33, 228, 185, 0.28)", "rgba(24, 144, 255, 0.12)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.decorBlob, styles.decorBlobTop]}
          />
          <LinearGradient
            colors={["rgba(24, 144, 255, 0.18)", "rgba(15, 23, 42, 0.08)"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.decorBlob, styles.decorBlobBottom]}
          />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#0F172A" />
            </TouchableOpacity>
            <LinearGradient
              colors={["#FFFFFF", "rgba(213, 251, 245, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCardGradient}
            >
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>MindMorph</Text>
                </View>
                <Text style={styles.heroBadgeCaption}>Let your learning style evolve with every session.</Text>
              </View>

              <View style={styles.heroBody}>
                <View style={styles.heroIconRing}>
                  <Ionicons name="sparkles" size={24} color="#0F172A" />
                </View>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>Create Your Account</Text>
                  <Text style={styles.heroSubtitle}>
                    Complete your profile to unlock your personalized dashboard and adaptive learning path.
                  </Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroPillRow}>
                <View style={styles.heroPill}>
                  <Ionicons name="lock-closed" size={16} color="#0F172A" />
                  <Text style={styles.heroPillText}>Secure by design</Text>
                </View>
                <View style={styles.heroPill}>
                  <Ionicons name="color-wand" size={16} color="#0F172A" />
                  <Text style={styles.heroPillText}>Adaptive guidance</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <LinearGradient
            colors={["rgba(255, 255, 255, 0.97)", "rgba(255, 255, 255, 0.85)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.section}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Account Credentials</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Create a secure password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Text style={styles.helperText}>Your password will be securely hashed on the server.</Text>
                <View style={styles.policyList}>
                  {PASSWORD_POLICY.map((rule) => (
                    <View key={rule} style={styles.policyItem}>
                      <View style={styles.policyBullet} />
                      <Text style={styles.policyText}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Confirm Password <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={["rgba(255, 255, 255, 0.97)", "rgba(255, 255, 255, 0.85)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.section}
          >
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Profile Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Taylor"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Middle Name</Text>
                <TextInput style={styles.input} placeholder="R." value={middleName} onChangeText={setMiddleName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Last Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput style={styles.input} placeholder="Adams" value={lastName} onChangeText={setLastName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Avatar URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/avatar.png"
                  autoCapitalize="none"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preferred Language</Text>
                <View style={styles.choiceRow}>
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = preferredLanguage === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        activeOpacity={0.85}
                        onPress={() => setPreferredLanguage(option)}
                        style={[styles.choiceChip, active && styles.choiceChipActive]}
                      >
                        <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Learning Style</Text>
                <View style={styles.choiceRowWrap}>
                  {STYLE_OPTIONS.map((option) => {
                    const active = learningStyle === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        activeOpacity={0.85}
                        onPress={() => setLearningStyle(option)}
                        style={[styles.choiceChip, styles.choiceChipLarge, active && styles.choiceChipActive]}
                      >
                        <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </LinearGradient>

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <TouchableOpacity activeOpacity={0.9} style={styles.submitButton} onPress={handleSubmit}>
            <LinearGradient
              colors={["#1890FF", "#17C9B5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>Create Account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/login")}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  decorBlob: {
    position: "absolute",
    height: 220,
    width: 220,
    borderRadius: 110,
  },
  decorBlobTop: {
    top: -60,
    right: -40,
  },
  decorBlobBottom: {
    bottom: -80,
    left: -60,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 28,
    zIndex: 1,
  },
  header: {
    marginTop: 12,
    gap: 16,
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    alignSelf: "flex-start",
  },
  heroCardGradient: {
    borderRadius: 32,
    paddingVertical: 26,
    paddingHorizontal: 24,
    gap: 18,
    shadowColor: "#38BDF8",
    shadowOpacity: 0.18,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    borderWidth: 1,
    borderColor: "rgba(31,199,182,0.25)",
  },
  heroBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(31,199,182,0.16)",
  },
  heroBadgeText: {
    fontFamily: "Roboto_500Medium",
    fontSize: 12,
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  heroBadgeCaption: {
    flex: 1,
    fontFamily: "Roboto_400Regular",
    fontSize: 12,
    color: "#0F172A",
    opacity: 0.7,
    textAlign: "right",
  },
  heroBody: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  heroIconRing: {
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(24,144,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(24,144,255,0.45)",
  },
  heroTextBlock: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: "#0F172A",
    fontFamily: "Montserrat_700Bold",
  },
  heroSubtitle: {
    fontFamily: "Roboto_400Regular",
    color: "#0F172A",
    opacity: 0.75,
    fontSize: 15,
    lineHeight: 22,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
  heroPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(31,199,182,0.35)",
  },
  heroPillText: {
    fontFamily: "Roboto_500Medium",
    fontSize: 12,
    color: "#0F172A",
  },
  section: {
    borderRadius: 28,
    padding: 22,
    shadowColor: "#60A5FA",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  sectionContent: {
    gap: 18,
  },
  sectionTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: "#0F172A",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#334155",
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Roboto_400Regular",
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Roboto_400Regular",
  },
  policyList: {
    marginTop: 10,
    gap: 6,
  },
  policyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  policyBullet: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#1890FF",
  },
  policyText: {
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
    color: "#475569",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 12,
  },
  choiceRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.15)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  choiceChipLarge: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  choiceChipActive: {
    backgroundColor: "#1890FF",
    borderColor: "#1FC7B6",
  },
  choiceChipText: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#475569",
    textTransform: "capitalize",
  },
  choiceChipTextActive: {
    color: "#FFFFFF",
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  errorText: {
    fontFamily: "Roboto_500Medium",
    fontSize: 13,
    color: "#B91C1C",
    textAlign: "center",
  },
  submitButton: {
    borderRadius: 999,
    shadowColor: "#1890FF",
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    overflow: "hidden",
  },
  submitButtonGradient: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#475569",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Roboto_500Medium",
    color: "#1890FF",
  },
});