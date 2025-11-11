import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { Roboto_400Regular, Roboto_500Medium } from "@expo-google-fonts/roboto";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "@/lib/nativewind";
import { StackScreen } from "react-native-screens";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login"/>
        <Stack.Screen name="register"/>
        {/* <Stack.Screen name="index" />
        <Stack.Screen name="preference" />
        <Stack.Screen name="journey" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="module" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="adaptation" />
        <Stack.Screen name="mode-switch" />
        <Stack.Screen name="subject-overview" />
        <Stack.Screen name="behavior" /> */}
      </Stack>
    </SafeAreaProvider>
  );
}
