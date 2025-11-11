import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const SUBJECT_ROWS = [
  [{ label: "Mathematics" }, { label: "Science" }],
  [{ label: "History" }, { label: "Notifications" }],
  [{ label: "Language" }, { label: "Help & Support" }],
];

type UserProfile = {
  email: string;
  full_name?: string;
  avatar_url?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggles, setToggles] = useState({
    auto: true,
    visual: true,
    audio: true,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        console.log("Stored token:", token);

        if (!token) {
          router.replace("/login");
          return;
        }

        const res = await fetch("http://192.168.100.5:4000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        console.log("Profile response:", data);

        if (!res.ok || !data.user) {
          router.replace("/login");
          return;
        }

        setProfile(data.user);
      } catch (err) {
        console.error("Profile fetch error:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.background,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#1FC7B6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={[
          styles.background,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#1FC7B6" }}>No profile data found.</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#F7FBFF", "#FFFFFF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          {/* Avatar */}
          <LinearGradient
            colors={["#1FC7B6", "#6366F1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 140, height: 140, borderRadius: 70 }}
              />
            ) : (
              <MaterialCommunityIcons name="brain" size={72} color="#FFFFFF" />
            )}
          </LinearGradient>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {profile.full_name || "Unnamed User"}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/edit")}
            >
              <Text style={styles.editProfile}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Learning Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Preferences</Text>
            <View style={styles.preferenceCard}>
              <View style={styles.preferenceRow}>
                <View style={styles.prefLabelGroup}>
                  <MaterialCommunityIcons
                    name="atom"
                    size={20}
                    color="#1FC7B6"
                  />
                  <Text style={styles.prefLabel}>Auto-adapt content</Text>
                </View>
                <Switch
                  value={toggles.auto}
                  onValueChange={(value) =>
                    setToggles((p) => ({ ...p, auto: value }))
                  }
                  trackColor={{ false: "#E2E8F0", true: "#1FC7B6" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.preferenceGrid}>
                <View
                  style={[styles.preferenceColumn, styles.preferenceColumnLeft]}
                >
                  <View style={styles.prefLabelGroup}>
                    <View style={styles.prefIconLabel}>
                      <MaterialCommunityIcons
                        name="eye-outline"
                        size={20}
                        color="#1FC7B6"
                      />
                      <Text style={styles.prefLabel}>Visual mode priority</Text>
                    </View>
                    <Switch
                      value={toggles.visual}
                      onValueChange={(value) =>
                        setToggles((p) => ({ ...p, visual: value }))
                      }
                      trackColor={{ false: "#E2E8F0", true: "#1FC7B6" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.preferenceColumn}>
                  <View style={styles.prefLabelGroup}>
                    <View style={styles.prefIconLabel}>
                      <MaterialCommunityIcons
                        name="headphones"
                        size={20}
                        color="#1FC7B6"
                      />
                      <Text style={styles.prefLabel}>Audio speed 1.5x</Text>
                    </View>
                    <Switch
                      value={toggles.audio}
                      onValueChange={(value) =>
                        setToggles((p) => ({ ...p, audio: value }))
                      }
                      trackColor={{ false: "#E2E8F0", true: "#1FC7B6" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Subjects */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subjects</Text>
            <View style={styles.listCard}>
              {SUBJECT_ROWS.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[
                    styles.listGridRow,
                    rowIndex < SUBJECT_ROWS.length - 1 &&
                      styles.listGridRowDivider,
                  ]}
                >
                  {row.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.listGridItem}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.listLabel}>{item.label}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#CBD5E1"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.listCard}>
              <View style={styles.metaRow}>
                <Text style={styles.listLabel}>App version</Text>
                <Text style={styles.metaValue}>1.2.5</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.listLabel}>Terms</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </View>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.9}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    rowGap: 24,
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
  avatar: {
    alignSelf: "center",
    height: 140,
    width: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  profileInfo: { alignItems: "center", marginTop: 24 },
  name: { fontSize: 26, fontWeight: "600", color: "#0F172A" },
  editProfile: { marginTop: 8, fontSize: 13, color: "#1FC7B6" },
  section: { marginTop: 28 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 14,
  },
  preferenceCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  prefLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 12,
    flex: 1,
  },
  prefIconLabel: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  prefLabel: { fontSize: 15, color: "#0F172A", flexShrink: 1 },
  preferenceGrid: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    flexDirection: "column",
  },
  preferenceColumn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  preferenceColumnLeft: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  listCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#CBD5F5",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  listGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    columnGap: 8,
    paddingVertical: 8,
  },
  listGridRowDivider: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  listGridItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  listLabel: { fontSize: 15, color: "#0F172A" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  metaValue: { fontSize: 15, color: "#64748B" },
  logoutButton: {
    marginTop: 32,
    alignSelf: "center",
    width: "100%",
    backgroundColor: "#FB6A63",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#FB6A63",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logoutText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
});
