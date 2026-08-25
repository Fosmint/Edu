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
import { useLocalSearchParams, Stack } from "expo-router";
import { getTopic, TopicWithProgress } from "../../../../lib/db/subjectsRepo";
import {
  getSessionMessages,
  sendMessageToTeacher,
  requestSimplerExplanation,
} from "../../../../lib/ai/teacherChat";
import { OpenRouterError } from "../../../../lib/ai/openrouter";
import { useProfileStore } from "../../../../stores/useProfileStore";
import { colors, spacing, radius } from "../../../../components/theme";
import { Icon } from "../../../../components/icons/Icon";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
}

/** Экран одного конкретного чата (сессии) по теме — сам диалог с преподавателем. */
export default function TopicChatSessionScreen() {
  const { id, sessionId: sessionIdParam } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const sessionId = Number(sessionIdParam);
  const [topic, setTopic] = useState<TopicWithProgress | null | undefined>(undefined);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const checkAchievements = useProfileStore((s) => s.checkAchievements);

  useEffect(() => {
    if (!id) return;
    const found = getTopic(id);
    setTopic(found ?? null);
  }, [id]);

  useEffect(() => {
    if (!topic || !sessionId) return;
    const history = getSessionMessages(sessionId);
    setMessages(history);
    if (history.length > 0) scrollToBottom();
    checkAchievements();
  }, [topic?.id, sessionId]);

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSend(overrideText?: string) {
    if (!topic || !sessionId) return;
    const text = overrideText ?? input.trim();
    if (!text) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    scrollToBottom();

    try {
      const reply = await sendMessageToTeacher({
        sessionId,
        subjectId: topic.subject_id,
        topicId: topic.id,
        sessionType: "chat",
        userMessage: text,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Произошла ошибка. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDidntUnderstand() {
    if (!topic || !sessionId) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: "Я ничего не понял" }]);
    setLoading(true);
    scrollToBottom();

    try {
      const reply = await requestSimplerExplanation({
        sessionId,
        subjectId: topic.subject_id,
        topicId: topic.id,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      scrollToBottom();
    } catch (e) {
      setError(e instanceof OpenRouterError ? e.message : "Произошла ошибка. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  if (topic === undefined) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (topic === null || !sessionId) {
    return (
      <>
        <Stack.Screen options={{ title: "Чат не найден" }} />
        <View style={styles.centerScreen}>
          <Text style={styles.errorTitle}>Не удалось найти этот чат</Text>
          <Text style={styles.errorSubtitle}>
            Возможно, он был удалён. Вернись назад к списку чатов и попробуй снова.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: topic.name }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Напиши, что хочешь разобрать по теме «{topic.name}», или просто скажи «не понимаю».
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
              <Text style={styles.loadingText}>Печатает...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <Pressable style={styles.confusedButton} onPress={handleDidntUnderstand} disabled={loading}>
          <View style={styles.confusedButtonRow}>
            <Icon name="confused" size={16} color={colors.textPrimary} />
            <Text style={styles.confusedButtonText}>Я ничего не понял</Text>
          </View>
        </Pressable>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Напиши сообщение..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
          />
          <Pressable style={styles.sendButton} onPress={() => handleSend()} disabled={loading || !input.trim()}>
            <Icon name="send" size={18} color={colors.background} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  confusedButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  confusedButtonText: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  confusedButtonRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
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
  centerScreen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  errorTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "700", textAlign: "center" },
  errorSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
