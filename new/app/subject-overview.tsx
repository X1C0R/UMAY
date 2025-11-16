import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SUBJECT_LOOKUP, SubjectMode } from "@/constants/subjects";

const MODE_CONTENT: Record<
  SubjectMode,
  { label: string; description: string; icon: string; gradient: [string, string] }
> = {
  visual: {
    label: "Visual Mode",
    description: "Interactive diagrams, spatial breakdowns, and short visual explainers.",
    icon: "eye-circle",
    gradient: ["#06B6D4", "#3B82F6"],
  },
  audio: {
    label: "Audio Mode",
    description: "Narrated walkthroughs, focus playlists, and key concept recaps.",
    icon: "headphones",
    gradient: ["#F97316", "#F43F5E"],
  },
  text: {
    label: "Text Mode",
    description: "Guided notes, memory prompts, and concise theory summaries.",
    icon: "book-open-variant",
    gradient: ["#A855F7", "#6366F1"],
  },
};

export default function SubjectOverviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();
  const subject = params.subject ? SUBJECT_LOOKUP[params.subject] : undefined;

  const recommendedModes = useMemo(() => {
    if (!subject) return [];
    return subject.recommendedModes.map((mode) => MODE_CONTENT[mode]);
  }, [subject]);

  if (!subject) {
    return (
      <SafeAreaView style={styles.fallback}>
        <ActivityIndicator color="#0F172A" size="large" />
        <Text style={styles.fallbackText}>Loading subject overview…</Text>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient
      colors={["#F4F8FF", "#FFFFFF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View>
              <Text style={styles.subtitle}>Learning Path</Text>
              <Text style={styles.title}>{subject.title}</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>{subject.progress}%</Text>
            </View>
          </View>

          <LinearGradient
            colors={["#FFFFFF", "#F8FBFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryIconWrapper}>
              <MaterialCommunityIcons name={subject.icon as never} size={36} color="#1FC7B6" />
            </View>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryLabel}>Today's Focus</Text>
              <Text style={styles.summaryDescription}>{subject.summary}</Text>
              <View style={styles.quizPill}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#0F172A" />
                <Text style={styles.quizPillText}>Next quiz: {subject.nextQuiz}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Modes</Text>
            <Text style={styles.sectionSubtitle}>Tap a mode to preview the experience</Text>
          </View>

          <View style={styles.modeRow}>
            {recommendedModes.map((mode) => (
              <LinearGradient
                key={mode.label}
                colors={mode.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeCard}
              >
                <View style={styles.modeIconWrapper}>
                  <MaterialCommunityIcons name={mode.icon as never} size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.modeLabel}>{mode.label}</Text>
                <Text style={styles.modeDescription}>{mode.description}</Text>
              </LinearGradient>
            ))}
          </View>

          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Session Timeline</Text>
            <View style={styles.timelineSteps}>
              {[
                {
                  label: "Warm-up",
                  detail: "2 min adaptive recall quiz",
                  icon: "timer-sand",
                },
                {
                  label: "Primary Mode",
                  detail: "Visual immersion module",
                  icon: "animation-play",
                },
                {
                  label: "Adaptation Trigger",
                  detail: "Monitors focus after 3 min",
                  icon: "radar",
                },
              ].map((step) => (
                <View key={step.label} style={styles.timelineItem}>
                  <View style={styles.timelineIcon}>
                    <MaterialCommunityIcons name={step.icon as never} size={22} color="#1FC7B6" />
                  </View>
                  <View style={styles.timelineText}>
                    <Text style={styles.timelineLabel}>{step.label}</Text>
                    <Text style={styles.timelineDetail}>{step.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryCta}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/mode-switch",
                params: { subject: subject.id, mode: recommendedModes[0]?.label ?? "Visual" },
              })
            }
          >
            <Text style={styles.primaryCtaText}>Start Session</Text>
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
    paddingBottom: 36,
    rowGap: 22,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  fallbackText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 16,
  },
  backButton: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#1FC7B6",
  },
  title: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  progressBadge: {
    marginLeft: "auto",
    alignItems: "flex-end",
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  progressValue: {
    marginTop: 4,
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  summaryCard: {
    borderRadius: 32,
    padding: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 18,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  summaryIconWrapper: {
    height: 64,
    width: 64,
    borderRadius: 20,
    backgroundColor: "rgba(31,199,182,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryBody: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#1FC7B6",
  },
  summaryDescription: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Roboto_400Regular",
    color: "#475569",
  },
  quizPill: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.05)",
  },
  quizPillText: {
    fontSize: 12,
    fontFamily: "Roboto_500Medium",
    color: "#0F172A",
  },
  sectionHeader: {
    rowGap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  modeCard: {
    width: "48%",
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: "#38BDF8",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  modeIconWrapper: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modeLabel: {
    marginTop: 14,
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  modeDescription: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Roboto_400Regular",
    color: "rgba(255,255,255,0.85)",
  },
  timelineCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    padding: 24,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  timelineSteps: {
    marginTop: 18,
    rowGap: 16,
  },
  timelineItem: {
    flexDirection: "row",
    columnGap: 14,
    alignItems: "center",
  },
  timelineIcon: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "rgba(31,199,182,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineText: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  timelineDetail: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  primaryCta: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#1FC7B6",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1FC7B6",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  primaryCtaText: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
});



