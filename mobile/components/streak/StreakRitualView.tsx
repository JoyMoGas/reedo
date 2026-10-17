/**
 * @project Reedo
 * @module StreakRitualView
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "../../core/Icon";

interface StreakRitualViewProps {
  onBackToCalendar: () => void;
  onStartReading: () => void;
}

export default function StreakRitualView({
  onBackToCalendar,
  onStartReading,
}: StreakRitualViewProps) {
  return (
    <View style={styles.container}>
      {/* Header Lore (Figma Style) */}
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>The Ritual of Reading</Text>
        <Text style={styles.headerSubtitle}>
          Wisdom is not found in a single sitting, but in the steady drip of the ink. Understand
          your journey within the archive.
        </Text>
      </View>

      {/* Section 1: What is a Streak? (Figma Image 3) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.iconSquare}>
            <Icon name="bookOpen" size={20} color="#212842" />
          </View>
          <Text style={styles.sectionHeading}>What is a Streak?</Text>
        </View>

        <View style={styles.contentCardParchment}>
          <Text style={styles.parchmentBody}>
            Maintain your momentum by engaging in{" "}
            <Text style={styles.boldText}>Immersion Mode</Text> for at least 15 minutes a day or
            cataloging your active reading progress.
            {"\n\n"}
            Like a lighthouse beam across the waves, your streak is testament to your enduring
            dedication to the written word.
          </Text>
        </View>
      </View>

      {/* Section 2: Streak Protectors (Ink Blots) (Figma Image 3) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.iconSquare}>
            <Icon name="quillWrite" size={20} color="#212842" />
          </View>
          <View>
            <Text style={styles.sectionHeading}>Streak Protectors</Text>
            <Text style={styles.sectionSubheading}>(Ink Blots)</Text>
          </View>
        </View>

        {/* How to Earn */}
        <View style={styles.subCard}>
          <Text style={styles.subCardTag}>HOW TO EARN</Text>
          <Text style={styles.subCardBody}>
            A new Ink Blot is distilled for every 10 consecutive days of focused reading or by
            completing weekly Curated Quests.
          </Text>
        </View>

        {/* The Effect */}
        <View style={styles.subCard}>
          <Text style={styles.subCardTag}>THE EFFECT</Text>
          <Text style={styles.subCardBody}>
            Should you miss a day, an Ink Blot is automatically sacrificed at midnight to keep your
            streak intact.
          </Text>
        </View>
      </View>

      {/* Section 3: Frequently Asked (Figma Image 4) */}
      <View style={styles.sectionBlock}>
        <Text style={styles.faqSuperHeader}>FREQUENTLY ASKED</Text>

        {/* FAQ 1 */}
        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>When does the day reset?</Text>
          <Text style={styles.faqAnswer}>
            The digital clock strikes midnight (11:59 PM) in your local timezone to finalize the
            day's record.
          </Text>
        </View>

        {/* FAQ 2 */}
        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>How to earn more freezes?</Text>
          <Text style={styles.faqAnswer}>
            Beyond the 10-day reward, you can discover hidden Ink Blots by completing weekly
            Curated Quests.
          </Text>
        </View>

        {/* FAQ 3 */}
        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>What actions count towards my streak?</Text>
          <Text style={styles.faqAnswer}>
            Engaging in Immersion Mode, logging page progress on your books, posting an Echo quote
            or thought, or publishing a literary review.
          </Text>
        </View>

        {/* FAQ 4 */}
        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>How to recover a broken streak?</Text>
          <Text style={styles.faqAnswer}>
            If you missed your streak within the last 3 days, Reedo offers a second chance: pass a
            10-minute Immersion Challenge or use an available Ink Blot.
          </Text>
        </View>
      </View>

      {/* Primary Action Button (Figma Style) */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          onPress={onBackToCalendar}
          style={styles.backCalendarBtn}
          activeOpacity={0.88}
        >
          <Icon name="calendarDays" size={18} color="#FFFFFF" />
          <Text style={styles.backCalendarText}>BACK TO CALENDAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onStartReading}
          style={styles.startReadingSecondaryBtn}
          activeOpacity={0.8}
        >
          <Icon name="bookOpen" size={16} color="#212842" />
          <Text style={styles.startReadingSecondaryText}>START READING SESSION</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerBlock: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 28,
    color: "#212842",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13.5,
    color: "#6B655B",
    lineHeight: 20,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EFEAE0",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    fontFamily: "Newsreader-Bold",
    fontSize: 20,
    color: "#212842",
  },
  sectionSubheading: {
    fontFamily: "Newsreader-Bold",
    fontStyle: "italic",
    fontSize: 14,
    color: "#6B655B",
    marginTop: -2,
  },
  contentCardParchment: {
    backgroundColor: "#FAF3E8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    padding: 18,
  },
  parchmentBody: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#4A453E",
    lineHeight: 20,
  },
  boldText: {
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  subCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    padding: 16,
    marginBottom: 10,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  subCardTag: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#8C827A",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  subCardBody: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12.5,
    color: "#4A453E",
    lineHeight: 18.5,
  },
  faqSuperHeader: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: "#8C827A",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  faqCard: {
    backgroundColor: "#FAF3E8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    padding: 16,
    marginBottom: 10,
  },
  faqQuestion: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#212842",
    marginBottom: 5,
  },
  faqAnswer: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12.5,
    color: "#6B655B",
    lineHeight: 18.5,
  },
  bottomActions: {
    gap: 12,
    marginTop: 8,
  },
  backCalendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#212842",
    borderRadius: 30,
    paddingVertical: 15,
    gap: 8,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  backCalendarText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    letterSpacing: 1.2,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  startReadingSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#E2DCD2",
    borderRadius: 30,
    paddingVertical: 13,
    gap: 8,
  },
  startReadingSecondaryText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    letterSpacing: 1,
    color: "#212842",
    textTransform: "uppercase",
  },
});
