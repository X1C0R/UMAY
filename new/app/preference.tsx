import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const PREFERENCE_CARDS = [
  {
    id: "visual",
    title: "Visual",
    description: "Learn through images & diagrams",
    borderColor: "#3BA7FF",
    iconColor: "#1F8BFF",
    icon: "eye-outline" as const,
  },
  {
    id: "audio",
    title: "Audio",
    description: "Absorb knowledge through listening",
    borderColor: "#FF7A53",
    iconColor: "#F97316",
    icon: "headphones" as const,
  },
  {
    id: "text",
    title: "Text",
    description: "Read articles & summaries",
    borderColor: "#F9B436",
    iconColor: "#F59E0B",
    icon: "book-open-variant" as const,
  },
];

export default function PreferenceScreen() {
  const [selected, setSelected] = useState("visual");
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#F5FBFF", "#FFFFFF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Starting Preference</Text>
        </View>

        <View style={styles.cards}>
          {PREFERENCE_CARDS.map((card) => {
            const isActive = card.id === selected;
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.card,
                  { borderColor: isActive ? card.borderColor : "#E2E8F0" },
                  isActive && { shadowColor: card.borderColor },
                ]}
                activeOpacity={0.9}
                onPress={() => setSelected(card.id)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${card.iconColor}15` }]}>
                  <MaterialCommunityIcons name={card.icon} size={32} color={card.iconColor} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() => router.push("/journey")}
        >
          <Text style={styles.ctaText}>Start Learning</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  cards: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconWrapper: {
    height: 56,
    width: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0F172A",
  },
  cardDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Roboto_400Regular",
    color: "#64748B",
  },
  cta: {
    marginTop: "auto",
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#1FC7B6",
    paddingVertical: 16,
    shadowColor: "#1FC7B6",
    shadowOpacity: 0.3,
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

