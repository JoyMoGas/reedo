/**
 * @project Reedo
 * @module InterruptedSessionModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-24
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import NoCover from "../../app/assets/NoCover.svg";

export interface InterruptedSessionModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: string;
  timeReadText?: string;
  badgeType?: "interrupted" | "warning" | "completed";
  primaryButtonText?: string;
  primaryButtonIcon?: string;
  onPrimaryAction: () => void;
  secondaryButtonText?: string;
  secondaryButtonIcon?: string;
  onSecondaryAction?: () => void;
  discardButtonText?: string;
  onDiscardAction?: () => void;
  onClose?: () => void;
  isSaving?: boolean;
}

export default function InterruptedSessionModal({
  visible,
  title = "Reading Session Interrupted",
  subtitle = "Your immersion session was paused. Would you like to save your reading progress or continue reading?",
  bookTitle,
  bookAuthor,
  bookCover,
  timeReadText,
  badgeType = "interrupted",
  primaryButtonText = "Save & Update Progress",
  primaryButtonIcon = "checkCircle",
  onPrimaryAction,
  secondaryButtonText = "Resume Session",
  secondaryButtonIcon = "reloadTime",
  onSecondaryAction,
  discardButtonText,
  onDiscardAction,
  onClose,
  isSaving = false,
}: InterruptedSessionModalProps) {
  if (!visible) return null;

  const isCompleted = badgeType === "completed";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose || onSecondaryAction || (() => {})}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose || onSecondaryAction}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Top Pill Handle */}
          <View style={styles.pill} />

          {/* Centered Badge */}
          <View
            style={[
              styles.badgeWrap,
              isCompleted
                ? { backgroundColor: "#EBF4ED", borderColor: "#D5E8D8" }
                : { backgroundColor: "#FAF0E4", borderColor: "#E8CAA4" },
            ]}
          >
            <Icon
              name={isCompleted ? "checkCircle" : "bookClockOutline"}
              size={30}
              color={isCompleted ? "#4A7C59" : "#C95F44"}
            />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>

          {/* Book Preview & Reading Time Card */}
          {(bookTitle || timeReadText) && (
            <View style={styles.bookCard}>
              <View style={styles.coverWrapper}>
                {bookCover ? (
                  <BookCover
                    uri={bookCover}
                    style={{ width: 44, height: 66, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                ) : (
                  <NoCover width={44} height={66} style={{ borderRadius: 6 }} />
                )}
              </View>

              <View style={styles.bookMetaCol}>
                {bookTitle && (
                  <Text style={styles.bookTitleText} numberOfLines={2}>
                    {bookTitle}
                  </Text>
                )}
                {bookAuthor ? (
                  <Text style={styles.bookAuthorText} numberOfLines={1}>
                    by {bookAuthor}
                  </Text>
                ) : null}

                {timeReadText && (
                  <View style={styles.timePill}>
                    <Icon name="sandClock" size={12} color="#212842" />
                    <Text style={styles.timePillText}>{timeReadText}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Primary Action Button (e.g. Save & Update Progress) */}
          <TouchableOpacity
            onPress={onPrimaryAction}
            style={styles.primaryBtn}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF8F0" />
            ) : (
              <View style={styles.btnRow}>
                {primaryButtonIcon && (
                  <Icon name={primaryButtonIcon} size={18} color="#FFF8F0" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.primaryBtnText}>{primaryButtonText}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Secondary Action Button (e.g. Resume Session) */}
          {secondaryButtonText && onSecondaryAction && (
            <TouchableOpacity
              onPress={onSecondaryAction}
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              <View style={styles.btnRow}>
                {secondaryButtonIcon && (
                  <Icon name={secondaryButtonIcon} size={16} color="#212842" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.secondaryBtnText}>{secondaryButtonText}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Discard / Exit Without Saving */}
          {discardButtonText && onDiscardAction && (
            <TouchableOpacity
              onPress={onDiscardAction}
              style={styles.discardBtn}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              <Text style={styles.discardBtnText}>{discardButtonText}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(33, 40, 66, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  },
  pill: {
    width: 44,
    height: 5,
    backgroundColor: "#D9D4C7",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  badgeWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  titleText: {
    fontFamily: "Newsreader-Bold",
    fontSize: 23,
    color: "#212842",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: "PublicSans-Regular",
    fontSize: 14,
    color: "#76767E",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  bookCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#EBE7DF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
  },
  coverWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bookMetaCol: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitleText: {
    fontFamily: "Newsreader-Bold",
    fontSize: 15,
    color: "#212842",
    lineHeight: 19,
  },
  bookAuthorText: {
    fontFamily: "PublicSans-Italic",
    fontSize: 12,
    color: "#76767E",
    marginTop: 2,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFEBE3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  timePillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#212842",
    marginLeft: 4,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#212842",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 15,
    color: "#FFF8F0",
  },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "#EFEBE3",
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  secondaryBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#212842",
  },
  discardBtn: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  discardBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    color: "#C95F44",
  },
});
