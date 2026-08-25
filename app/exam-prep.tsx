import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { generateExamPrepPlan, ExamPrepPlan } from "../lib/ai/examPrepGenerator";
import { saveExamPrep } from "../lib/db/examPrepRepo";
import { OpenRouterError } from "../lib/ai/openrouter";
import { Card } from "../components/Card";
import { Icon } from "../components/icons/Icon";
import { colors, spacing, radius } from "../components/theme";
import { addDays, format } from "date-fns";

const STEP_TYPE_LABELS: Record<string, string> = {
  review: "Повторение",
  practice: "Практика",
  weak_spot: "Слабое место",
  mini_test: "Мини-тест",
};

const STEP_TYPE_ICONS: Record<string, string> = {
  review: "books",
  practice: "calculator",
  weak_spot: "target",
  mini_test: "sword",
};

export default function ExamPrepScreen() {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<ExamPrepPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const result = await generateExamPrepPlan(input.trim());
      setPlan(result);
    } catch (e) {
      setError(
        e instanceof OpenRouterError
          ? e.message
          : "Не удалось составить план. Попробуй переформулировать."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleStartPrep() {
    if (!plan) return;
    setSaving(true);
    try {
      const examDate =
        plan.days_until_exam != null
          ? format(addDays(new Date(), plan.days_until_exam), "yyyy-MM-dd")
          : null;
      const prepId = saveExamPrep({
        subjectId: plan.subject_id,
        examTitle: plan.exam_title,
        examDate,
        steps: plan.steps,
      });
      router.replace(`/exam-prep-plan?id=${prepId}`);
    } catch {
      setError("Не удалось сохранить план.");
      setSaving(false);
    }
  }

  const totalMinutes = plan
    ? plan.steps.reduce((sum, s) => sum + s.estimated_minutes, 0)
    : 0;

  return (
    <>
      <Stack.Screen options={{ title: "Контрольная скоро" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Напиши, что за контрольная и когда — например «завтра контрольная по
          квадратным уравнениям» или «в пятницу тест по физике, закон Ома». Я
          составлю план подготовки.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Например: послезавтра контрольная по дробям"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading && !saving}
        />

        {!plan && (
          <Pressable
            style={[styles.generateButton, (!input.trim() || loading) && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Icon name="pencil" size={17} color={colors.background} />
                <Text style={styles.generateButtonText}>Составить план</Text>
              </>
            )}
          </Pressable>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {plan && (
          <>
            <Card style={styles.planCard}>
              <Text style={styles.planTitle}>{plan.exam_title}</Text>
              {plan.days_until_exam != null && (
                <Text style={styles.planDays}>
                  {plan.days_until_exam === 0
                    ? "⚡ Сегодня!"
                    : plan.days_until_exam === 1
                    ? "📅 Завтра"
                    : `📅 Через ${plan.days_until_exam} дн.`}
                </Text>
              )}
              <Text style={styles.planMeta}>
                {plan.steps.length} шагов · ~{totalMinutes} мин
              </Text>
            </Card>

            <Text style={styles.sectionTitle}>План подготовки</Text>

            {plan.steps.map((step) => (
              <Card key={step.order} style={styles.stepCard}>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{step.order}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <View style={styles.stepTypeRow}>
                      <Icon
                        name={STEP_TYPE_ICONS[step.type] as any}
                        size={13}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.stepType}>
                        {STEP_TYPE_LABELS[step.type]}
                      </Text>
                      <Text style={styles.stepTime}>~{step.estimated_minutes} мин</Text>
                    </View>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.description}</Text>
                  </View>
                </View>
              </Card>
            ))}

            <Text style={styles.motivation}>{plan.motivation_message}</Text>

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setPlan(null);
                  setInput("");
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Заново</Text>
              </Pressable>
              <Pressable
                style={styles.startButton}
                onPress={handleStartPrep}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.startButtonText}>Начать подготовку</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
  },
  generateButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  generateButtonText: { color: colors.background, fontWeight: "700", fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  errorText: { color: colors.error, textAlign: "center" },
  planCard: { gap: spacing.xs },
  planTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  planDays: { color: colors.warning, fontSize: 14, fontWeight: "600" },
  planMeta: { color: colors.textSecondary, fontSize: 13 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  stepCard: { gap: spacing.xs },
  stepRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBadgeText: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  stepInfo: { flex: 1, gap: 2 },
  stepTypeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepType: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  stepTime: { color: colors.textMuted, fontSize: 12, marginLeft: "auto" },
  stepTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  stepDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  motivation: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: spacing.xs,
  },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelButtonText: { color: colors.textSecondary, fontWeight: "600" },
  startButton: {
    flex: 2,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  startButtonText: { color: colors.background, fontWeight: "700", fontSize: 15 },
});
