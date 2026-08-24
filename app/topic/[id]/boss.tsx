import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { getTopic, markTopicMastered, MASTERY_THRESHOLD_TO_UNLOCK, TopicWithProgress } from "../../../lib/db/subjectsRepo";
import { generatePracticeSet, checkPracticeAnswer, PracticeQuestion } from "../../../lib/ai/practiceGenerator";
import { createSession, endSession } from "../../../lib/ai/teacherChat";
import { OpenRouterError } from "../../../lib/ai/openrouter";
import { recordMistake } from "../../../lib/db/mistakesRepo";
import { getDb } from "../../../lib/db/client";
import { useProfileStore } from "../../../stores/useProfileStore";
import { Card } from "../../../components/Card";
import { colors, spacing, radius } from "../../../components/theme";
import { Icon } from "../../../components/icons/Icon";

const BOSS_QUESTION_COUNT = 20;
const XP_PER_CORRECT = 15; // выше чем обычная практика — это финальный экзамен

type Phase = "loading" | "in_progress" | "finished" | "error";

export default function TopicBossScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicWithProgress | null | undefined>(undefined);
  const gainXp = useProfileStore((s) => s.gainXp);

  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answersGiven, setAnswersGiven] = useState<boolean[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weakPoints, setWeakPoints] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    setTopic(getTopic(id) ?? null);
  }, [id]);

  useEffect(() => {
    if (!topic) return;
    const sid = createSession({ subjectId: topic.subject_id, topicId: topic.id, type: "boss" });
    setSessionId(sid);
    loadQuestions();
  }, [topic?.id]);

  async function loadQuestions() {
    if (!topic) return;
    setPhase("loading");
    setError(null);
    try {
      // Босс — на текущем уровне сложности ученика, без искусственного облегчения
      const set = await generatePracticeSet({
        subjectId: topic.subject_id,
        topicId: topic.id,
        topicName: topic.name,
        count: BOSS_QUESTION_COUNT,
        targetDifficultyTier: topic.current_difficulty_tier as 1 | 2 | 3 | 4,
      });
      setQuestions(set);
      setPhase("in_progress");
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Не удалось подготовить экзамен.");
      setPhase("error");
    }
  }

  async function handleSubmitAnswer() {
    if (!topic || !answer.trim()) return;
    const q = questions[currentIndex];
    setChecking(true);
    setError(null);

    try {
      const check = await checkPracticeAnswer({
        subjectId: topic.subject_id,
        topicId: topic.id,
        question: q,
        userAnswer: answer.trim(),
      });

      setAnswersGiven((prev) => [...prev, check.is_correct]);

      if (!check.is_correct && check.mistake_type) {
        setWeakPoints((prev) => [...prev, check.mistake_type!]);
        recordMistake({
          topicId: topic.id,
          subjectId: topic.subject_id,
          mistakeType: check.mistake_type,
          mistakeTypeRu: check.mistake_type_ru ?? undefined,
          description: check.feedback,
          sessionId: sessionId ?? undefined,
        });
      }

      setAnswer("");

      if (currentIndex + 1 >= questions.length) {
        finishBoss([...answersGiven, check.is_correct]);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Ошибка проверки ответа.");
    } finally {
      setChecking(false);
    }
  }

  function finishBoss(finalAnswers: boolean[]) {
    if (!topic) return;
    const correctCount = finalAnswers.filter(Boolean).length;
    const scorePct = (correctCount / finalAnswers.length) * 100;

    const db = getDb();
    db.runSync(
      `INSERT INTO exams (topic_id, subject_id, type, score, total_questions, correct_answers, weak_points_json)
       VALUES (?, ?, 'boss', ?, ?, ?, ?)`,
      [topic.id, topic.subject_id, scorePct, finalAnswers.length, correctCount, JSON.stringify(weakPoints)]
    );

    if (scorePct >= MASTERY_THRESHOLD_TO_UNLOCK) {
      markTopicMastered(topic.id);
      gainXp(correctCount * XP_PER_CORRECT + 50); // бонус за прохождение босса
    } else {
      gainXp(correctCount * XP_PER_CORRECT);
      db.runSync(
        `UPDATE topic_progress SET mastery_pct = ? WHERE topic_id = ?`,
        [Math.max(scorePct, topic.mastery_pct), topic.id]
      );
    }

    if (sessionId) endSession(sessionId, scorePct / 100, correctCount * XP_PER_CORRECT);
    setPhase("finished");
  }

  if (topic === undefined) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
      </View>
    );
  }

  if (topic === null) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>Не удалось найти эту тему. Вернись назад и попробуй снова.</Text>
      </View>
    );
  }

  if (phase === "loading") {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
        <Text style={styles.loadingText}>Готовлю финальную проверку по теме «{topic.name}»...</Text>
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadQuestions}>
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "finished") {
    const correctCount = answersGiven.filter(Boolean).length;
    const scorePct = Math.round((correctCount / answersGiven.length) * 100);
    const passed = scorePct >= MASTERY_THRESHOLD_TO_UNLOCK;

    return (
      <View style={styles.centerScreen}>
        <View style={styles.finishIconWrap}>
          <Icon name={passed ? "trophy" : "muscle"} size={48} color={colors.textPrimary} />
        </View>
        <Text style={styles.finishTitle}>{passed ? "Тема освоена!" : "Пока не совсем"}</Text>
        <Text style={styles.finishScore}>
          {correctCount} из {answersGiven.length} правильно ({scorePct}%)
        </Text>
        {!passed && (
          <Text style={styles.finishHint}>
            Нужно {MASTERY_THRESHOLD_TO_UNLOCK}%, чтобы открыть следующую тему. Потренируйся ещё и попробуй снова.
          </Text>
        )}
        <Pressable style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>Вернуться к предмету</Text>
        </Pressable>
      </View>
    );
  }

  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <>
      <Stack.Screen options={{ title: `Босс · ${currentIndex + 1}/${questions.length}` }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.warningCard}>
          <View style={styles.warningTitleRow}>
            <Icon name="sword" size={14} color={colors.warning} />
            <Text style={styles.warningText}>Без подсказок. Отвечай так, как знаешь на самом деле.</Text>
          </View>
        </Card>
        <Card>
          <Text style={styles.questionText}>{q.question}</Text>
        </Card>
        <TextInput
          style={styles.answerInput}
          placeholder="Твой ответ..."
          placeholderTextColor={colors.textMuted}
          value={answer}
          onChangeText={setAnswer}
          multiline
          editable={!checking}
        />
        <Pressable style={styles.checkButton} onPress={handleSubmitAnswer} disabled={checking || !answer.trim()}>
          {checking ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.checkButtonText}>
              {currentIndex + 1 >= questions.length ? "Завершить" : "Ответить"}
            </Text>
          )}
        </Pressable>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  centerScreen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  loadingText: { color: colors.textSecondary, textAlign: "center" },
  warningCard: { borderColor: colors.warning, borderWidth: 1 },
  warningTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  warningText: { color: colors.warning, fontSize: 13, textAlign: "center" },
  questionText: { color: colors.textPrimary, fontSize: 17, lineHeight: 24 },
  answerInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
  },
  checkButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  checkButtonText: { color: colors.background, fontWeight: "700", fontSize: 15 },
  errorText: { color: colors.error, textAlign: "center" },
  retryButton: { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: colors.textPrimary, fontWeight: "600" },
  finishIconWrap: { alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  finishTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
  finishScore: { color: colors.textSecondary, fontSize: 16 },
  finishHint: { color: colors.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: spacing.lg },
  doneButton: {
    marginTop: spacing.md,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  doneButtonText: { color: colors.background, fontWeight: "700" },
});
