import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "../lib/db/client";
import { useProfileStore } from "../stores/useProfileStore";
import { AchievementToast } from "../components/AchievementToast";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshProfile = useProfileStore((s) => s.refresh);

  useEffect(() => {
    initDatabase()
      .then(() => {
        refreshProfile();
        setIsReady(true);
      })
      .catch((e) => {
        console.error("Ошибка инициализации БД:", e);
        setError(e instanceof Error ? e.message : "Неизвестная ошибка при запуске");
      });
  }, []);

  if (error) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorTitle}>Ошибка запуска</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0F0F12" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#0F0F12" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="subject/[id]" options={{ title: "" }} />
        <Stack.Screen name="topic/[id]/chat" options={{ title: "Чат с преподавателем" }} />
        <Stack.Screen name="topic/[id]/practice" options={{ title: "Практика" }} />
        <Stack.Screen name="topic/[id]/boss" options={{ title: "⚔️ Босс темы" }} />
        <Stack.Screen name="add-topic" options={{ title: "Новая тема", presentation: "modal" }} />
      </Stack>
      <AchievementToast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    backgroundColor: "#0F0F12",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    color: "#FF6B6B",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorText: {
    color: "#B0B0B8",
    fontSize: 14,
    textAlign: "center",
  },
});
