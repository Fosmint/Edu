import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSubjectsStore } from "../../stores/useSubjectsStore";
import { getSubject, deleteTopic, isCustomTopic } from "../../lib/db/subjectsRepo";
import { Card } from "../../components/Card";
import { colors, spacing, radius } from "../../components/theme";

const TIER_ICONS: Record<number, string> = { 1: "🟢", 2: "🟡", 3: "🔴", 4: "💀" };
const STATUS_ICONS: Record<string, string> = {
  locked: "🔒",
  available: "⚪",
  in_progress: "🟡",
  mastered: "✅",
};

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const topics = useSubjectsStore((s) => s.topicsBySubject[id] ?? []);
  const refreshTopics = useSubjectsStore((s) => s.refreshTopics);
  const subject = getSubject(id);

  useEffect(() => {
    refreshTopics(id);
  }, [id]);

  function handleDeleteTopic(topicId: string, topicName: string) {
    Alert.alert(
      "Удалить тему?",
      `«${topicName}» и весь прогресс по ней (чат, практика, ошибки) будут удалены безвозвратно.`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            setTimeout(() => {
              try {
                deleteTopic(topicId);
                refreshTopics(id);
              } catch (e) {
                console.error("Ошибка удаления темы:", e);
                Alert.alert("Не удалось удалить тему", e instanceof Error ? e.message : "Неизвестная ошибка");
              }
            }, 0);
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: subject ? `${subject.icon} ${subject.name}` : "" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.mapTitle}>Карта знаний</Text>
        {topics.map((t) => {
          const locked = t.status === "locked";
          const canDelete = isCustomTopic(t.id);
          return (
            <Card
              key={t.id}
              style={[styles.topicCard, locked && styles.topicCardLocked] as any}
              onPress={locked ? undefined : () => router.push(`/topic/${t.id}/chat`)}
            >
              <View style={styles.topicRow}>
                <Text style={styles.statusIcon}>{STATUS_ICONS[t.status]}</Text>
                <View style={styles.topicInfo}>
                  <Text style={[styles.topicName, locked && styles.textMuted]}>{t.name}</Text>
                  {!locked && (
                    <Text style={styles.topicMeta}>
                      {TIER_ICONS[t.current_difficulty_tier]} {Math.round(t.mastery_pct)}% освоено
                    </Text>
                  )}
                  {locked && <Text style={styles.textMuted}>Откроется после предыдущей темы</Text>}
                </View>
                {canDelete && (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTopic(t.id, t.name)}
                    hitSlop={8}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </Pressable>
                )}
              </View>
              {!locked && t.status !== "mastered" && (
                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => router.push(`/topic/${t.id}/practice`)}
                  >
                    <Text style={styles.actionButtonText}>Практика</Text>
                  </Pressable>
                  {t.mastery_pct >= 50 && (
                    <Pressable
                      style={styles.actionButtonBoss}
                      onPress={() => router.push(`/topic/${t.id}/boss`)}
                    >
                      <Text style={styles.actionButtonBossText}>⚔️ Босс</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          );
        })}

        <Pressable style={styles.addTopicButton} onPress={() => router.push("/add-topic")}>
          <Text style={styles.addTopicButtonText}>+ Добавить тему из школы</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  mapTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: spacing.xs },
  topicCard: { gap: spacing.sm },
  topicCardLocked: { opacity: 0.5 },
  topicRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusIcon: { fontSize: 20 },
  topicInfo: { flex: 1, gap: 2 },
  topicName: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  topicMeta: { color: colors.textSecondary, fontSize: 13 },
  textMuted: { color: colors.textMuted },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  actionButtonText: { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  actionButtonBoss: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  actionButtonBossText: { color: colors.background, fontWeight: "700", fontSize: 13 },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
  deleteButtonText: { color: colors.error, fontSize: 15, fontWeight: "700" },
  addTopicButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  addTopicButtonText: { color: colors.textSecondary, fontWeight: "600" },
});
