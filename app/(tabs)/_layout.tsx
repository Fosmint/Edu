import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0F0F12" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
        tabBarStyle: { backgroundColor: "#16161A", borderTopColor: "#2A2A30" },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#6B6B72",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Главная", tabBarIcon: () => <TabIcon emoji="🏠" /> }}
      />
      <Tabs.Screen
        name="subjects"
        options={{ title: "Предметы", tabBarIcon: () => <TabIcon emoji="📚" /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: "Статистика", tabBarIcon: () => <TabIcon emoji="📊" /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Настройки", tabBarIcon: () => <TabIcon emoji="⚙️" /> }}
      />
    </Tabs>
  );
}
