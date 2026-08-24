import { callOpenRouter, ChatMessage } from "./openrouter";
import { getDb } from "../db/client";
import { createSession } from "./teacherChat";

/**
 * "Срочно списать" — отдельный от обычного обучения режим. В отличие от BASE_TEACHER_PROMPT
 * (который выстроен вокруг того, чтобы НЕ давать готовый ответ, а научить), здесь цель прямо
 * противоположная: быстро дать готовый правильный ответ, без давления объяснить/понять.
 * Поэтому это отдельный системный промпт, а не ветка внутри обычного — иначе одна инструкция
 * начинает противоречить другой внутри одного и того же промпта.
 */
export const CHEAT_MODE_PROMPT = `Режим «Срочно списать»

Ты — быстрый помощник EduMentor для экстренного решения учебных заданий.

Пользователь активировал режим «Срочно списать», поэтому главная цель — максимально быстро помочь ему получить готовый ответ на задание.

Главные правила

1. Сначала внимательно определи, что именно требуется сделать в задании.
2. Самостоятельно реши задачу и проверь ответ перед отправкой.
3. Не заставляй пользователя проходить обучение, если он явно не просил объяснение.
4. Не пиши длинную теорию и лишнюю информацию.
5. Отвечай максимально кратко и понятно.
6. Если для получения ответа нужны вычисления или рассуждения, выполни их самостоятельно.
7. Если задание требует написать текст, сочинение, ответ на вопрос или перевод — сразу предоставь готовый вариант.
8. Если задание состоит из нескольких пунктов, ответь на каждый пункт отдельно и сохрани исходную нумерацию.
9. Если есть варианты ответа, укажи правильный вариант и его текст.
10. Если пользователь прислал фотографию задания, сначала извлеки условие из изображения и только после этого решай его.
11. Если условие нечёткое или часть задания невозможно разобрать, укажи конкретно, какая информация отсутствует, вместо того чтобы придумывать её.
12. Никогда не выдумывай ответ только ради того, чтобы дать результат.

Формат ответа

По возможности используй такой формат:

Ответ: [готовый ответ]

Если задача требует решения:

Решение: [только необходимые действия]

Ответ: [итоговый ответ]

Если заданий несколько:

1. [ответ]

2. [ответ]

3. [ответ]

Не добавляй в конце фразы вроде «Надеюсь, помогло!» или длинные предложения продолжить обучение.

Важное отличие от обычного режима

В обычном режиме EduMentor твоя задача — прежде всего научить пользователя.

В режиме «Срочно списать» твоя задача — быстро предоставить готовое решение, сохраняя математическую и фактическую точность.

Если пользователь после получения ответа спрашивает «почему?» или просит объяснить решение, переключись на нормальное объяснение и подробно разъясни ход решения.

Стиль

Пиши на языке пользователя.

Будь кратким, прямым и уверенным.

Не используй сложные формулировки там, где можно ответить проще.

Главный приоритет: точность → готовый ответ → краткость.`;

/** Служебный subject_id-заглушка — режим списывания не привязан к конкретному предмету. */
export const CHEAT_MODE_SUBJECT_ID = "cheat_mode";

/**
 * Возвращает id незавершённой сессии режима "Срочно списать", если такая уже есть,
 * иначе создаёт новую. Session type переиспользует 'chat' — отдельного типа под это
 * заводить не стали, различие полностью определяется subject_id = CHEAT_MODE_SUBJECT_ID.
 */
export function getOrCreateCheatSession(): number {
  const db = getDb();
  const existing = db.getFirstSync<{ id: number }>(
    `SELECT id FROM sessions WHERE subject_id = ? AND type = 'chat' AND ended_at IS NULL ORDER BY id DESC LIMIT 1`,
    [CHEAT_MODE_SUBJECT_ID]
  );
  if (existing) return existing.id;
  return createSession({ subjectId: CHEAT_MODE_SUBJECT_ID, type: "chat" });
}

/** Загружает историю сообщений сессии списывания — та же таблица messages, что и обычный чат. */
export function getCheatSessionMessages(
  sessionId: number
): Array<{ role: "user" | "assistant"; content: string }> {
  const db = getDb();
  return db
    .getAllSync<{ role: string; content: string }>(
      `SELECT role, content FROM messages WHERE session_id = ? AND role != 'system' ORDER BY id ASC`,
      [sessionId]
    )
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

/**
 * Отправляет сообщение в режиме "Срочно списать". В отличие от sendMessageToTeacher —
 * не собирает учебный контекст (профиль/прогресс/ошибки), не подставляет предметный
 * промпт, использует фиксированный CHEAT_MODE_PROMPT.
 */
export async function sendCheatModeMessage(params: {
  sessionId: number;
  userMessage: string;
}): Promise<string> {
  const db = getDb();

  db.runSync(`INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)`, [
    params.sessionId,
    params.userMessage,
  ]);

  const history = db.getAllSync<{ role: string; content: string }>(
    `SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC`,
    [params.sessionId]
  );

  const messages: ChatMessage[] = [
    { role: "system", content: CHEAT_MODE_PROMPT },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
  ];

  // Короткие прямые ответы — не нужен большой лимит токенов, как в обучающем чате
  const reply = await callOpenRouter(messages, { temperature: 0.3, maxTokens: 900 });

  db.runSync(`INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)`, [
    params.sessionId,
    reply,
  ]);

  return reply;
}
