import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import {
  getOrCreateCheatSession,
  getCheatSessionMessages,
  sendCheatModeMessage,
} from "../lib/ai/cheatMode";
import { OpenRouterError } from "../lib/ai/openrouter";
import { colors, spacing, radius } from "../components/theme";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Отдельный от обычного учебного чата экран. Здесь нет кнопки "Я ничего не понял"
 * (она про постепенное объяснение — противоположность смыслу этого режима), нет
 * привязки к теме/предмету и не проверяются достижения — это разовый быстрый инструмент,
 * а не часть образовательного трека.
 */
export default function CheatModeScreen() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const sid = getOrCreateCheatSession();
    setSessionId(sid);
    const history = getCheatSessionMessages(sid);
    setMessages(history);
    if (history.length > 0) scrollToBottom();
  }, []);

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSend() {
    if (!sessionId) return;
    const text = input.trim();
    if (!text) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    scrollToBottom();

    try {
      const reply = await sendCheatModeMessage({ sessionId, userMessage: text });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Произошла ошибка. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "🆘 Срочно списать" }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Только для реально трудных дней. Здесь не учат — здесь быстро решают.
          </Text>
        </View>

        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Пришли текст задания (можно сразу несколько пунктов) — отвечу максимально быстро и по делу.
              </Text>
            </View>
          )}
          {messages.map((m, idx) => (
            <View
              key={idx}
              style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}
            >
              <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                {m.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={styles.loadingText}>Решаю...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Вставь текст задания..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
          />
          <Pressable style={styles.sendButton} onPress={handleSend} disabled={loading || !input.trim()}>
            <Text style={styles.sendButtonText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  warningBanner: {
    backgroundColor: "#3A1414",
    borderBottomWidth: 1,
    borderBottomColor: "#5C1F1F",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  warningText: { color: "#FF9B9B", fontSize: 12, textAlign: "center" },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.md, gap: spacing.sm },
  emptyState: { paddingVertical: spacing.xl, alignItems: "center" },
  emptyStateText: { color: colors.textMuted, textAlign: "center", paddingHorizontal: spacing.lg },
  bubble: { maxWidth: "85%", padding: spacing.sm, borderRadius: radius.md },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.textPrimary },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleTextUser: { color: colors.background, fontSize: 15, lineHeight: 21 },
  bubbleTextAssistant: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  loadingRow: { paddingVertical: spacing.sm, alignItems: "flex-start", flexDirection: "row", gap: spacing.xs },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  errorText: { color: colors.error, fontSize: 13, paddingVertical: spacing.xs },
  inputRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.textPrimary,
    maxHeight: 120,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.textPrimary,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: { color: colors.background, fontSize: 18, fontWeight: "700" },
});
