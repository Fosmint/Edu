import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSubjectsStore } from "../../stores/useSubjectsStore";
import { getWeeklyMistakeSummary, MistakePattern } from "../../lib/db/mistakesRepo";
import { getAllAchievementsWithStatus, AchievementStatus } from "../../lib/gamification/achievements";
import { Card } from "../../components/Card";
import { colors, spacing } from "../../components/theme";

export default function StatsScreen() {
  const subjects = useSubjectsStore((s) => s.subjects);
  const refreshSubjects = useSubjectsStore((s) => s.refreshSubjects);
  const [mistakesBySubject, setMistakesBySubject] = useState<Record<string, MistakePattern[]>>({});
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);

  useEffect(() => {
    refreshSubjects();
    setAchievements(getAllAchievementsWithStatus());
  }, []);

  useEffect(() => {
    const result: Record<string, MistakePattern[]> = {};
    for (const s of subjects) {
      result[s.id] = getWeeklyMistakeSummary(s.id);
    }
    setMistakesBySubject(result);
  }, [subjects]);

  const hasAnyMistakes = Object.values(mistakesBySubject).some((arr) => arr.length > 0);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Достижения</Text>
      <Text style={styles.subtitle}>
        {unlockedCount} из {achievements.length} разблокировано
      </Text>

      <View style={styles.achievementsGrid}>
        {achievements.map((a) => (
          <Card
            key={a.code}
            style={[styles.achievementCard, !a.unlocked && styles.achievementCardLocked] as any}
          >
            <Text style={[styles.achievementIcon, !a.unlocked && styles.achievementIconLocked]}>
              {a.unlocked ? a.icon : "🔒"}
            </Text>
            <Text style={[styles.achievementTitle, !a.unlocked && styles.textMuted]}>{a.title}</Text>
            <Text style={styles.achievementDesc}>{a.description}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.title}>Статистика ошибок</Text>
      <Text style={styles.subtitle}>За последние 7 дней</Text>

      {!hasAnyMistakes && (
        <Card>
          <Text style={styles.emptyText}>
            Пока недостаточно данных. Позанимайся немного — и здесь появится анализ твоих слабых мест.
          </Text>
        </Card>
      )}

      {subjects.map((s) => {
        const mistakes = mistakesBySubject[s.id] ?? [];
        if (mistakes.length === 0) return null;
        return (
          <Card key={s.id} style={styles.card}>
            <Text style={styles.subjectTitle}>
              {s.icon} {s.name}
            </Text>
            {mistakes.map((m, idx) => (
              <View key={idx} style={styles.mistakeRow}>
                <Text style={styles.mistakeText}>
                  {m.topic_name} — {m.mistake_type_ru || m.mistake_type}
                </Text>
                <Text style={styles.mistakeCount}>×{m.count}</Text>
              </View>
            ))}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: -spacing.sm },
  emptyText: { color: colors.textSecondary, lineHeight: 20 },
  card: { gap: spacing.sm },
  subjectTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  mistakeRow: { flexDirection: "row", justifyContent: "space-between" },
  mistakeText: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  mistakeCount: { color: colors.warning, fontSize: 14, fontWeight: "700" },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  achievementCard: { width: "47%", alignItems: "center", gap: 4, paddingVertical: spacing.md },
  achievementCardLocked: { opacity: 0.5 },
  achievementIcon: { fontSize: 32 },
  achievementIconLocked: { opacity: 0.6 },
  achievementTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", textAlign: "center" },
  achievementDesc: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
  textMuted: { color: colors.textMuted },
});
