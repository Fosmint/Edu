import { callOpenRouterJson, ChatMessage } from "./openrouter";
import { getDb } from "../db/client";
import { getAllSubjects } from "../db/subjectsRepo";

export interface TopicSuggestion {
  subject_id: string; // 'math' | 'russian' | 'english' | 'chemistry' | 'physics'
  topic_name: string;
  topic_description: string;
  suggested_difficulty_tier: 1 | 2 | 3 | 4;
  parent_topic_name: string | null; // название темы-родителя среди уже существующих, если есть логичная связь; иначе null
}

const TOPIC_SUGGESTION_SCHEMA = {
  name: "topic_suggestion",
  schema: {
    type: "object",
    properties: {
      subject_id: {
        type: "string",
        enum: ["math", "russian", "english", "chemistry", "physics"],
        description: "К какому из 5 предметов относится тема",
      },
      topic_name: { type: "string", description: "Короткое название темы, как в учебнике (2-4 слова)" },
      topic_description: { type: "string", description: "Однострочное описание, что входит в тему" },
      suggested_difficulty_tier: { type: "integer", enum: [1, 2, 3, 4] },
      parent_topic_name: {
        type: ["string", "null"],
        description: "Название темы-родителя из списка уже существующих тем этого предмета, если новая тема логически продолжает её. null если нет очевидной связи.",
      },
    },
    required: ["subject_id", "topic_name", "topic_description", "suggested_difficulty_tier", "parent_topic_name"],
    additionalProperties: false,
  },
};

/**
 * Разбирает свободный текст пользователя ("щас проходим квадратные уравнения")
 * и определяет, какую тему и в какой предмет нужно добавить.
 */
export async function suggestTopicFromText(userText: string): Promise<TopicSuggestion> {
  const db = getDb();
  const subjects = getAllSubjects();

  // Собираем список уже существующих тем по каждому предмету, чтобы ИИ мог найти логичного родителя
  const existingTopicsBySubject = subjects
    .map((s) => {
      const topics = db.getAllSync<{ name: string }>(
        `SELECT name FROM topics WHERE subject_id = ? ORDER BY sort_order`,
        [s.id]
      );
      return `${s.name} (${s.id}): ${topics.map((t) => t.name).join(", ") || "тем пока нет"}`;
    })
    .join("\n");

  const systemPrompt = `Ты помогаешь определить school-тему по свободному описанию ученика для образовательного приложения с 5 предметами: Математика (math), Русский язык (russian), Английский язык (english), Химия (chemistry), Физика (physics).

Уже существующие темы по предметам:
${existingTopicsBySubject}

Твоя задача: по сообщению ученика определить предмет, дать теме короткое каноничное название (как в учебнике), краткое описание, разумный уровень сложности для начала (обычно 1 или 2, если это не явно продвинутая тема), и найти логичного родителя среди существующих тем этого предмета — если новая тема является естественным продолжением одной из них.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];

  return callOpenRouterJson<TopicSuggestion>(messages, TOPIC_SUGGESTION_SCHEMA, { temperature: 0.3 });
}

/**
 * Создаёт новую тему в БД на основе предложения ИИ. Тема сразу разблокирована
 * (пользователь явно сказал, что её сейчас проходит).
 */
export function createTopicFromSuggestion(suggestion: TopicSuggestion): string {
  const db = getDb();
  const topicId = `${suggestion.subject_id}_custom_${Date.now()}`;

  // withTransactionSync в expo-sqlite не возвращает значение callback'а,
  // поэтому результат забираем через замыкание, а не через return транзакции
  db.withTransactionSync(() => {
    let parentId: string | null = null;
    if (suggestion.parent_topic_name) {
      const parent = db.getFirstSync<{ id: string }>(
        `SELECT id FROM topics WHERE subject_id = ? AND name = ?`,
        [suggestion.subject_id, suggestion.parent_topic_name]
      );
      parentId = parent?.id ?? null;
    }

    const maxOrderRow = db.getFirstSync<{ max_order: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM topics WHERE subject_id = ?`,
      [suggestion.subject_id]
    );
    const sortOrder = (maxOrderRow?.max_order ?? 0) + 1;

    db.runSync(
      `INSERT INTO topics (id, subject_id, parent_id, name, description, sort_order, min_difficulty_tier, is_unlocked, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'available')`,
      [
        topicId,
        suggestion.subject_id,
        parentId,
        suggestion.topic_name,
        suggestion.topic_description,
        sortOrder,
        suggestion.suggested_difficulty_tier,
      ]
    );

    db.runSync(`INSERT INTO topic_progress (topic_id, current_difficulty_tier) VALUES (?, ?)`, [
      topicId,
      suggestion.suggested_difficulty_tier,
    ]);
  });

  return topicId;
}
