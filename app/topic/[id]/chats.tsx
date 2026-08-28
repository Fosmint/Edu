import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from "expo-router";
import { getTopic, TopicWithProgress } from "../../../lib/db/subjectsRepo";
import { listChatsForTopic, createChat, deleteChat, ChatSummary } from "../../../lib/ai/teacherChat";
import { colors, spacing, radius } from "../../../components/theme";
import { Icon } from "../../../components/icons/Icon";

/**
 * Список чатов по теме. Раньше на тему был ровно один "вечный" чат — теперь можно
 * заводить сколько угодно отдельных чатов (например для разных заданий или разных
 * заходов к теме), чтобы контекст, а с ним и токены на запрос, не разрастались бесконечно
 * в одном диалоге.
 */
export default function TopicChatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<TopicWithProgress | null | undefined>(undefined);
  const [chats, setChats] = useState<ChatSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const found = getTopic(id);
      setTopic(found ?? null);
      if (found) setChats(listChatsForTopic(found.id));
    }, [id])
  );

  function handleNewChat() {
    if (!topic) return;
    const sessionId = createChat({ subjectId: topic.subject_id, topicId: topic.id });
    router.push(`/topic/${topic.id}/chat/${sessionId}`);
  }

  function handleDeleteChat(chat: ChatSummary) {
    Alert.alert("Удалить чат?", `«${chat.title}» будет удалён безвозвратно, вместе со всей историей.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          deleteChat(chat.id);
          if (topic) setChats(listChatsForTopic(topic.id));
        },
      },
    ]);
  }

  if (topic === undefined) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (topic === null) {
    return (
      <>
        <Stack.Screen options={{ title: "Тема не найдена" }} />
        <View style={styles.centerScreen}>
          <Text style={styles.errorTitle}>Не удалось найти эту тему</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: topic.name,
          headerRight: () => (
            <Pressable onPress={handleNewChat} hitSlop={10} style={{ paddingHorizontal: 4 }}>
              <Icon name="plus" size={22} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Пока нет ни одного чата</Text>
            <Text style={styles.emptyStateText}>
              Заведи новый чат, чтобы начать разбирать тему «{topic.name}» с преподавателем.
            </Text>
            <Pressable style={styles.newChatButtonBig} onPress={handleNewChat}>
              <Icon name="plus" size={18} color={colors.background} />
              <Text style={styles.newChatButtonBigText}>Новый чат</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.chatRow}
                onPress={() => router.push(`/topic/${topic.id}/chat/${item.id}`)}
                onLongPress={() => handleDeleteChat(item)}
              >
                <View style={styles.chatRowMain}>
                  <Text style={styles.chatTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {item.lastMessagePreview || "Пока нет сообщений"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteChat(item)}
                  hitSlop={10}
                  style={styles.deleteButton}
                >
                  <Icon name="trash" size={16} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  chatRowMain: { flex: 1, gap: 2 },
  chatTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  chatPreview: { color: colors.textMuted, fontSize: 13 },
  deleteButton: { padding: spacing.xs },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "700" },
  emptyStateText: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
  newChatButtonBig: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  newChatButtonBigText: { color: colors.background, fontWeight: "700", fontSize: 15 },
  centerScreen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  errorTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "700" },
});
