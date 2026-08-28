import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from "expo-router";
import {
  getExamPrep,
  markStepCompleted,
  completeExamPrep,
  deleteExamPrep,
  ExamPrep,
  ExamPrepStep,
} from "../lib/db/examPrepRepo";
import { useProfileStore } from "../stores/useProfileStore";
import { Card } from "../components/Card";
import { Icon, IconName } from "../components/icons/Icon";
import { colors, spacing, radius } from "../components/theme";

const STEP_TYPE_ICONS: Record<string, IconName> = {
  review: "books",
  practice: "calculator",
  weak_spot: "target",
  mini_test: "sword",
};
const STEP_TYPE_LABELS: Record<string, string> = {
  review: "Повторение",
  practice: "Практика",
  weak_spot: "Слабое место",
  mini_test: "Мини-тест",
};

export default function ExamPrepPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const gainXp = useProfileStore((s) => s.gainXp);
  const [prep, setPrep] = useState<ExamPrep | null>(null);

  const loadPrep = useCallback(() => {
    if (!id) return;
    const data = getExamPrep(Number(id));
    setPrep(data);
  }, [id]);

  useFocusEffect(loadPrep);

  if (!prep) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>План не найден</Text>
      </View>
    );
  }

  const completedSet = new Set(prep.completed_steps);
  const allDone = prep.steps.every((s) => completedSet.has(s.order));
  const completedCount = prep.completed_steps.length;
  const totalSteps = prep.steps.length;
  const remainingMinutes = prep.steps
    .filter((s) => !completedSet.has(s.order))
    .reduce((sum, s) => sum + s.estimated_minutes, 0);

  function handleStepPress(step: ExamPrepStep) {
    if (!prep) return;
    if (completedSet.has(step.order)) return; // уже выполнен

    if (step.topic_id) {
      // Есть привязка к теме — переходим в практику или в список чатов по теме
      if (step.type === "practice" || step.type === "weak_spot" || step.type === "mini_test") {
        router.push(`/topic/${step.topic_id}/practice`);
      } else {
        router.push(`/topic/${step.topic_id}/chats`);
      }
    }

    // Отмечаем шаг выполненным
    markStepCompleted(prep.id, step.order);
    gainXp(10); // 10 XP за каждый шаг
    loadPrep();
  }

  function handleCompleteAll() {
    if (!prep) return;
    completeExamPrep(prep.id);
    gainXp(50); // бонус за завершение всего плана
    Alert.alert(
      "Подготовка завершена! 🎉",
      "Ты прошёл все шаги. Удачи на контрольной!",
      [{ text: "Круто!", onPress: () => router.back() }]
    );
  }

  function handleDelete() {
    if (!prep) return;
    Alert.alert("Удалить план?", "Прогресс по этому плану будет потерян.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          deleteExamPrep(prep.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: prep.exam_title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Заголовок и прогресс */}
        <Card style={styles.headerCard}>
          <Text style={styles.title}>{prep.exam_title}</Text>
          {prep.exam_date && (
            <Text style={styles.examDate}>📅 {prep.exam_date}</Text>
          )}
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(completedCount / totalSteps) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCount}/{totalSteps}
            </Text>
          </View>
          {remainingMinutes > 0 && (
            <Text style={styles.remainingTime}>
              Осталось ~{remainingMinutes} мин
            </Text>
          )}
        </Card>

        {/* Шаги */}
        {prep.steps.map((step) => {
          const done = completedSet.has(step.order);
          return (
            <Pressable
              key={step.order}
              onPress={() => handleStepPress(step)}
              disabled={done}
            >
              <Card style={[styles.stepCard, done && styles.stepCardDone] as any}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepBadge,
                      done && styles.stepBadgeDone,
                    ]}
                  >
                    {done ? (
                      <Icon name="check-circle" size={20} color={colors.success} />
                    ) : (
                      <Text style={styles.stepBadgeText}>{step.order}</Text>
                    )}
                  </View>
                  <View style={styles.stepInfo}>
                    <View style={styles.stepTypeRow}>
                      <Icon
                        name={STEP_TYPE_ICONS[step.type]}
                        size={13}
                        color={done ? colors.textMuted : colors.textSecondary}
                      />
                      <Text
                        style={[styles.stepType, done && styles.textDone]}
                      >
                        {STEP_TYPE_LABELS[step.type]}
                      </Text>
                      <Text style={[styles.stepTime, done && styles.textDone]}>
                        ~{step.estimated_minutes} мин
                      </Text>
                    </View>
                    <Text
                      style={[styles.stepTitle, done && styles.textDone]}
                    >
                      {step.title}
                    </Text>
                    <Text
                      style={[styles.stepDesc, done && styles.textDone]}
                    >
                      {step.description}
                    </Text>
                    {!done && step.topic_id && (
                      <View style={styles.goRow}>
                        <Text style={styles.goText}>
                          {step.type === "review" ? "Открыть чат →" : "Открыть практику →"}
                        </Text>
                      </View>
                    )}
                    {!done && !step.topic_id && (
                      <Pressable
                        style={styles.markDoneButton}
                        onPress={() => {
                          markStepCompleted(prep.id, step.order);
                          gainXp(10);
                          loadPrep();
                        }}
                      >
                        <Text style={styles.markDoneText}>Отметить выполненным ✓</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {/* Кнопки внизу */}
        {allDone && !prep.is_completed && (
          <Pressable style={styles.completeButton} onPress={handleCompleteAll}>
            <Icon name="trophy" size={18} color={colors.background} />
            <Text style={styles.completeButtonText}>Подготовка завершена!</Text>
          </Pressable>
        )}

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Удалить план</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { color: colors.textMuted, fontSize: 16 },

  headerCard: { gap: spacing.xs },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  examDate: { color: colors.warning, fontSize: 14, fontWeight: "600" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: colors.success,
    borderRadius: radius.full,
  },
  progressText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  remainingTime: { color: colors.textMuted, fontSize: 12 },

  stepCard: { gap: spacing.xs },
  stepCardDone: { opacity: 0.6 },
  stepRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBadgeDone: {
    backgroundColor: "transparent",
    borderColor: colors.success,
  },
  stepBadgeText: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  stepInfo: { flex: 1, gap: 2 },
  stepTypeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepType: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  stepTime: { color: colors.textMuted, fontSize: 12, marginLeft: "auto" },
  stepTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  stepDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  textDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  goRow: { marginTop: 4 },
  goText: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
  markDoneButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
  },
  markDoneText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },

  completeButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  completeButtonText: { color: colors.background, fontWeight: "700", fontSize: 16 },

  deleteButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  deleteButtonText: { color: colors.textMuted, fontSize: 13 },
});
