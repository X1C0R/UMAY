import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getToken as UserToken } from "@/lib/storage";
import { getProfile as GetProfile } from "@/lib/api";

const SUBJECT_ROWS = [
  [{ label: "Mathematics" }, { label: "Science" }],
  [{ label: "History" }, { label: "Notifications" }],
  [{ label: "Language" }, { label: "Help & Support" }],
];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [toggles, setToggles] = useState({
    auto: true,
    visual: true,
    audio: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await UserToken();

        if (!token) {
        console.log("No token found — user is not logged in.");
        return; 
         }
        const profile = await GetProfile(token);
        setUser(profile.user);
      } catch (err: any) {
        console.log("Profile load error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          {/* Avatar */}
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.avatarImg}
            />
          ) : (
            <LinearGradient
              colors={["#1FC7B6", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <MaterialCommunityIcons name="brain" size={72} color="#FFFFFF" />
            </LinearGradient>
          )}

          {/* Name */}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {loading ? "Loading..." : user?.full_name || "Unknown User"}
            </Text>

            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/edit-profile")}>
              <Text style={styles.editProfile}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Preferences</Text>
            <View style={styles.preferenceCard}>
              <View style={styles.preferenceRow}>
                <View style={styles.prefLabelGroup}>
                  <MaterialCommunityIcons name="atom" size={20} color="#1FC7B6" />
                  <Text style={styles.prefLabel}>Auto-adapt content</Text>
                </View>
                <Switch
                  value={toggles.auto}
                  onValueChange={(value) =>
                    setToggles((prev) => ({ ...prev, auto: value }))
                  }
                  trackColor={{ false: "#E2E8F0", true: "#1FC7B6" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.preferenceGrid}>
                <View style={[styles.preferenceColumn, styles.preferenceColumnLeft]}>
                  <View style={styles.prefLabelGroup}>
                    <View style={styles.prefIconLabel}>
                      <MaterialCommunityIcons name="eye-outline" size={20} color="#1FC7B6" />
                      <Text style={styles.prefLabel}>Visual mode priority</Text>
                    </View>
                    <Switch
                      value={toggles.visual}
                      onValueChange={(value) =>
                        setToggles((prev) => ({ ...prev, visual: value }))
                      }
                      trackColor={{ false: "#E2E8F0", true: "#1FC7B6" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.preferenceColumn}>
                  <View style={styles.prefLabelGroup}>
                    <View style={styles.prefIconLabel}>
                      <MaterialCommunityIcons name="headphones" size={20} color="#1FC7B6" />
                      <Text style={styles.prefLabel}>Audio speed 1.5x</Text>
                    </View>
                    <Switch
                      value={toggles.audio}
                      onValueChange={(value) =>
                        setToggles((prev) => ({ ...prev, audio: value }))
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
              {SUBJECT_ROWS.map((row, i) => (
                <View
                  key={i}
                  style={[
                    styles.listGridRow,
                    i < SUBJECT_ROWS.length - 1 && styles.listGridRowDivider,
                  ]}
                >
                  {row.map((item) => (
                    <TouchableOpacity key={item.label} style={styles.listGridItem} activeOpacity={0.85}>
                      <Text style={styles.listLabel}>{item.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.9}>
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
  },
  avatar: {
    alignSelf: "center",
    height: 140,
    width: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    alignSelf: "center",
    height: 140,
    width: 140,
    borderRadius: 70,
  },
  profileInfo: { alignItems: "center", marginTop: 24 },
  name: { fontSize: 26, color: "#0F172A", fontWeight: "600" },
  editProfile: { marginTop: 8, fontSize: 13, color: "#1FC7B6" },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#1E293B", marginBottom: 14 },
  preferenceCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
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
    columnGap: 12,
    flex: 1,
  },
  prefIconLabel: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  prefLabel: {
    fontSize: 15,
    color: "#0F172A",
  },
  preferenceGrid: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  preferenceColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  preferenceColumnLeft: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  listCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  listGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  listGridRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  listGridItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
  },
  listLabel: {
    fontSize: 15,
    color: "#0F172A",
  },
  logoutButton: {
    marginTop: 32,
    backgroundColor: "#FB6A63",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutText: { fontSize: 18, color: "#FFFFFF", fontWeight: "600" },
});
