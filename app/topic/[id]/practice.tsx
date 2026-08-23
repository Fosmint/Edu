import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { getTopic, TopicWithProgress, recalculateSubjectProgress } from "../../../lib/db/subjectsRepo";
import { generatePracticeSet, checkPracticeAnswer, PracticeQuestion } from "../../../lib/ai/practiceGenerator";
import { createSession, endSession } from "../../../lib/ai/teacherChat";
import { OpenRouterError } from "../../../lib/ai/openrouter";
import { recordMistake } from "../../../lib/db/mistakesRepo";
import { applyReviewResult } from "../../../lib/srs/sm2";
import { getDb } from "../../../lib/db/client";
import { useProfileStore } from "../../../stores/useProfileStore";
import { Card } from "../../../components/Card";
import { colors, spacing, radius } from "../../../components/theme";

const XP_PER_CORRECT = 10;

export default function TopicPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicWithProgress | null | undefined>(undefined);
  const gainXp = useProfileStore((s) => s.gainXp);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; feedback: string } | null>(null);
  const [loadingSet, setLoadingSet] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    setTopic(getTopic(id) ?? null);
  }, [id]);

  useEffect(() => {
    if (!topic) return;
    const sid = createSession({ subjectId: topic.subject_id, topicId: topic.id, type: "practice" });
    setSessionId(sid);
    loadQuestions();
  }, [topic?.id]);

  async function loadQuestions() {
    if (!topic) return;
    setLoadingSet(true);
    setError(null);
    try {
      const set = await generatePracticeSet({
        subjectId: topic.subject_id,
        topicId: topic.id,
        topicName: topic.name,
        count: 10,
        targetDifficultyTier: topic.current_difficulty_tier as 1 | 2 | 3 | 4,
      });
      setQuestions(set);
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Не удалось сгенерировать задания.");
    } finally {
      setLoadingSet(false);
    }
  }

  async function handleCheck() {
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

      // Показываем результат сразу — это то, что реально видит пользователь.
      // Любые проблемы с последующей записью в БД не должны перекрывать этот экран ошибкой,
      // поэтому оборачиваем сохранение в собственный try/catch.
      setResult({ correct: check.is_correct, feedback: check.feedback });

      try {
        const db = getDb();
        db.runSync(
          `UPDATE topic_progress
           SET attempts_total = attempts_total + 1,
               attempts_correct = attempts_correct + ?,
               updated_at = datetime('now')
           WHERE topic_id = ?`,
          [check.is_correct ? 1 : 0, topic.id]
        );

        // Пересчитываем mastery_pct на основе точности ответов — это то, что открывает
        // кнопку "Босс темы" (при >= 50%) и в целом отражает реальный прогресс на карте знаний
        const progressRow = db.getFirstSync<{ attempts_total: number; attempts_correct: number }>(
          `SELECT attempts_total, attempts_correct FROM topic_progress WHERE topic_id = ?`,
          [topic.id]
        );
        if (progressRow && progressRow.attempts_total > 0) {
          const newMastery = Math.round((progressRow.attempts_correct / progressRow.attempts_total) * 100);
          db.runSync(`UPDATE topic_progress SET mastery_pct = ? WHERE topic_id = ?`, [newMastery, topic.id]);
          db.runSync(
            `UPDATE topics SET status = 'in_progress' WHERE id = ? AND status = 'available'`,
            [topic.id]
          );
          recalculateSubjectProgress(db, topic.subject_id);
        }

        if (check.is_correct) {
          setCorrectCount((c) => c + 1);
          gainXp(XP_PER_CORRECT);
        } else if (check.mistake_type) {
          recordMistake({
            topicId: topic.id,
            subjectId: topic.subject_id,
            mistakeType: check.mistake_type,
            mistakeTypeRu: check.mistake_type_ru ?? undefined,
            description: check.feedback,
            sessionId: sessionId ?? undefined,
          });
        }
      } catch (dbError) {
        // Сбой записи прогресса не должен ломать сам показ результата ответа
        console.error("Ошибка сохранения прогресса практики:", dbError);
      }
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Ошибка проверки ответа.");
    } finally {
      setChecking(false);
    }
  }

  function handleNext() {
    setAnswer("");
    setResult(null);
    if (currentIndex + 1 >= questions.length) {
      // Практика завершена
      if (topic) {
        const quality = correctCount >= questions.length * 0.8 ? 5 : correctCount >= questions.length * 0.5 ? 3 : 1;
        applyReviewResult(topic.id, quality as any);
      }
      if (sessionId) {
        endSession(sessionId, correctCount / Math.max(questions.length, 1), correctCount * XP_PER_CORRECT);
      }
      router.back();
      return;
    }
    setCurrentIndex((i) => i + 1);
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

  if (loadingSet) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
        <Text style={styles.loadingText}>Готовлю задания по теме «{topic.name}»...</Text>
      </View>
    );
  }

  if (error && questions.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadQuestions}>
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }

  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <>
      <Stack.Screen options={{ title: `Практика · ${currentIndex + 1}/${questions.length}` }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.questionCard}>
          <Text style={styles.questionText}>{q.question}</Text>
        </Card>

        {!result && (
          <>
            <TextInput
              style={styles.answerInput}
              placeholder="Твой ответ..."
              placeholderTextColor={colors.textMuted}
              value={answer}
              onChangeText={setAnswer}
              multiline
              editable={!checking}
            />
            <Pressable style={styles.checkButton} onPress={handleCheck} disabled={checking || !answer.trim()}>
              {checking ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.checkButtonText}>Проверить</Text>
              )}
            </Pressable>
          </>
        )}

        {result && (
          <Card style={[styles.resultCard, result.correct ? styles.resultCorrect : styles.resultIncorrect] as any}>
            <Text style={styles.resultTitle}>{result.correct ? "✅ Правильно!" : "❌ Не совсем"}</Text>
            <Text style={styles.resultFeedback}>{result.feedback}</Text>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentIndex + 1 >= questions.length ? "Завершить практику" : "Следующее задание"}
              </Text>
            </Pressable>
          </Card>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  centerScreen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  loadingText: { color: colors.textSecondary, textAlign: "center" },
  questionCard: {},
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
  resultCard: { gap: spacing.sm, borderWidth: 1 },
  resultCorrect: { borderColor: colors.success },
  resultIncorrect: { borderColor: colors.error },
  resultTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  resultFeedback: { color: colors.textSecondary, lineHeight: 20 },
  nextButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  nextButtonText: { color: colors.background, fontWeight: "700" },
  errorText: { color: colors.error, textAlign: "center" },
  retryButton: { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: colors.textPrimary, fontWeight: "600" },
});
