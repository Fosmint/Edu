import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { suggestTopicFromText, createTopicFromSuggestion, TopicSuggestion } from "../lib/ai/topicSuggestion";
import { createChat } from "../lib/ai/teacherChat";
import { OpenRouterError } from "../lib/ai/openrouter";
import { useSubjectsStore } from "../stores/useSubjectsStore";
import { useProfileStore } from "../stores/useProfileStore";
import { Card } from "../components/Card";
import { colors, spacing, radius } from "../components/theme";
import { Icon, IconName } from "../components/icons/Icon";

const SUBJECT_NAMES: Record<string, string> = {
  math: "Математика",
  russian: "Русский язык",
  english: "Английский язык",
  chemistry: "Химия",
  physics: "Физика",
};

const TIER_LABELS: Record<number, string> = {
  1: "База",
  2: "Средний",
  3: "Сложный",
  4: "Продвинутый",
};
const TIER_ICONS: Record<number, IconName> = {
  1: "circle-filled-green",
  2: "circle-filled-yellow",
  3: "circle-filled-red",
  4: "skull",
};

export default function AddTopicScreen() {
  const router = useRouter();
  const refreshTopics = useSubjectsStore((s) => s.refreshTopics);
  const refreshSubjects = useSubjectsStore((s) => s.refreshSubjects);
  const checkAchievements = useProfileStore((s) => s.checkAchievements);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<TopicSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleAnalyze() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await suggestTopicFromText(input.trim());
      setSuggestion(result);
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Не удалось разобрать запрос. Попробуй переформулировать.");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!suggestion) return;
    setCreating(true);
    try {
      const topicId = createTopicFromSuggestion(suggestion);
      refreshTopics(suggestion.subject_id);
      refreshSubjects();
      checkAchievements();
      const sessionId = createChat({ subjectId: suggestion.subject_id, topicId });
      router.replace(`/topic/${topicId}/chat/${sessionId}`);
    } catch (e) {
      setError("Не удалось создать тему. Попробуй ещё раз.");
      setCreating(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Что сейчас проходим?" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Напиши своими словами, что сейчас изучаете в школе — например «в пятницу контрольная по физике: давление и
          сила Архимеда» или «начали неправильные глаголы по английскому». Я подберу предмет и добавлю тему.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Например: щас проходим квадратные уравнения"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading && !creating}
        />

        {!suggestion && (
          <Pressable style={styles.analyzeButton} onPress={handleAnalyze} disabled={loading || !input.trim()}>
            {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.analyzeButtonText}>Определить тему</Text>}
          </Pressable>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {suggestion && (
          <Card style={styles.suggestionCard}>
            <Text style={styles.suggestionLabel}>Предмет</Text>
            <Text style={styles.suggestionValue}>{SUBJECT_NAMES[suggestion.subject_id] ?? suggestion.subject_id}</Text>

            <Text style={styles.suggestionLabel}>Тема</Text>
            <Text style={styles.suggestionValue}>{suggestion.topic_name}</Text>

            <Text style={styles.suggestionLabel}>Описание</Text>
            <Text style={styles.suggestionValue}>{suggestion.topic_description}</Text>

            <Text style={styles.suggestionLabel}>Уровень сложности для старта</Text>
            <View style={styles.tierRow}>
              <Icon name={TIER_ICONS[suggestion.suggested_difficulty_tier]} size={16} color={colors.textPrimary} />
              <Text style={styles.suggestionValue}>{TIER_LABELS[suggestion.suggested_difficulty_tier]}</Text>
            </View>

            {suggestion.parent_topic_name && (
              <>
                <Text style={styles.suggestionLabel}>Продолжение темы</Text>
                <Text style={styles.suggestionValue}>{suggestion.parent_topic_name}</Text>
              </>
            )}

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setSuggestion(null);
                  setInput("");
                }}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirm} disabled={creating}>
                {creating ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.confirmButtonText}>Добавить и начать</Text>
                )}
              </Pressable>
            </View>
          </Card>
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
    minHeight: 90,
  },
  analyzeButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  analyzeButtonText: { color: colors.background, fontWeight: "700", fontSize: 15 },
  errorText: { color: colors.error, textAlign: "center" },
  suggestionCard: { gap: spacing.xs },
  suggestionLabel: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, textTransform: "uppercase" },
  suggestionValue: { color: colors.textPrimary, fontSize: 15 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  cancelButtonText: { color: colors.textSecondary, fontWeight: "600" },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  confirmButtonText: { color: colors.background, fontWeight: "700" },
});
