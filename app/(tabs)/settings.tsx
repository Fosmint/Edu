import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  getCustomModel,
  setCustomModel,
  getCustomBaseUrl,
  setCustomBaseUrl,
  resetToDefaults,
  DEFAULT_MODEL,
} from "../../lib/ai/openrouter";
import { resetDatabase } from "../../lib/db/client";
import { Card } from "../../components/Card";
import { colors, spacing, radius } from "../../components/theme";
import { Icon } from "../../components/icons/Icon";

const DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export default function SettingsScreen() {
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelInput, setModelInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [savedModel, setSavedModel] = useState<string | null>(null);
  const [savedBaseUrl, setSavedBaseUrl] = useState<string | null>(null);
  const [advancedStatus, setAdvancedStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    getApiKey().then((k) => {
      if (k) setSavedKey(k);
    });
    getCustomModel().then((m) => {
      if (m) {
        setSavedModel(m);
        setModelInput(m);
        setShowAdvanced(true);
      }
    });
    getCustomBaseUrl().then((u) => {
      if (u) {
        setSavedBaseUrl(u);
        setBaseUrlInput(u);
        setShowAdvanced(true);
      }
    });
  }, []);

  async function handleSaveKey() {
    if (!key.trim()) return;
    await setApiKey(key.trim());
    setSavedKey(key.trim());
    setKey("");
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleClearKey() {
    await clearApiKey();
    setSavedKey(null);
  }

  async function handleSaveAdvanced() {
    await setCustomModel(modelInput);
    await setCustomBaseUrl(baseUrlInput);
    setSavedModel(modelInput.trim() || null);
    setSavedBaseUrl(baseUrlInput.trim() || null);
    setAdvancedStatus("saved");
    setTimeout(() => setAdvancedStatus("idle"), 2000);
  }

  async function handleResetAdvanced() {
    await resetToDefaults();
    setModelInput("");
    setBaseUrlInput("");
    setSavedModel(null);
    setSavedBaseUrl(null);
  }

  function handleResetDb() {
    Alert.alert(
      "Сбросить весь прогресс?",
      "Это удалит профиль, XP, прогресс по темам и историю ошибок. Действие необратимо.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Сбросить",
          style: "destructive",
          onPress: () => resetDatabase(),
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Настройки</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>API-ключ</Text>
        <Text style={styles.hint}>
          По умолчанию используется OpenRouter с моделью {DEFAULT_MODEL}. Ключ хранится локально на
          устройстве в зашифрованном хранилище и никуда не отправляется, кроме запросов к выбранному
          провайдеру.
        </Text>

        {savedKey && (
          <View style={styles.savedRow}>
            <Text style={styles.savedText}>
              Текущий ключ: {savedKey.slice(0, 6)}...{savedKey.slice(-4)}
            </Text>
            <Pressable onPress={handleClearKey}>
              <Text style={styles.clearLink}>Удалить</Text>
            </Pressable>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="sk-or-v1-..."
          placeholderTextColor={colors.textMuted}
          value={key}
          onChangeText={setKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.saveButton} onPress={handleSaveKey}>
          {status === "saved" ? (
            <View style={styles.saveButtonRow}>
              <Icon name="check" size={15} color={colors.background} />
              <Text style={styles.saveButtonText}>Сохранено</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Сохранить ключ</Text>
          )}
        </Pressable>
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.advancedToggle} onPress={() => setShowAdvanced((v) => !v)}>
          <Text style={styles.sectionTitle}>Своя модель / провайдер</Text>
          <Icon name={showAdvanced ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </Pressable>

        {!showAdvanced && (savedModel || savedBaseUrl) && (
          <Text style={styles.hint}>
            Используется: {savedModel || DEFAULT_MODEL}
            {savedBaseUrl ? ` на ${savedBaseUrl}` : ""}
          </Text>
        )}

        {showAdvanced && (
          <>
            <Text style={styles.hint}>
              По умолчанию приложение использует OpenRouter. Здесь можно задать любую другую модель на
              OpenRouter (просто впиши её id) или полностью свой провайдер, совместимый с OpenAI Chat
              Completions API (свой Base URL + модель + ключ выше).
            </Text>

            <Text style={styles.fieldLabel}>Модель</Text>
            <TextInput
              style={styles.input}
              placeholder={DEFAULT_MODEL}
              placeholderTextColor={colors.textMuted}
              value={modelInput}
              onChangeText={setModelInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Base URL</Text>
            <TextInput
              style={styles.input}
              placeholder={DEFAULT_OPENROUTER_URL}
              placeholderTextColor={colors.textMuted}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.advancedActionsRow}>
              <Pressable style={styles.resetLinkButton} onPress={handleResetAdvanced}>
                <Text style={styles.resetLinkText}>Сбросить к OpenRouter</Text>
              </Pressable>
              <Pressable style={styles.saveButtonSmall} onPress={handleSaveAdvanced}>
                {advancedStatus === "saved" ? (
                  <View style={styles.saveButtonRow}>
                    <Icon name="check" size={15} color={colors.background} />
                    <Text style={styles.saveButtonText}>Сохранено</Text>
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Сохранить</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Данные</Text>
        <Pressable style={styles.dangerButton} onPress={handleResetDb}>
          <Text style={styles.dangerButtonText}>Сбросить весь прогресс</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  card: { gap: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  savedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  savedText: { color: colors.textSecondary, fontSize: 13 },
  clearLink: { color: colors.error, fontSize: 13, fontWeight: "600" },
  fieldLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveButtonSmall: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  saveButtonText: { color: colors.background, fontWeight: "700" },
  saveButtonRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  advancedToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  advancedActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  resetLinkButton: { paddingVertical: spacing.sm },
  resetLinkText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: "underline" },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  dangerButtonText: { color: colors.error, fontWeight: "600" },
});
