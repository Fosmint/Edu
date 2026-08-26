import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "../lib/db/client";
import { useProfileStore } from "../stores/useProfileStore";
import { AchievementToast } from "../components/AchievementToast";
import { CrashScreen } from "../components/CrashScreen";

// Глобальный перехват необработанных JS-ошибок (вне React-рендера, например
// в async-коде, обработчиках onPress, промисах) — работает даже в релизной
// сборке, где стандартный red box отключён и приложение иначе просто тихо падает.
declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
};

let globalCrashInfo: { error: Error; isFatal?: boolean } | null = null;
let globalCrashListeners: Array<() => void> = [];

if (typeof ErrorUtils !== "undefined") {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    globalCrashInfo = { error, isFatal };
    globalCrashListeners.forEach((l) => l());
    // не вызываем originalHandler, чтобы избежать стандартного немедленного
    // закрытия/красного экрана поверх нашего — мы сами показываем ошибку ниже
    console.error("Global JS error caught:", error, "isFatal:", isFatal);
  });
}

export default function RootLayout() {
  const [globalCrash, setGlobalCrash] = useState<{ error: Error; isFatal?: boolean } | null>(null);

  useEffect(() => {
    if (globalCrashInfo) setGlobalCrash(globalCrashInfo);
    const listener = () => setGlobalCrash(globalCrashInfo);
    globalCrashListeners.push(listener);
    return () => {
      globalCrashListeners = globalCrashListeners.filter((l) => l !== listener);
    };
  }, []);

  if (globalCrash) {
    return (
      <ScrollView style={styles.centerScreen} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <Text style={styles.errorTitle}>Приложение упало (global JS error)</Text>
        <Text style={styles.errorText}>{globalCrash.error.message}</Text>
        {globalCrash.error.stack && (
          <Text style={[styles.errorText, { fontSize: 11, marginTop: 12 }]}>{globalCrash.error.stack}</Text>
        )}
      </ScrollView>
    );
  }

  return (
    <CrashScreen>
      <RootLayoutInner />
    </CrashScreen>
  );
}

function RootLayoutInner() {
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
        <Stack.Screen name="topic/[id]/chats" options={{ title: "Чаты" }} />
        <Stack.Screen name="topic/[id]/chat/[sessionId]" options={{ title: "Чат с преподавателем" }} />
        <Stack.Screen name="topic/[id]/practice" options={{ title: "Практика" }} />
        <Stack.Screen name="topic/[id]/boss" options={{ title: "Босс темы" }} />
        <Stack.Screen name="add-topic" options={{ title: "Новая тема", presentation: "modal" }} />
        <Stack.Screen name="exam-prep" options={{ title: "Контрольная скоро", presentation: "modal" }} />
        <Stack.Screen name="exam-prep-plan" options={{ title: "План подготовки" }} />
        <Stack.Screen name="cheat-mode" options={{ title: "Срочно списать" }} />
        <Stack.Screen name="cheat-mode/[sessionId]" options={{ title: "Срочно списать" }} />
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
