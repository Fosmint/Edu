import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { listCheatChats, createCheatChat, deleteCheatChat, CheatChatSummary } from "../../lib/ai/cheatMode";
import { colors, spacing, radius } from "../../components/theme";
import { Icon } from "../../components/icons/Icon";

/**
 * Список отдельных чатов режима "Срочно списать" — как и обычные учебные чаты,
 * их можно вести сразу несколько (например по разным предметам за один вечер),
 * не смешивая контекст в одном бесконечном диалоге.
 */
export default function CheatModeListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<CheatChatSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      setChats(listCheatChats());
    }, [])
  );

  function handleNewChat() {
    const sessionId = createCheatChat();
    router.push(`/cheat-mode/${sessionId}`);
  }

  function handleDeleteChat(chat: CheatChatSummary) {
    Alert.alert("Удалить чат?", `«${chat.title}» будет удалён безвозвратно.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          deleteCheatChat(chat.id);
          setChats(listCheatChats());
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Срочно списать",
          headerRight: () => (
            <Pressable onPress={handleNewChat} hitSlop={10} style={{ paddingHorizontal: 4 }}>
              <Icon name="plus" size={22} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Только для реально трудных дней. Здесь не учат — здесь быстро решают.
          </Text>
        </View>

        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Пока нет ни одного чата</Text>
            <Text style={styles.emptyStateText}>
              Заведи новый чат и пришли текст задания — отвечу максимально быстро и по делу.
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
                onPress={() => router.push(`/cheat-mode/${item.id}`)}
                onLongPress={() => handleDeleteChat(item)}
              >
                <View style={styles.chatRowMain}>
                  <Text style={styles.chatTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.chatMeta}>{item.messageCount} сообщений</Text>
                </View>
                <Pressable onPress={() => handleDeleteChat(item)} hitSlop={10} style={styles.deleteButton}>
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
  warningBanner: {
    backgroundColor: "#3A1414",
    borderBottomWidth: 1,
    borderBottomColor: "#5C1F1F",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  warningText: { color: "#FF9B9B", fontSize: 12, textAlign: "center" },
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
  chatMeta: { color: colors.textMuted, fontSize: 13 },
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
});
