import * as SecureStore from "expo-secure-store";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Дефолтная модель. DeepSeek V4 Flash 0731 — конкретная стабильная (GA) ревизия
// на август 2026: дешёвая, быстрая, 1M контекст. Используем точный id вместо
// алиаса "-latest", потому что latest-алиасы на OpenRouter требуют префикс "~"
// (например ~deepseek/deepseek-v4-flash-latest), а с обычным provider/model
// такой суффикс возвращает 400 Invalid model ID.
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash-0731";

const STORAGE_KEYS = {
  apiKey: "edumentor_openrouter_api_key",
  model: "edumentor_ai_model",
  baseUrl: "edumentor_ai_base_url",
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ===== Настройки провайдера (ключ, модель, base URL) =====

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.apiKey);
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.apiKey, key);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.apiKey);
}

/** Возвращает выбранную пользователем модель, либо null если используется дефолт */
export async function getCustomModel(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.model);
}

export async function setCustomModel(model: string): Promise<void> {
  if (!model.trim()) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.model);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEYS.model, model.trim());
}

/** Возвращает выбранный пользователем base URL, либо null если используется OpenRouter по умолчанию */
export async function getCustomBaseUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.baseUrl);
}

export async function setCustomBaseUrl(url: string): Promise<void> {
  if (!url.trim()) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.baseUrl);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEYS.baseUrl, url.trim());
}

/** Сбрасывает модель и base URL к значениям по умолчанию (OpenRouter + DeepSeek V4 Flash) */
export async function resetToDefaults(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.model);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.baseUrl);
}

/** Текущая эффективная конфигурация — то, что реально будет использовано при вызове */
export async function getEffectiveConfig(): Promise<{ baseUrl: string; model: string; isCustom: boolean }> {
  const [customModel, customBaseUrl] = await Promise.all([getCustomModel(), getCustomBaseUrl()]);
  return {
    baseUrl: customBaseUrl || DEFAULT_BASE_URL,
    model: customModel || DEFAULT_MODEL,
    isCustom: !!(customModel || customBaseUrl),
  };
}

// ===== Вызовы API =====

interface CallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: { name: string; schema: object }; // для structured output
}

export class OpenRouterError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Базовый вызов chat completions. Использует кастомные base URL/модель, если пользователь
 * их задал в настройках, иначе — OpenRouter + DeepSeek V4 Flash по умолчанию.
 * Бросает OpenRouterError с понятным сообщением при отсутствии ключа, сетевой ошибке или ошибке API.
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  options: CallOptions = {}
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new OpenRouterError("API-ключ не задан. Добавь его в настройках приложения.");
  }

  const { baseUrl, model } = await getEffectiveConfig();

  const body: Record<string, unknown> = {
    model: options.model ?? model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1500,
  };

  if (options.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: options.jsonSchema.name,
        strict: true,
        schema: options.jsonSchema.schema,
      },
    };
  }

  const MAX_ATTEMPTS = 2;
  let lastError: OpenRouterError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45с таймаут на запрос

      response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://edumentor.local",
          "X-Title": "EduMentor",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (e) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      lastError = new OpenRouterError(
        isAbort
          ? "Модель отвечает слишком долго. Проверь интернет-соединение и попробуй снова."
          : "Нет соединения с сетью. Проверь интернет и попробуй снова."
      );
      continue; // пробуем ещё раз, если остались попытки
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      lastError = new OpenRouterError(
        `Ошибка API (${response.status}): ${errText || response.statusText}`,
        response.status
      );
      // Нет смысла повторять при явной ошибке клиента (неверный ключ, неверная модель и т.п.)
      if (response.status >= 400 && response.status < 500) {
        throw lastError;
      }
      continue;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || content.length === 0) {
      lastError = new OpenRouterError("Пустой ответ от модели. Попробуй переформулировать запрос.");
      continue; // иногда бывает пустой ответ с первой попытки — пробуем снова
    }

    return content;
  }

  throw lastError ?? new OpenRouterError("Не удалось получить ответ от модели.");
}

/** Вызов с ожиданием строгого JSON-ответа (для практики/экзаменов/диагностики) */
export async function callOpenRouterJson<T>(
  messages: ChatMessage[],
  jsonSchema: { name: string; schema: object },
  options: Omit<CallOptions, "jsonSchema"> = {}
): Promise<T> {
  const raw = await callOpenRouter(messages, { ...options, jsonSchema });
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new OpenRouterError("Модель вернула некорректный JSON. Попробуй ещё раз.");
  }
}
