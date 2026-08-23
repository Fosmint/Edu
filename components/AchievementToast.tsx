import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useProfileStore } from "../stores/useProfileStore";
import { colors, spacing, radius } from "./theme";

export function AchievementToast() {
  const newlyUnlocked = useProfileStore((s) => s.newlyUnlockedAchievements);
  const clearNewAchievements = useProfileStore((s) => s.clearNewAchievements);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (newlyUnlocked.length === 0) return;

    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => clearNewAchievements());
  }, [newlyUnlocked]);

  if (newlyUnlocked.length === 0) return null;

  const first = newlyUnlocked[0];

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.icon}>{first.icon}</Text>
      <View>
        <Text style={styles.label}>Новое достижение</Text>
        <Text style={styles.title}>{first.title}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 999,
    elevation: 10,
  },
  icon: { fontSize: 32 },
  label: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase" },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
});
