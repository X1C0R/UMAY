import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Polyline } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function InsightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();
  const subjectLabel = params.subject
    ? params.subject.charAt(0).toUpperCase() + params.subject.slice(1)
    : "Learning";

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-8 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color="#0F172A" />
          </TouchableOpacity>
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
              <Ionicons name="chevron-back" size={18} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-base font-montserrat-medium text-slate-700">October 2023</Text>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
              <Ionicons name="chevron-forward" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Ionicons name="share-outline" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <Text className="mt-8 text-2xl font-montserrat-semibold text-slate-800">
          {subjectLabel} Insights
        </Text>
        <Text className="mt-1 text-sm font-roboto text-orange-500">
          Attention drops detected midway through algebra practice. Visual prompts recommended.
        </Text>

        <View className="mt-6 space-y-6">
          <View className="rounded-3xl bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-montserrat-medium text-slate-700">
                Learning Style Evolution
              </Text>
              <View className="rounded-full bg-orange-100 px-3 py-1">
                <Text className="text-xs font-roboto text-orange-500">Attention Drop</Text>
              </View>
            </View>
            <Svg height="160" width="100%" style={{ marginTop: 16 }}>
              <Polyline
                points="0,110 40,90 80,120 120,70 160,80 200,60 240,75 280,55"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <Polyline
                points="0,60 40,70 80,50 120,80 160,45 200,75 240,55 280,40"
                stroke="#F97316"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <Polyline
                points="0,80 40,60 80,75 120,65 160,85 200,90 240,70 280,85"
                stroke="#22C55E"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
            <View className="mt-3 flex-row justify-between">
              {["Week 1", "Week 2", "Week 3", "Week 4"].map((week) => (
                <Text key={week} className="text-[11px] font-roboto text-slate-400">
                  {week}
                </Text>
              ))}
            </View>
            <View className="mt-4 flex-row flex-wrap gap-4">
              {[
                { label: "Visual", color: "bg-blue-500" },
                { label: "Audio", color: "bg-orange-400" },
                { label: "Text", color: "bg-emerald-400" },
              ].map((item) => (
                <View key={item.label} className="flex-row items-center space-x-2">
                  <View className={`h-3 w-3 rounded-full ${item.color}`} />
                  <Text className="text-xs font-roboto text-slate-500">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="rounded-3xl bg-white p-5 shadow-sm">
            <Text className="text-base font-montserrat-medium text-slate-700">
              Subject Performance
            </Text>
            <View className="mt-5 space-y-4">
              {[
                { label: "Mathematics", value: 78, color: "#38BDF8" },
                { label: "History", value: 92, color: "#A855F7" },
                { label: "Language", value: 88, color: "#F97316" },
              ].map((item) => (
                <View key={item.label}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-roboto text-slate-600">{item.label}</Text>
                    <Text className="text-sm font-montserrat-medium text-slate-700">
                      {item.value}%
                    </Text>
                  </View>
                  <View className="mt-2 h-3 w-full rounded-full bg-slate-200">
                    <View
                      className="h-3 rounded-full"
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="rounded-3xl bg-white p-5 shadow-sm">
            <Text className="text-base font-montserrat-medium text-slate-700">
              Engagement Patterns
            </Text>
            <View className="mt-4 flex-row flex-wrap">
              {[...Array(42).keys()].map((index) => (
                <View
                  key={index}
                  className="m-1 h-6 w-6 rounded-lg"
                  style={{
                    backgroundColor: `rgba(249, 115, 22, ${0.2 + ((index % 6) + 1) / 10})`,
                  }}
                />
              ))}
            </View>
            <View className="mt-3 flex-row justify-between">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <Text key={day} className="text-[11px] font-roboto text-slate-400">
                  {day}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

