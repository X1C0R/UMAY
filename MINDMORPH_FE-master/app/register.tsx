import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [preferredLanguage, setPreferredLanguage] = useState<string>("en");
  const [learningStyle, setLearningStyle] = useState<string>("mixed");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const SERVER_URL = "http://192.168.100.5:4000"; // your backend server

  const handleRegister = async () => {
    if (!fullName || !email || !password || !dateOfBirth) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${SERVER_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          avatarUrl,
          preferredLanguage,
          learningStyle,
          date_of_birth: dateOfBirth,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Something went wrong");
      } else {
        setMessage(
          `Account created for ${data.email}! Please check your email to confirm your account.`
        );
        // Reset form
        setFullName("");
        setEmail("");
        setPassword("");
        setAvatarUrl("");
        setDateOfBirth("");
        setPreferredLanguage("en");
        setLearningStyle("mixed");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <TextInput
        placeholder="Avatar URL (optional)"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        style={styles.input}
      />
      <TextInput
        placeholder="Date of Birth (YYYY-MM-DD)"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        style={styles.input}
      />

      {/* Preferred Language Picker */}
      <Text style={{ marginBottom: 4 }}>Preferred Language:</Text>
      <Picker
        selectedValue={preferredLanguage}
        onValueChange={(itemValue: string, itemIndex: number) =>
          setPreferredLanguage(itemValue)
        }
        style={{ marginBottom: 12 }}
      >
        <Picker.Item label="English" value="en" />
        <Picker.Item label="Japanese" value="ja" />
        <Picker.Item label="Filipino" value="ph" />
      </Picker>

      {/* Learning Style Picker */}
      <Text style={{ marginBottom: 4 }}>Learning Style:</Text>
      <Picker
        selectedValue={learningStyle}
        onValueChange={(itemValue: string, itemIndex: number) =>
          setLearningStyle(itemValue)
        }
        style={{ marginBottom: 12 }}
      >
        <Picker.Item label="Visual" value="visual" />
        <Picker.Item label="Auditory" value="auditory" />
        <Picker.Item label="Reading" value="reading" />
        <Picker.Item label="Kinesthetic" value="kinesthetic" />
        <Picker.Item label="Mixed" value="mixed" />
      </Picker>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 20 }} />
      ) : (
        <Button title="Register" onPress={handleRegister} />
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  message: {
    marginTop: 20,
    color: "green",
    fontWeight: "bold",
    textAlign: "center",
  },
});
