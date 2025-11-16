import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const BEHAVIOR_STATS = [
  {
    label: "Focus Variability",
    value: "Stable",
    detail: "Attention dips after 3m 20s of visual content.",
    icon: "chart-bell-curve",
    accent: ["#38BDF8", "#0EA5E9"],
  },
  {
    label: "Micro-break Pattern",
    value: "Every 9 min",
    detail: "Short pauses improve retention by 14%.",
    icon: "meditation",
    accent: ["#22C55E", "#16A34A"],
  },
  {
    label: "Preferred Time",
    value: "7:00 PM",
    detail: "Highest engagement and quiz accuracy.",
    icon: "clock-check-outline",
    accent: ["#F97316", "#F43F5E"],
  },
];

const ATTENTION_TIMELINE = [
  { label: "Warm-up", score: "High", icon: "fire" },
  { label: "Core Concept", score: "Medium", icon: "target" },
  { label: "Practice", score: "High", icon: "pencil-ruler" },
  { label: "Reflection", score: "Medium", icon: "comment-processing-outline" },
];

export default function BehaviorTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();
  const subjectLabel = params.subject
    ? params.subject.charAt(0).toUpperCase() + params.subject.slice(1)
    : "Learning";

  return (
    <LinearGradient
      colors={["#0F172A", "#1E293B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.title}>Behavior Tracking</Text>
          <Text style={styles.subtitle}>
            Session signals that informed MindMorph’s adaptation for {subjectLabel}.
          </Text>

          <View style={styles.cardsContainer}>
            {BEHAVIOR_STATS.map((stat) => (
              <LinearGradient
                key={stat.label}
                colors={stat.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.behaviorCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconBadge}>
                    <MaterialCommunityIcons name={stat.icon as never} size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.cardLabel}>{stat.label}</Text>
                    <Text style={styles.cardValue}>{stat.value}</Text>
                  </View>
                </View>
                <Text style={styles.cardDetail}>{stat.detail}</Text>
              </LinearGradient>
            ))}
          </View>

          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Attention Timeline</Text>
            <Text style={styles.timelineSubtitle}>
              Real-time peaks used to trigger content adaptation.
            </Text>
            <View style={styles.timelineSteps}>
              {ATTENTION_TIMELINE.map((step, index) => (
                <View key={step.label} style={styles.timelineRow}>
                  <View style={styles.timelineNumber}>
                    <Text style={styles.timelineNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineIconBadge}>
                      <MaterialCommunityIcons name={step.icon as never} size={20} color="#0F172A" />
                    </View>
                    <View style={styles.timelineText}>
                      <Text style={styles.timelineLabel}>{step.label}</Text>
                      <Text style={styles.timelineDetail}>{step.score} engagement signal</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/insights",
                params: { subject: params.subject ?? "math" },
              })
            }
          >
            <Text style={styles.ctaText}>View Subject-Specific Insights</Text>
          </TouchableOpacity>
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
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    rowGap: 22,
  },
  backButton: {
    height: 48,
    width: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  title: {
    marginTop: 6,
    fontSize: 28,
    fontFamily: "Montserrat_600SemiBold",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Roboto_400Regular",
    color: "rgba(248,250,252,0.7)",
  },
  cardsContainer: {
    rowGap: 18,
  },
  behaviorCard: {
    borderRadius: 28,
    padding: 22,
    shadowColor: "rgba(14,165,233,0.4)",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 14,
  },
  iconBadge: {
    height: 52,
    width: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  cardValue: {
    marginTop: 6,
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  cardDetail: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Roboto_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  timelineCard: {
    borderRadius: 28,
    backgroundColor: "rgba(15,23,42,0.65)",
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
  },
  timelineTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#E2E8F0",
  },
  timelineSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Roboto_400Regular",
    color: "rgba(226,232,240,0.7)",
  },
  timelineSteps: {
    marginTop: 22,
    rowGap: 18,
  },
  timelineRow: {
    flexDirection: "row",
    columnGap: 16,
  },
  timelineNumber: {
    height: 40,
    width: 40,
    borderRadius: 14,
    backgroundColor: "rgba(14,165,233,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineNumberText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#38BDF8",
  },
  timelineContent: {
    flex: 1,
    flexDirection: "row",
    columnGap: 14,
    alignItems: "center",
  },
  timelineIconBadge: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "rgba(226,232,240,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineText: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#E2E8F0",
  },
  timelineDetail: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
    color: "rgba(226,232,240,0.7)",
  },
  cta: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#22D3EE",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(34,211,238,0.35)",
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
});



