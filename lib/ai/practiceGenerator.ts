import { buildSystemPrompt } from "./subjectPrompts";
import { buildStudentContext } from "./context";
import { callOpenRouterJson, ChatMessage } from "./openrouter";

export interface PracticeQuestion {
  question: string;
  correct_answer: string;
  difficulty_tier: 1 | 2 | 3 | 4;
  hint: string;
  explanation: string; // показывается после ответа, независимо от правильности
}

interface PracticeSet {
  questions: PracticeQuestion[];
}

const PRACTICE_SCHEMA = {
  name: "practice_set",
  schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "Условие задания на русском (или английском для урока English)" },
            correct_answer: { type: "string", description: "Правильный ответ в краткой проверяемой форме" },
            difficulty_tier: { type: "integer", enum: [1, 2, 3, 4] },
            hint: { type: "string", description: "Лёгкая подсказка, не раскрывающая решение полностью" },
            explanation: { type: "string", description: "Разбор решения — показывается после ответа ученика" },
          },
          required: ["question", "correct_answer", "difficulty_tier", "hint", "explanation"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  },
};

/**
 * Генерирует набор заданий для практики по теме, с учётом текущего уровня
 * сложности ученика и его типичных ошибок (через контекст).
 */
export async function generatePracticeSet(params: {
  subjectId: string;
  topicId: string;
  topicName: string;
  count?: number;
  targetDifficultyTier?: 1 | 2 | 3 | 4;
}): Promise<PracticeQuestion[]> {
  const count = params.count ?? 10;

  const contextBlock = buildStudentContext({
    subjectId: params.subjectId,
    topicId: params.topicId,
    sessionType: "practice",
  });

  const systemPrompt = buildSystemPrompt({ subjectId: params.subjectId, contextBlock });

  const userPrompt = `Сгенерируй набор из ${count} тренировочных заданий по теме "${params.topicName}".${
    params.targetDifficultyTier ? ` Целевой уровень сложности: ${params.targetDifficultyTier}.` : " Подбери сложность по контексту ученика."
  } Задания должны быть разнообразными, не повторять друг друга по формулировке. Учитывай типичные ошибки ученика из контекста — включи 1-2 задания, которые специально тренируют его слабое место.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const result = await callOpenRouterJson<PracticeSet>(messages, PRACTICE_SCHEMA, {
    temperature: 0.8,
    maxTokens: 3000,
  });

  return result.questions;
}

export interface AnswerCheckResult {
  is_correct: boolean;
  feedback: string; // объяснение, куда закралась ошибка (если есть), без готового решения если можно избежать
  mistake_type: string | null; // короткий тег для записи в mistakesRepo (для группировки), null если верно
  mistake_type_ru: string | null; // короткое название ошибки на русском для показа пользователю, null если верно
}

const ANSWER_CHECK_SCHEMA = {
  name: "answer_check",
  schema: {
    type: "object",
    properties: {
      is_correct: { type: "boolean" },
      feedback: { type: "string" },
      mistake_type: {
        type: ["string", "null"],
        description: "Короткий стабильный тег типа ошибки на английском в snake_case для группировки статистики, например 'sign_error', 'fraction_reduction'. null если ответ верный.",
      },
      mistake_type_ru: {
        type: ["string", "null"],
        description: "То же самое, но короткое название на русском языке для показа пользователю в статистике, например 'Ошибка со знаком', 'Сокращение дробей'. null если ответ верный.",
      },
    },
    required: ["is_correct", "feedback", "mistake_type", "mistake_type_ru"],
    additionalProperties: false,
  },
};

/** Проверяет ответ ученика на конкретный вопрос практики, определяет тип ошибки для аналитики */
export async function checkPracticeAnswer(params: {
  subjectId: string;
  topicId: string;
  question: PracticeQuestion;
  userAnswer: string;
}): Promise<AnswerCheckResult> {
  const contextBlock = buildStudentContext({ subjectId: params.subjectId, topicId: params.topicId });
  const systemPrompt = buildSystemPrompt({ subjectId: params.subjectId, contextBlock });

  const userPrompt = `Задание: ${params.question.question}
Правильный ответ (эталон): ${params.question.correct_answer}
Ответ ученика: ${params.userAnswer}

Проверь ответ ученика. Если он неверный — определи конкретный тип ошибки (короткий тег) и дай краткую обратную связь, указывающую на шаг с ошибкой, но не выдавай сразу полное решение.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return callOpenRouterJson<AnswerCheckResult>(messages, ANSWER_CHECK_SCHEMA, { temperature: 0.3 });
}
