import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const cards = [
  {
    id: "math",
    title: "MATHEMATICS - VISUAL MODE",
    colors: ["#1E3A8A", "#38BDF8"],
    icon: "chart-line",
    stats: [
      { label: "Engagement", value: "92%" },
      { label: "Solved", value: "15%" },
      { label: "Time Spent", value: "45 min" },
    ],
  },
  {
    id: "history",
    title: "HISTORY - AUDIO MODE",
    colors: ["#F97316", "#FB7185"],
    icon: "headphones",
    stats: [
      { label: "Engagement", value: "88%" },
      { label: "Listened", value: "8%" },
      { label: "Time Spent", value: "60 min" },
    ],
  },
];

export default function AdaptationScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mt-8 text-center text-2xl font-montserrat-semibold text-white">
          Subject-Specific Adaptation
        </Text>

        <View className="mt-8 space-y-6">
          {cards.map((card) => (
            <LinearGradient
              key={card.id}
              className="rounded-3xl p-6 shadow-lg"
              colors={card.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-montserrat-medium text-white/70">
                    {card.title}
                  </Text>
                  <Text className="mt-4 text-lg font-montserrat-semibold text-white">
                    Visual Mode Insights
                  </Text>
                  <Text className="mt-2 text-sm font-roboto text-white/80">
                    Adaptive modules focus on concepts that match the strongest retention style.
                  </Text>
                </View>
                <View className="ml-3 h-16 w-16 items-center justify-center rounded-full bg-white/20">
                  <MaterialCommunityIcons name={card.icon as never} size={32} color="#ffffff" />
                </View>
              </View>

              <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-white/15 p-4">
                {card.stats.map((stat) => (
                  <View key={stat.label} className="items-center justify-center">
                    <Text className="text-base font-montserrat-semibold text-white">
                      {stat.value}
                    </Text>
                    <Text className="mt-1 text-[11px] font-roboto text-white/70">
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

