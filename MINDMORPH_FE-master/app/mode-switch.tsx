import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWindowDimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MODES = [
  { id: "visual", label: "Visual", icon: "eye" },
  { id: "audio", label: "Audio", icon: "headphones" },
  { id: "text", label: "Text", icon: "book-open-variant" },
];

const METRICS = [
  {
    icon: "speedometer",
    label: "Reading Speed",
    value: "125 WPM",
    hint: "+12% vs last session",
  },
  {
    icon: "radar",
    label: "Attention",
    value: "High",
    hint: "Stable focus detected",
  },
  {
    icon: "chart-arc",
    label: "Engagement Score",
    value: "85%",
    hint: "Sustained involvement",
  },
];

export default function ModeSwitchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; mode?: string }>();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  const activeMode = (params.mode ?? "visual").toLowerCase();
  const subjectLabel = params.subject
    ? params.subject.charAt(0).toUpperCase() + params.subject.slice(1)
    : "Mathematics";

  return (
    <LinearGradient colors={["#EEF9FF", "#FDFEFE"]} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Adaptation Overlay</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isCompact && styles.cardCompact]}>
            <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgePrimary]}>
              <Text style={styles.badgePrimaryText}>Adaptive Session</Text>
            </View>
            <View style={[styles.badge, styles.badgeAccent]}>
              <Text style={styles.badgeAccentText}>Switching Mode</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{subjectLabel}</Text>
          <Text style={styles.cardSubtitle}>
            Monitoring live signals to confirm the optimal learning mode for this session.
          </Text>

            <View style={[styles.modeRow, isCompact && styles.modeRowCompact]}>
            {MODES.map((mode) => {
              const isActive = mode.id === activeMode;
              return (
                <View
                  key={mode.id}
                    style={[styles.modeChip, isActive && styles.modeChipActive, isCompact && styles.modeChipCompact]}
                >
                  <MaterialCommunityIcons
                    name={mode.icon as never}
                    size={18}
                    color={isActive ? "#FFFFFF" : "#64748B"}
                  />
                  <Text style={[styles.modeChipLabel, isActive && styles.modeChipLabelActive]}>
                    {mode.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.sessionRow, isCompact && styles.sessionRowCompact]}>
            <View style={[styles.moduleCard, isCompact && styles.moduleCardCompact]}>
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Visual Geometry</Text>
                <View style={styles.moduleBadge}>
                  <Text style={styles.moduleBadgeText}>Adapting to Visual</Text>
                </View>
              </View>
              <View style={styles.diagramPlaceholder}>
                <MaterialCommunityIcons name="triangle-outline" size={84} color="#0EA5E9" />
              </View>
              <Text style={styles.diagramFormula}>α/sin(α) = b·sin(b) = c − y</Text>
            </View>

            <View style={[styles.metricsColumn, isCompact && styles.metricsColumnCompact]}>
              {METRICS.map((metric) => (
                <View
                  key={metric.label}
                  style={[styles.metricCard, isCompact && styles.metricCardCompact]}
                >
                  <View style={styles.metricHeader}>
                    <MaterialCommunityIcons name={metric.icon as never} size={20} color="#0EA5E9" />
                    <View style={styles.metricPulse} />
                  </View>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricHint}>{metric.hint}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.playerCard}>
            <View style={styles.playerControls}>
              <TouchableOpacity style={[styles.playerButton, styles.playerButtonPrimary]}>
                <MaterialCommunityIcons name="play" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playerButton}>
                <MaterialCommunityIcons name="skip-backward" size={20} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playerButton}>
                <MaterialCommunityIcons name="skip-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
              <View style={styles.playerSpeed}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#0F172A" />
                <Text style={styles.playerSpeedLabel}>1.0x</Text>
              </View>
              <TouchableOpacity style={styles.playerButton}>
                <MaterialCommunityIcons name="bookmark-outline" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.confidenceCard}>
            <View>
              <Text style={styles.confidenceLabel}>Adaptation Confidence</Text>
              <Text style={styles.confidenceValue}>78%</Text>
            </View>
            <View style={styles.confidenceMeter}>
              <View style={styles.confidenceMeterFill} />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() =>
              router.push({ pathname: "/module", params: { subject: params.subject ?? "math" } })
            }
          >
            <Text style={styles.primaryButtonLabel}>Continue to Updated Content</Text>
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
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  backButton: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  backButtonPlaceholder: {
    height: 44,
    width: 44,
  },
  card: {
    marginTop: 18,
    flex: 1,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    padding: 28,
    shadowColor: "#BAE6FD",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  cardCompact: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContentCompact: {
    paddingBottom: 48,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgePrimary: {
    backgroundColor: "#DCF3FF",
  },
  badgeAccent: {
    backgroundColor: "#D1FAE5",
  },
  badgePrimaryText: {
    fontSize: 11,
    fontFamily: "Roboto_500Medium",
    color: "#0284C7",
  },
  badgeAccentText: {
    fontSize: 11,
    fontFamily: "Roboto_500Medium",
    color: "#047857",
  },
  cardTitle: {
    marginTop: 22,
    fontSize: 26,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  modeRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    padding: 6,
  },
  modeRowCompact: {
    flexWrap: "wrap",
    rowGap: 8,
    justifyContent: "center",
  },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  modeChipCompact: {
    minWidth: "28%",
  },
  modeChipActive: {
    backgroundColor: "#0EA5E9",
    shadowColor: "#0284C7",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modeChipLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    color: "#64748B",
  },
  modeChipLabelActive: {
    color: "#FFFFFF",
  },
  sessionRow: {
    marginTop: 28,
    flexDirection: "row",
  },
  sessionRowCompact: {
    flexDirection: "column",
  },
  moduleCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 22,
    backgroundColor: "#FFFFFF",
  },
  moduleCardCompact: {
    marginRight: 0,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moduleTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  moduleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#CCFBF1",
  },
  moduleBadgeText: {
    fontSize: 11,
    fontFamily: "Roboto_500Medium",
    color: "#0F766E",
  },
  diagramPlaceholder: {
    marginTop: 22,
    height: 180,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#99F6E4",
    borderStyle: "dashed",
    backgroundColor: "#ECFEFF",
    justifyContent: "center",
    alignItems: "center",
  },
  diagramFormula: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Roboto_400Regular",
    color: "#334155",
  },
  metricsColumn: {
    marginLeft: 18,
    width: 128,
    justifyContent: "space-between",
  },
  metricsColumnCompact: {
    marginLeft: 0,
    marginTop: 18,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#E0F2FE",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    marginBottom: 14,
  },
  metricCardCompact: {
    width: "48%",
    marginBottom: 14,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricPulse: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  metricLabel: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Roboto_400Regular",
    color: "#6B7280",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  metricHint: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  playerCard: {
    marginTop: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerButton: {
    height: 46,
    width: 46,
    borderRadius: 23,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  playerButtonPrimary: {
    backgroundColor: "#0EA5E9",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  playerSpeed: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  playerSpeedLabel: {
    fontSize: 14,
    fontFamily: "Roboto_500Medium",
    color: "#0F172A",
  },
  progressTrack: {
    marginTop: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    width: "65%",
    height: "100%",
    backgroundColor: "#0EA5E9",
  },
  confidenceCard: {
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceLabel: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#64748B",
  },
  confidenceValue: {
    marginTop: 6,
    fontSize: 28,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  confidenceMeter: {
    height: 60,
    width: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  confidenceMeterFill: {
    flex: 1,
    backgroundColor: "#22C55E",
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: "#10B981",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
});

