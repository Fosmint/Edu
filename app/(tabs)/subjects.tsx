import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSubjectsStore } from "../../stores/useSubjectsStore";
import { Card } from "../../components/Card";
import { ProgressBar } from "../../components/ProgressBar";
import { colors, spacing } from "../../components/theme";
import { Icon } from "../../components/icons/Icon";
import { resolveIconName } from "../../components/icons/iconMap";

export default function SubjectsScreen() {
  const router = useRouter();
  const subjects = useSubjectsStore((s) => s.subjects);
  const refreshSubjects = useSubjectsStore((s) => s.refreshSubjects);

  useEffect(() => {
    refreshSubjects();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Предметы</Text>
      {subjects.map((s) => (
        <Card key={s.id} onPress={() => router.push(`/subject/${s.id}`)} style={styles.card}>
          <View style={styles.row}>
            <Icon name={resolveIconName(s.icon)} size={22} color={colors.textPrimary} />
            <View style={styles.info}>
              <Text style={styles.name}>{s.name}</Text>
              <ProgressBar percent={s.overall_progress_pct} />
            </View>
            <Text style={styles.percent}>{Math.round(s.overall_progress_pct)}%</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: spacing.sm },
  card: {},
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { fontSize: 32 },
  info: { flex: 1, gap: spacing.xs },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  percent: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
});
