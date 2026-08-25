import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import {
  getActiveProviderId,
  setActiveProviderId,
  getKeyFor,
  setKeyFor,
  clearKeyFor,
  getCustomModel,
  setCustomModel,
  getCustomBaseUrl,
  setCustomBaseUrl,
  resetToDefaults,
  PROVIDERS,
  ProviderId,
} from "../../lib/ai/providers";
import { resetDatabase } from "../../lib/db/client";
import { Card } from "../../components/Card";
import { colors, spacing, radius } from "../../components/theme";
import { Icon } from "../../components/icons/Icon";

const PROVIDER_ORDER: Exclude<ProviderId, "custom">[] = [
  "openrouter",
  "gigachat",
  "openai",
  "anthropic",
  "deepseek",
  "google",
];

export default function SettingsScreen() {
  const [activeProvider, setActiveProvider] = useState<ProviderId>("openrouter");
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelInput, setModelInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [savedModel, setSavedModel] = useState<string | null>(null);
  const [savedBaseUrl, setSavedBaseUrl] = useState<string | null>(null);
  const [advancedStatus, setAdvancedStatus] = useState<"idle" | "saved">("idle");

  const providerDef = PROVIDERS[activeProvider as Exclude<ProviderId, "custom">] ?? PROVIDERS.openrouter;

  async function loadForProvider(id: ProviderId) {
    const k = await getKeyFor(id);
    setSavedKey(k);
    setKey("");
    setStatus("idle");
  }

  useEffect(() => {
    getActiveProviderId().then((id) => {
      setActiveProvider(id);
      loadForProvider(id);
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

  async function handleSelectProvider(id: ProviderId) {
    setActiveProvider(id);
    await setActiveProviderId(id);
    await loadForProvider(id);
  }

  async function handleSaveKey() {
    if (!key.trim()) return;
    await setKeyFor(activeProvider, key.trim());
    setSavedKey(key.trim());
    setKey("");
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleClearKey() {
    await clearKeyFor(activeProvider);
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
      "Это удалит профиль, XP, прогресс по темам, чаты и историю ошибок. Действие необратимо.",
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
        <Text style={styles.sectionTitle}>Нейросеть</Text>
        <Text style={styles.hint}>Выбери провайдера — для каждого свой API-ключ, они хранятся отдельно.</Text>

        <View style={styles.providerGrid}>
          {PROVIDER_ORDER.map((id) => {
            const def = PROVIDERS[id];
            const isActive = activeProvider === id;
            return (
              <Pressable
                key={id}
                style={[styles.providerChip, isActive && styles.providerChipActive]}
                onPress={() => handleSelectProvider(id)}
              >
                <Text style={[styles.providerChipText, isActive && styles.providerChipTextActive]}>
                  {def.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.hint}>{providerDef.keyHint}</Text>

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
          placeholder={providerDef.keyPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={key}
          onChangeText={setKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.rowBetween}>
          {providerDef.docsUrl && (
            <Pressable onPress={() => Linking.openURL(providerDef.docsUrl!)}>
              <Text style={styles.docsLink}>Где взять ключ →</Text>
            </Pressable>
          )}
          <Pressable style={styles.saveButtonSmall} onPress={handleSaveKey}>
            {status === "saved" ? (
              <View style={styles.saveButtonRow}>
                <Icon name="check" size={15} color={colors.background} />
                <Text style={styles.saveButtonText}>Сохранено</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Сохранить ключ</Text>
            )}
          </Pressable>
        </View>

        {activeProvider === "gigachat" && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Если запросы к GigaChat падают с сетевой ошибкой — на устройстве может не хватать
              корневого сертификата НУЦ Минцифры, который требует Сбер для TLS. Установи его через
              Госуслуги (раздел о безопасном интернете) и попробуй снова.
            </Text>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.advancedToggle} onPress={() => setShowAdvanced((v) => !v)}>
          <Text style={styles.sectionTitle}>Своя модель для «{providerDef.label}»</Text>
          <Icon name={showAdvanced ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </Pressable>

        {!showAdvanced && (savedModel || savedBaseUrl) && (
          <Text style={styles.hint}>
            Используется: {savedModel || providerDef.defaultModel}
            {savedBaseUrl ? ` на ${savedBaseUrl}` : ""}
          </Text>
        )}

        {showAdvanced && (
          <>
            <Text style={styles.hint}>
              По умолчанию используется модель {providerDef.defaultModel}. Здесь можно указать другую
              модель этого же провайдера, либо полностью переопределить Base URL (например, свой
              прокси, совместимый с этим же форматом API).
            </Text>

            <Text style={styles.fieldLabel}>Модель</Text>
            <TextInput
              style={styles.input}
              placeholder={providerDef.defaultModel}
              placeholderTextColor={colors.textMuted}
              value={modelInput}
              onChangeText={setModelInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Base URL</Text>
            <TextInput
              style={styles.input}
              placeholder={providerDef.defaultBaseUrl}
              placeholderTextColor={colors.textMuted}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.advancedActionsRow}>
              <Pressable style={styles.resetLinkButton} onPress={handleResetAdvanced}>
                <Text style={styles.resetLinkText}>Сбросить к умолчаниям</Text>
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
        <Text style={styles.hint}>
          В каждой теме можно вести сколько угодно отдельных чатов — список чатов открывается прямо
          на экране темы, там же можно начать новый или удалить старый.
        </Text>
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
  providerGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  providerChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceElevated,
  },
  providerChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  providerChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  providerChipTextActive: { color: colors.background },
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docsLink: { color: colors.textSecondary, fontSize: 13, textDecorationLine: "underline" },
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
  warnBox: {
    backgroundColor: "#332200",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  warnText: { color: "#FFD966", fontSize: 12, lineHeight: 17 },
});
