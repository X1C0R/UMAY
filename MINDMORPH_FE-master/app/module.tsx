import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const modes = [
  { id: "visual", label: "Visual" },
  { id: "audio", label: "Audio" },
  { id: "text", label: "Text" },
];

export default function ModuleScreen() {
  const [mode, setMode] = useState("visual");
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();
  const subjectLabel = params.subject
    ? params.subject.charAt(0).toUpperCase() + params.subject.slice(1)
    : "Adaptive Learning";

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-2xl font-montserrat-semibold text-slate-800">
            {subjectLabel} Session
          </Text>
          <View className="rounded-full bg-teal-100 px-3 py-1">
            <Text className="text-xs font-roboto text-teal-600">Adapting to {mode} mode</Text>
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-between rounded-full bg-white p-2 shadow-sm">
          {modes.map((item) => {
            const isActive = item.id === mode;
            return (
              <TouchableOpacity
                key={item.id}
                className={`flex-1 items-center rounded-full px-4 py-3 ${
                  isActive ? "bg-teal-500 shadow-md shadow-teal-200" : ""
                }`}
                onPress={() => setMode(item.id)}
                activeOpacity={0.85}
              >
                <Text
                  className={`text-sm font-montserrat-medium ${
                    isActive ? "text-white" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <LinearGradient
          className="mt-8 rounded-3xl p-6 shadow-lg"
          colors={["#E0F7FA", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="rounded-2xl border border-teal-200 bg-white p-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-lg font-montserrat-semibold text-slate-700">
                Geometry Session
              </Text>
              <View className="rounded-full bg-teal-100 px-3 py-1">
                <Text className="text-xs font-roboto text-teal-600">Visual Mode</Text>
              </View>
            </View>
            <View className="h-40 items-center justify-center rounded-2xl border border-dashed border-teal-300 bg-teal-50">
              <MaterialCommunityIcons name="triangle-outline" size={72} color="#0EA5E9" />
            </View>
            <Text className="mt-4 text-center text-base font-roboto text-slate-600">
              α/sin(α) = b·sin(b) = c - y
            </Text>
          </View>

          <View className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <Text className="text-base font-montserrat-semibold text-slate-700">
              Performance Indicators
            </Text>
            <View className="mt-4 flex-row justify-between">
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-teal-400 bg-teal-50">
                  <Text className="text-lg font-montserrat-semibold text-teal-600">125</Text>
                  <Text className="text-[11px] font-roboto text-teal-500">WPM</Text>
                </View>
                <Text className="mt-2 text-xs font-roboto text-slate-500">Reading Speed</Text>
              </View>
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-400 bg-emerald-50">
                  <Text className="text-lg font-montserrat-semibold text-emerald-600">High</Text>
                </View>
                <Text className="mt-2 text-xs font-roboto text-slate-500">Attention</Text>
              </View>
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-sky-400 bg-sky-50">
                  <Text className="text-lg font-montserrat-semibold text-sky-600">85%</Text>
                </View>
                <Text className="mt-2 text-xs font-roboto text-slate-500">Engagement</Text>
              </View>
            </View>

            <View className="mt-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-roboto text-slate-500">Playback</Text>
                <Text className="text-sm font-roboto text-slate-700">1.0x</Text>
              </View>
              <View className="mt-3 h-1.5 rounded-full bg-slate-200">
                <View className="h-1.5 w-2/3 rounded-full bg-teal-500" />
              </View>
              <View className="mt-4 flex-row items-center justify-between">
                <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                  <MaterialCommunityIcons name="play" size={22} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                  <MaterialCommunityIcons name="skip-previous" size={22} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                  <MaterialCommunityIcons name="skip-next" size={22} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-teal-500">
                  <MaterialCommunityIcons name="bookmark-outline" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          className="mt-8 rounded-full bg-teal-500 py-4 shadow-md shadow-teal-200"
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/analytics",
              params: { origin: "quiz", subject: params.subject ?? "math" },
            })
          }
        >
          <Text className="text-center text-base font-montserrat-semibold text-white">
            Complete Quiz & View Analytics
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

