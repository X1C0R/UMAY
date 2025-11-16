import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#C6E9FF", "#F7FBFF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={["#21E4B9", "#1890FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconHolder}
            >
              <MaterialCommunityIcons name="brain" size={120} color="#FFFFFF" />
            </LinearGradient>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Welcome to MindMorph</Text>
          <Text style={styles.subtitle}>Your learning style evolves with you</Text>
        </View>

        <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={() => router.push("/register")}>
          <Text style={styles.ctaText}>Get Started</Text>
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
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
    justifyContent: "space-between",
  },
  cardContainer: {
    alignItems: "center",
  },
  heroCard: {
    width: "100%",
    height: 280,
    borderRadius: 40,
    paddingVertical: 32,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1890FF",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  iconHolder: {
    height: 200,
    width: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    shadowColor: "#21E4B9",
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  content: {
    alignItems: "center",
    marginTop: 24,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    fontFamily: "Montserrat_700Bold",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "Roboto_400Regular",
    color: "#475569",
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 16,
    backgroundColor: "#17C9B5",
    shadowColor: "#17C9B5",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  ctaText: {
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
});

