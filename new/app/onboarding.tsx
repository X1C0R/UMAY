import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    title: "Adapts to Your Behavior",
    subtitle: "Real-time content switching based on how you learn",
    description: "MindMorph adapts to how you learn best in each session.",
    accent: ["#22D3EE", "#1AC7B5"],
    icon: "account-cowboy-hat",
  },
  {
    title: "Stay Engaged Effortlessly",
    subtitle: "Keep focus high in every study session",
    description: "Personalized prompts keep you engaged so you hit your goals.",
    accent: ["#8B5CF6", "#6366F1"],
    icon: "account-voice",
  },
  {
    title: "Track Deeper Insights",
    subtitle: "Track progress as your learning evolves",
    description: "See insights that highlight strengths and growth areas.",
    accent: ["#F97316", "#FBBF24"],
    icon: "chart-line",
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const isLast = step === SLIDES.length - 1;
  const current = SLIDES[step];

  const handleNext = () => {
    if (isLast) {
      router.push("/preference");
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    router.push("/preference");
  };

  return (
    <LinearGradient
      style={styles.background}
      colors={["#E8F5FF", "#FFFFFF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.skipRow}>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.8}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.carousel}>
          <LinearGradient
            colors={["#FFFFFF", "#F8FBFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{current.title}</Text>
            <Text style={styles.cardSubtitle}>{current.subtitle}</Text>
            <View style={styles.illustrationWrapper}>
              <LinearGradient
                colors={current.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.illustrationBadge}
              >
                <MaterialCommunityIcons name={current.icon as never} size={120} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.description}>{current.description}</Text>
          </LinearGradient>
        </View>

        <View style={styles.paginationRow}>
          {SLIDES.map((_, idx) => {
            const active = idx === step;
            return (
              <View
                key={idx}
                style={[styles.paginationDot, active ? styles.paginationDotActive : styles.paginationDotInactive]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.nextButton} activeOpacity={0.9} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{isLast ? "Start" : "Next"}</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
  },
  skipRow: {
    alignItems: "flex-end",
  },
  skipText: {
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
    fontSize: 13,
  },
  carousel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  card: {
    width: width - 56,
    borderRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: "#4FC3F7",
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  cardTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  cardSubtitle: {
    marginTop: 6,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },
  illustrationWrapper: {
    marginTop: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  illustrationBadge: {
    height: 220,
    width: 220,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1AC7B5",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  description: {
    marginTop: 20,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "Roboto_400Regular",
    color: "#475569",
  },
  caption: {
    marginTop: 12,
    fontSize: 12,
    textAlign: "center",
    color: "#A0AEC0",
    fontFamily: "Roboto_400Regular",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    columnGap: 10,
    marginBottom: 24,
  },
  paginationDot: {
    height: 10,
    borderRadius: 999,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: "#1FC7B6",
  },
  paginationDotInactive: {
    width: 10,
    backgroundColor: "rgba(31,199,182,0.25)",
  },
  nextButton: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#1FC7B6",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1FC7B6",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
});

