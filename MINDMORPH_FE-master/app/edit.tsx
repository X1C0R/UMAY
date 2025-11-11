import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function EditProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // Pick an image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const selected = result.assets[0];
        setAvatar(selected.uri);
      }
    } catch (error) {
      console.error("Image pick error:", error);
    }
  };

  // Upload profile changes
  const handleSave = async () => {
    if (!fullName && !avatar) {
      Alert.alert("Nothing to update", "Please provide a name or image.");
      return;
    }

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Not logged in", "Please log in again.");
        router.replace("/login");
        return;
      }

      const formData = new FormData();
      formData.append("full_name", fullName);

      if (avatar) {
        const fileExt = avatar.split(".").pop() || "jpg";
        formData.append("avatar", {
          uri: avatar,
          name: `avatar.${fileExt}`,
          type: `image/${fileExt}`,
        } as any);
      }

      const response = await fetch("http://192.168.100.5:4000/edit", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          // ❗️DO NOT manually set Content-Type for FormData
        },
        body: formData,
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      Alert.alert("Success", "Profile updated successfully!");
      router.replace("/profile");
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <Text style={styles.pickText}>Pick an Avatar</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#999"
        value={fullName}
        onChangeText={setFullName}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FBFF",
    padding: 24,
    alignItems: "center",
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#1E293B",
  },
  avatarContainer: {
    height: 140,
    width: 140,
    borderRadius: 70,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    height: 140,
    width: 140,
    borderRadius: 70,
  },
  pickText: {
    color: "#64748B",
    fontSize: 14,
  },
  input: {
    width: "100%",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1FC7B6",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
