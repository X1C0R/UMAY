import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Polyline } from "react-native-svg";

const LINE_POINTS = "0,60 30,55 45,40 65,52 85,35 105,48 125,30 145,38 165,24";

const SUBJECT_PERFORMANCE = [
  { label: "Mathematics", percent: 78, color: "#38BDF8" },
  { label: "History", percent: 92, color: "#A855F7" },
  { label: "Language", percent: 88, color: "#F97316" },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; subject?: string }>();
  const subjectLabel = params.subject
    ? params.subject.charAt(0).toUpperCase() + params.subject.slice(1)
    : undefined;

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
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.monthPill}>
              <Ionicons name="chevron-back" size={16} color="#0F172A" />
              <Text style={styles.monthLabel}>October 2023</Text>
              <Ionicons name="chevron-forward" size={16} color="#0F172A" />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Learning Insights</Text>
            {params.origin === "quiz" && subjectLabel ? (
              <Text style={styles.headerSubtitle}>
                Quiz results for {subjectLabel} synced. Adaptive recommendations updated.
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Learning Style Evolution</Text>
            <View style={styles.chartWrapper}>
              <Svg height="160" width="100%">
                <Polyline
                  points={LINE_POINTS}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Polyline
                  points="0,90 30,75 60,95 90,55 120,65 150,45"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Polyline
                  points="0,110 30,85 60,70 90,95 120,80 150,60"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.legendRow}>
              {[
                { label: "Visual", color: "#38BDF8" },
                { label: "Audio", color: "#F97316" },
                { label: "Text", color: "#A855F7" },
              ].map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subject Performance</Text>
            <View style={styles.performanceBarWrapper}>
              <View style={styles.overallBar}>
                <View style={styles.overallFill} />
                <View style={styles.overallPercentBadge}>
                  <Text style={styles.overallPercentText}>85%</Text>
                </View>
              </View>
            </View>
            {SUBJECT_PERFORMANCE.map((item) => (
              <View key={item.label} style={styles.subjectRow}>
                <Text style={styles.subjectLabel}>{item.label}</Text>
                <View style={styles.subjectBar}>
                  <View style={[styles.subjectFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={styles.subjectPercent}>{item.percent}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Engagement Patterns</Text>
            <View style={styles.heatmap}>
              {[...Array(56).keys()].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: `rgba(251, 146, 60, ${
                        0.25 + ((index % 7) + 2) / 12
                      })`,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.heatmapLabels}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <Text key={day} style={styles.heatmapLabel}>
                  {day}
                </Text>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryCta}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/behavior",
                params: { subject: params.subject ?? "math" },
              })
            }
          >
            <Text style={styles.secondaryCtaText}>View Behavior Tracking Details</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>Last update • 10:30 AM, Oct 26, 2023</Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  backButton: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    columnGap: 14,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  header: {
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  chartWrapper: {
    marginTop: 18,
  },
  legendRow: {
    flexDirection: "row",
    columnGap: 16,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  legendDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: "Roboto_500Medium",
    color: "#64748B",
  },
  performanceBarWrapper: {
    marginTop: 20,
    marginBottom: 12,
  },
  overallBar: {
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    position: "relative",
  },
  overallFill: {
    height: "100%",
    width: "85%",
    borderRadius: 9,
    backgroundColor: "#22C55E",
  },
  overallPercentBadge: {
    position: "absolute",
    right: 6,
    top: -20,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overallPercentText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "Roboto_500Medium",
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    columnGap: 12,
  },
  subjectLabel: {
    width: 110,
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#0F172A",
  },
  subjectBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  subjectFill: {
    height: "100%",
    borderRadius: 6,
  },
  subjectPercent: {
    width: 40,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#0F172A",
  },
  heatmap: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 6,
    columnGap: 6,
    marginTop: 18,
  },
  heatCell: {
    height: 16,
    width: 16,
    borderRadius: 4,
  },
  heatmapLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  heatmapLabel: {
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  footerNote: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  secondaryCta: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  secondaryCtaText: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
});
