import { callOpenRouterJson, ChatMessage } from "./openrouter";
import { buildStudentContext } from "./context";
import { getDb } from "../db/client";
import { getAllSubjects } from "../db/subjectsRepo";
import { ExamPrepStep } from "../db/examPrepRepo";

export interface ExamPrepPlan {
  subject_id: string;
  exam_title: string;
  days_until_exam: number | null;
  topic_ids: string[];
  steps: ExamPrepStep[];
  motivation_message: string;
}

const EXAM_PREP_SCHEMA = {
  name: "exam_prep_plan",
  schema: {
    type: "object",
    properties: {
      subject_id: {
        type: "string",
        enum: ["math", "russian", "english", "chemistry", "physics"],
        description: "Предмет, определённый из текста пользователя",
      },
      exam_title: {
        type: "string",
        description: "Короткое название контрольной, например 'Контрольная по квадратным уравнениям'",
      },
      days_until_exam: {
        type: ["integer", "null"],
        description: "Сколько дней до контрольной: 0=сегодня, 1=завтра, 2=послезавтра и т.д. null если из текста не ясно когда",
      },
      topic_ids: {
        type: "array",
        items: { type: "string" },
        description: "id тем из БД, которые затрагивает контрольная. Если тема не нашлась в списке — пустой массив.",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            order: { type: "integer", description: "Порядковый номер шага, начиная с 1" },
            type: {
              type: "string",
              enum: ["review", "practice", "weak_spot", "mini_test"],
              description: "review=повторить теорию, practice=решить задачи, weak_spot=потренировать слабое место из ошибок, mini_test=финальный мини-тест",
            },
            title: { type: "string", description: "Короткое название шага (2-5 слов)" },
            description: { type: "string", description: "Что конкретно нужно сделать (1-2 предложения)" },
            topic_id: {
              type: ["string", "null"],
              description: "id темы из БД для перехода в практику/чат, null если шаг общий",
            },
            estimated_minutes: { type: "integer", description: "Оценка времени в минутах (5-20)" },
          },
          required: ["order", "type", "title", "description", "topic_id", "estimated_minutes"],
          additionalProperties: false,
        },
      },
      motivation_message: {
        type: "string",
        description: "Короткая мотивирующая фраза для ученика (1 предложение, дружелюбно и по-делу)",
      },
    },
    required: ["subject_id", "exam_title", "days_until_exam", "topic_ids", "steps", "motivation_message"],
    additionalProperties: false,
  },
};

/**
 * Генерирует план подготовки к контрольной по свободному тексту ученика.
 * Учитывает текущий прогресс, ошибки за неделю и количество оставшегося времени.
 */
export async function generateExamPrepPlan(userText: string): Promise<ExamPrepPlan> {
  const db = getDb();
  const subjects = getAllSubjects();

  // Собираем все темы со статусами для всех предметов — ИИ нужно знать что есть в БД
  const topicsInfo = subjects
    .map((s) => {
      const topics = db.getAllSync<{ id: string; name: string; status: string }>(
        `SELECT id, name, status FROM topics WHERE subject_id = ? ORDER BY sort_order`,
        [s.id]
      );
      const topicsList = topics
        .map((t) => `  - "${t.name}" (id: ${t.id}, статус: ${t.status})`)
        .join("\n");
      return `${s.name} (${s.id}):\n${topicsList || "  тем пока нет"}`;
    })
    .join("\n\n");

  // Контекст ученика — берём по каждому предмету, но компактно
  const contextParts = subjects.map((s) => {
    try {
      return buildStudentContext({ subjectId: s.id });
    } catch {
      return "";
    }
  }).filter(Boolean);

  const today = new Date();
  const dayOfWeek = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"][today.getDay()];

  const systemPrompt = `Ты — помощник по подготовке к контрольным работам для школьника 8 класса.

Сегодня: ${dayOfWeek}, ${today.toISOString().split("T")[0]}.

Задача: по свободному описанию ученика ("контрольная завтра по квадратным уравнениям") составить пошаговый план подготовки.

Темы, доступные в приложении по предметам:
${topicsInfo}

Контекст ученика:
${contextParts.join("\n---\n")}

Правила составления плана:
1. Определи предмет и тему(ы) из текста ученика.
2. Найди подходящие topic_id из списка выше. Используй ТОЛЬКО существующие id из списка. Если тема не найдена — ставь null в topic_id шага.
3. Определи days_until_exam из текста: "завтра"=1, "послезавтра"=2, "в пятницу"=посчитай от сегодняшнего дня, "сегодня"=0. Если неясно — null.
4. Составь 4-7 шагов, исходя из времени:
   - 0 дней (сегодня): 3-4 коротких шага, только самое важное
   - 1 день (завтра): 4-5 шагов
   - 2+ дней: 5-7 шагов, можно глубже
5. Обязательно включи:
   - Минимум 1 шаг review (повторение теории)
   - Минимум 1 шаг practice (решение задач)
   - 1 шаг mini_test последним (финальная проверка)
6. Если у ученика есть повторяющиеся ошибки по этой теме — добавь шаг weak_spot
7. estimated_minutes: реалистичная оценка (5-20 мин на шаг)
8. motivation_message: короткая ободряющая фраза, не кринж`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];

  return callOpenRouterJson<ExamPrepPlan>(messages, EXAM_PREP_SCHEMA, {
    temperature: 0.5,
    maxTokens: 2000,
  });
}
