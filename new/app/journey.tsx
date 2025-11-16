import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SUBJECTS } from "@/constants/subjects";

export default function JourneyScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#F5F9FF", "#FFFFFF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>Hello, Alex</Text>
            <Text style={styles.title}>Your Learning Journey</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={() => router.push("/analytics")}>
              <MaterialIcons name="notifications-none" size={22} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton} onPress={() => router.push("/profile")}>
              <MaterialIcons name="person-outline" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        >
          {SUBJECTS.map((subject) => (
            <LinearGradient
              key={subject.id}
              colors={subject.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardIconWrapper}>
                <MaterialCommunityIcons name={subject.icon as never} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>{subject.title}</Text>
              <View style={styles.progressWrapper}>
                <View style={styles.progressOuter}>
                  <View style={styles.progressInner}>
                    <Text style={styles.progressValue}>{subject.progress}%</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cardButton}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({ pathname: "/subject-overview", params: { subject: subject.id } })
                }
              >
                <Text style={styles.cardButtonText}>Continue</Text>
              </TouchableOpacity>
            </LinearGradient>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/journey")}>
          <View style={[styles.tabIconWrapper, styles.tabIconWrapperActive]}>
            <MaterialCommunityIcons name="home-variant-outline" size={22} color="#1FC7B6" />
          </View>
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/analytics")}>
          <View style={styles.tabIconWrapper}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#94A3B8" />
          </View>
          <Text style={styles.tabLabel}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/profile")}>
          <View style={styles.tabIconWrapper}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color="#94A3B8" />
          </View>
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    rowGap: 16,
  },
  headerInfo: {
    flexShrink: 1,
  },
  greeting: {
    fontSize: 16,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  title: {
    marginTop: 4,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  headerActions: {
    flexDirection: "row",
    columnGap: 12,
    flexShrink: 0,
  },
  headerActionButton: {
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
    elevation: 6,
  },
  cardsContainer: {
    paddingTop: 24,
    paddingBottom: 120,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  card: {
    width: "48%",
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: "#1FC7B6",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardIconWrapper: {
    height: 46,
    width: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  progressWrapper: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  progressOuter: {
    height: 70,
    width: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressInner: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressValue: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  cardButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  cardButtonText: {
    fontSize: 13,
    fontFamily: "Roboto_500Medium",
    color: "#0F172A",
  },
  tabBar: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 14,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tabItem: {
    alignItems: "center",
    rowGap: 6,
  },
  tabIconWrapper: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconWrapperActive: {
    backgroundColor: "rgba(31,199,182,0.15)",
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: "Roboto_400Regular",
    color: "#94A3B8",
  },
  tabLabelActive: {
    color: "#1FC7B6",
    fontFamily: "Roboto_500Medium",
  },
});
