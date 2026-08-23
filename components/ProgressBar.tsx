import { View, StyleSheet } from "react-native";
import { colors, radius } from "./theme";

export function ProgressBar({ percent, height = 8 }: { percent: number; height?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped}%`, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.full,
  },
});
