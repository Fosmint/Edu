import { getProfile } from "../db/profileRepo";
import { getSubject, getTopic, getTopicsWithProgress } from "../db/subjectsRepo";
import { buildMistakeContextForAI } from "../db/mistakesRepo";

const TIER_LABELS: Record<number, string> = {
  1: "🟢 База",
  2: "🟡 Средний",
  3: "🔴 Сложный",
  4: "💀 Продвинутый",
};

/**
 * Формирует текстовый блок с контекстом ученика — вставляется в system-промпт
 * перед каждым запросом к AI. Держим компактно, чтобы не раздувать токены.
 */
export function buildStudentContext(params: {
  subjectId: string;
  topicId?: string;
  sessionType?: "chat" | "practice" | "exam" | "boss" | "review" | "diagnostic";
}): string {
  const profile = getProfile();
  const subject = getSubject(params.subjectId);
  const allTopics = getTopicsWithProgress(params.subjectId);

  const masteredTopics = allTopics.filter((t) => t.status === "mastered").map((t) => t.name);
  const inProgressTopics = allTopics.filter((t) => t.status === "in_progress").map((t) => t.name);

  const lines: string[] = [
    `Ученик: ${profile.name}, общий уровень ${profile.level}, серия обучения: ${profile.streak_days} дн.`,
    `Предмет: ${subject?.name ?? params.subjectId}, общий прогресс по предмету: ${Math.round(subject?.overall_progress_pct ?? 0)}%`,
  ];

  if (masteredTopics.length > 0) {
    lines.push(`Уже освоенные темы: ${masteredTopics.join(", ")}`);
  }
  if (inProgressTopics.length > 0) {
    lines.push(`Темы в процессе изучения: ${inProgressTopics.join(", ")}`);
  }

  if (params.topicId) {
    const topic = getTopic(params.topicId);
    if (topic) {
      const accuracy =
        topic.attempts_total > 0
          ? Math.round((topic.attempts_correct / topic.attempts_total) * 100)
          : null;
      lines.push(
        `Текущая тема: "${topic.name}" — освоение ${Math.round(topic.mastery_pct)}%, ` +
          `уровень сложности сейчас: ${TIER_LABELS[topic.current_difficulty_tier] ?? topic.current_difficulty_tier}` +
          (accuracy !== null ? `, точность ответов: ${accuracy}% (${topic.attempts_correct}/${topic.attempts_total})` : "")
      );
    }
  }

  if (params.sessionType) {
    const typeLabels: Record<string, string> = {
      chat: "Обычный диалог/объяснение",
      practice: "Режим практики — идёт тренировка",
      exam: "ТЕСТ — не давай ответы напрямую",
      boss: "БОСС ТЕМЫ — не давай ответы напрямую, это финальная проверка",
      review: "Повторение старого материала — сначала проверь память",
      diagnostic: "ДИАГНОСТИЧЕСКИЙ ТЕСТ — определяем уровень, не обучаем",
    };
    lines.push(`Текущий режим: ${typeLabels[params.sessionType]}`);
  }

  lines.push(buildMistakeContextForAI(params.subjectId));

  return lines.join("\n");
}
