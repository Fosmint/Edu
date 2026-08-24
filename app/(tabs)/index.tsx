import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useProfileStore } from "../../stores/useProfileStore";
import { useSubjectsStore } from "../../stores/useSubjectsStore";
import { xpForLevel } from "../../lib/db/profileRepo";
import { getTopicsDueForReview } from "../../lib/srs/sm2";
import { Card } from "../../components/Card";
import { ProgressBar } from "../../components/ProgressBar";
import { colors, spacing, radius } from "../../components/theme";
import { Icon } from "../../components/icons/Icon";
import { resolveIconName } from "../../components/icons/iconMap";

export default function HomeScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const subjects = useSubjectsStore((s) => s.subjects);
  const refreshSubjects = useSubjectsStore((s) => s.refreshSubjects);

  useEffect(() => {
    refreshSubjects();
  }, []);

  if (!profile) return null;

  const xpNeeded = xpForLevel(profile.level);
  const dueForReview = getTopicsDueForReview();

  // Простейшая эвристика рекомендации: предмет с наименьшим прогрессом
  const weakestSubject = [...subjects].sort(
    (a, b) => a.overall_progress_pct - b.overall_progress_pct
  )[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>Привет, {profile.name}</Text>
          <Icon name="wave" size={22} color={colors.textPrimary} />
        </View>
        <View style={styles.streakBadge}>
          <Icon name="flame" size={15} color={colors.textPrimary} />
          <Text style={styles.streakText}>{profile.streak_days}</Text>
        </View>
      </View>

      <Card style={styles.levelCard}>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Уровень {profile.level}</Text>
          <Text style={styles.xpLabel}>
            {profile.xp} / {xpNeeded} XP
          </Text>
        </View>
        <ProgressBar percent={(profile.xp / xpNeeded) * 100} height={10} />
      </Card>

      <Pressable style={styles.addTopicButton} onPress={() => router.push("/add-topic")}>
        <Icon name="pencil" size={17} color={colors.background} />
        <Text style={styles.addTopicButtonText}>Что сейчас проходим в школе?</Text>
      </Pressable>

      {dueForReview.length > 0 && (
        <Card style={styles.reviewCard}>
          <View style={styles.sectionTitleRow}>
            <Icon name="pin" size={16} color={colors.textPrimary} />
            <Text style={styles.reviewTitle}>Пора повторить</Text>
          </View>
          <Text style={styles.reviewSubtitle}>
            {dueForReview.length} {pluralizeTopics(dueForReview.length)} ждут повторения
          </Text>
          <Pressable style={styles.reviewButton} onPress={() => router.push("/(tabs)/subjects")}>
            <Text style={styles.reviewButtonText}>Повторить сейчас</Text>
          </Pressable>
        </Card>
      )}

      {weakestSubject && (
        <Card>
          <View style={styles.sectionTitleRow}>
            <Icon name="lightbulb" size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Рекомендация на сегодня</Text>
          </View>
          <Text style={styles.recommendationText}>
            Твой прогресс по предмету «{weakestSubject.name}» пока ниже остальных —{" "}
            {Math.round(weakestSubject.overall_progress_pct)}%. Стоит уделить ему немного времени.
          </Text>
          <Pressable
            style={styles.recommendationButton}
            onPress={() => router.push(`/subject/${weakestSubject.id}`)}
          >
            <Icon name={resolveIconName(weakestSubject.icon)} size={16} color={colors.textPrimary} />
            <Text style={styles.recommendationButtonText}>
              Заняться {weakestSubject.name.toLowerCase()}
            </Text>
          </Pressable>
        </Card>
      )}

      <Text style={styles.sectionTitle}>Прогресс по предметам</Text>
      {subjects.map((s) => (
        <Card key={s.id} style={styles.subjectRow} onPress={() => router.push(`/subject/${s.id}`)}>
          <View style={styles.subjectRowTop}>
            <View style={styles.subjectNameRow}>
              <Icon name={resolveIconName(s.icon)} size={17} color={colors.textPrimary} />
              <Text style={styles.subjectName}>{s.name}</Text>
            </View>
            <Text style={styles.subjectPercent}>{Math.round(s.overall_progress_pct)}%</Text>
          </View>
          <ProgressBar percent={s.overall_progress_pct} />
        </Card>
      ))}

      <Pressable style={styles.boredButton} onPress={() => router.push("/(tabs)/subjects")}>
        <Icon name="dice" size={18} color={colors.textPrimary} />
        <Text style={styles.boredButtonText}>Мне скучно</Text>
      </Pressable>

      <Pressable style={styles.cheatButton} onPress={() => router.push("/cheat-mode")}>
        <View style={styles.cheatButtonRow}>
          <Text style={styles.cheatBadge}>SOS</Text>
          <Text style={styles.cheatButtonText}>Срочно списать</Text>
        </View>
        <Text style={styles.cheatButtonSubtitle}>только для реально трудных дней</Text>
      </Pressable>
    </ScrollView>
  );
}

function pluralizeTopics(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "тема";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "темы";
  return "тем";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  greeting: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  streakText: { color: colors.textPrimary, fontWeight: "600" },
  levelCard: { gap: spacing.sm },
  levelRow: { flexDirection: "row", justifyContent: "space-between" },
  levelLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  xpLabel: { color: colors.textSecondary, fontSize: 14 },
  reviewCard: { gap: spacing.xs },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  reviewTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  reviewSubtitle: { color: colors.textSecondary, fontSize: 14 },
  reviewButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  reviewButtonText: { color: colors.background, fontWeight: "700" },
  addTopicButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  addTopicButtonText: { color: colors.background, fontSize: 15, fontWeight: "700" },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: spacing.sm },
  recommendationText: { color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 },
  recommendationButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationButtonText: { color: colors.textPrimary, fontWeight: "600" },
  subjectRow: { gap: spacing.xs },
  subjectRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subjectNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  subjectName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  subjectPercent: { color: colors.textSecondary, fontSize: 14 },
  boredButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boredButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  cheatButton: {
    marginTop: spacing.xs,
    backgroundColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#5C2A2A",
    gap: spacing.xs,
  },
  cheatButtonRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  cheatBadge: {
    backgroundColor: colors.error,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  cheatButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  cheatButtonSubtitle: { color: colors.textMuted, fontSize: 12 },
});
