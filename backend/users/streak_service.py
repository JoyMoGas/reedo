"""
@project Reedo
@module streak_service
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-10-14
"""
from datetime import datetime, date, timedelta
from django.utils import timezone
from .models import Streak, StreakActivity, User


def parse_client_date(date_input):
    """
    Safely parse date string 'YYYY-MM-DD' or date object.
    Falls back to current local date if invalid or None.
    """
    if isinstance(date_input, date):
        return date_input
    if isinstance(date_input, str):
        try:
            return datetime.strptime(date_input.strip(), "%Y-%m-%d").date()
        except (ValueError, AttributeError):
            pass
    return timezone.localdate()


def get_or_create_user_streak(user):
    """
    Gets or creates the canonical Streak record for a user.
    """
    streak = user.streaks.first()
    if not streak:
        streak = Streak.objects.create(
            user_id=user,
            current_streak=user.streak_days or 0,
            best_streak=user.streak_days or 0,
            freezes_available=1,
            last_activity=None
        )
    return streak


def evaluate_streak_health(streak, today_date):
    """
    Evaluates whether the streak has lapsed before registering a new day or viewing status.
    Handles automatic freeze consumption or marks streak as broken with recovery window.
    """
    if not streak.last_activity or streak.current_streak <= 0:
        return

    days_diff = (today_date - streak.last_activity).days

    if days_diff <= 1:
        # 0 = active today, 1 = active yesterday. Streak is completely healthy.
        return

    yesterday = today_date - timedelta(days=1)

    if days_diff == 2:
        # Missed yesterday!
        if streak.freezes_available > 0:
            # Auto-consume freeze to save the streak!
            streak.freezes_available -= 1
            StreakActivity.objects.create(
                user=streak.user_id,
                activity_type='FREEZE_USED',
                activity_date=yesterday,
                metadata={'reason': 'Auto-freeze protected missed day'}
            )
            # Yesterday is now considered covered by freeze
            streak.last_activity = yesterday
            streak.save(update_fields=['freezes_available', 'last_activity'])
            return
        else:
            # No freeze available. Streak broken yesterday!
            streak.previous_streak = streak.current_streak
            streak.broken_date = yesterday
            streak.current_streak = 0
            streak.save(update_fields=['previous_streak', 'broken_date', 'current_streak'])
            user = streak.user_id
            user.streak_days = 0
            user.save(update_fields=['streak_days'])
            return

    if days_diff > 2:
        # Missed 2+ days without protection
        if streak.current_streak > 0:
            streak.previous_streak = streak.current_streak
            streak.broken_date = streak.last_activity + timedelta(days=1)
            streak.current_streak = 0
            streak.save(update_fields=['previous_streak', 'broken_date', 'current_streak'])
            user = streak.user_id
            user.streak_days = 0
            user.save(update_fields=['streak_days'])


def record_streak_activity(user, activity_type, metadata=None, client_date=None):
    """
    Primary engine for logging literary activities and advancing/maintaining user streaks.
    
    Supported activity_types:
    - 'READING_PROGRESS': updating current_page in a book
    - 'IMMERSION_SESSION': reading session in immersion mode
    - 'ECHO_POST': publishing an echo post
    - 'BOOK_REVIEW': writing a review for a book
    - 'READING_NOTE': creating a note during reading
    - 'QUEST_CLAIM': claiming daily reading quest
    - 'FREEZE_USED': freeze protection
    - 'RECOVERY_CHALLENGE': streak recovered
    """
    today_date = parse_client_date(client_date)
    streak = get_or_create_user_streak(user)

    # First, evaluate health up to today
    evaluate_streak_health(streak, today_date)

    # Log the activity
    activity = StreakActivity.objects.create(
        user=user,
        activity_type=activity_type,
        activity_date=today_date,
        metadata=metadata or {}
    )

    extended = False
    streak_incremented = False
    freeze_used = False

    if streak.last_activity == today_date:
        # Already active today! Streak stays maintained.
        extended = False
    elif streak.last_activity == (today_date - timedelta(days=1)):
        # Consecutive day! Increment streak
        streak.current_streak += 1
        streak.last_activity = today_date
        if streak.current_streak > streak.best_streak:
            streak.best_streak = streak.current_streak
        # Clear any broken streak states since user is actively progressing
        streak.previous_streak = 0
        streak.broken_date = None
        extended = True
        streak_incremented = True
    else:
        # First streak day (either brand new or fresh start after break)
        streak.current_streak = 1
        streak.last_activity = today_date
        if streak.best_streak < 1:
            streak.best_streak = 1
        extended = True
        streak_incremented = True

    if not streak.activate_at:
        streak.activate_at = today_date

    streak.save()

    # Synchronize User model
    if user.streak_days != streak.current_streak:
        user.streak_days = streak.current_streak
        user.save(update_fields=['streak_days'])

    return {
        'extended': extended,
        'streak_incremented': streak_incremented,
        'current_streak': streak.current_streak,
        'best_streak': streak.best_streak,
        'is_active_today': True,
        'freezes_available': streak.freezes_available,
        'activity_type': activity_type,
        'activity_date': today_date.strftime("%Y-%m-%d"),
    }


def recover_streak(user, method='IMMERSION', metadata=None, client_date=None):
    """
    Recovers a recently broken streak using either:
    - 'FREEZE': Consumes 1 streak freeze to restore previous streak.
    - 'IMMERSION': Challenge recovery (user read in immersion mode).
    """
    today_date = parse_client_date(client_date)
    streak = get_or_create_user_streak(user)

    if streak.previous_streak <= 0:
        return {
            'success': False,
            'error': 'No broken streak eligible for recovery.'
        }

    # Recovery window check (e.g. eligible within 3 days of breaking)
    if streak.broken_date:
        days_since_break = (today_date - streak.broken_date).days
        if days_since_break > 3:
            return {
                'success': False,
                'error': 'Streak recovery window has expired (maximum 3 days).'
            }

    if method == 'FREEZE':
        if streak.freezes_available < 1:
            return {
                'success': False,
                'error': 'No streak freezes available. Earn one or complete the Immersion Challenge.'
            }
        streak.freezes_available -= 1
        StreakActivity.objects.create(
            user=user,
            activity_type='FREEZE_USED',
            activity_date=streak.broken_date or (today_date - timedelta(days=1)),
            metadata={'reason': 'Manual streak repair freeze'}
        )
    elif method == 'IMMERSION':
        # Immersion challenge recovery
        StreakActivity.objects.create(
            user=user,
            activity_type='RECOVERY_CHALLENGE',
            activity_date=today_date,
            metadata=metadata or {'challenge': 'Immersion reading recovery challenge completed'}
        )
    else:
        return {
            'success': False,
            'error': f'Invalid recovery method: {method}'
        }

    # Restore the streak!
    # If today hasn't been logged yet, today becomes active and extends previous_streak + 1
    # If today was already logged as 1, previous_streak + 1 is the new current_streak
    restored_streak = streak.previous_streak + 1
    streak.current_streak = restored_streak
    streak.last_activity = today_date
    if restored_streak > streak.best_streak:
        streak.best_streak = restored_streak

    streak.previous_streak = 0
    streak.broken_date = None
    streak.streak_repaired_at = today_date
    streak.save()

    user.streak_days = streak.current_streak
    user.save(update_fields=['streak_days'])

    return {
        'success': True,
        'method': method,
        'current_streak': streak.current_streak,
        'best_streak': streak.best_streak,
        'freezes_available': streak.freezes_available,
        'streak_repaired_at': today_date.strftime("%Y-%m-%d"),
    }


def add_freeze_to_user(user, amount=1, reason="Reward"):
    """
    Adds streak freeze(s) to user's account. Max 3 freezes at a time.
    """
    streak = get_or_create_user_streak(user)
    new_total = min(3, streak.freezes_available + amount)
    streak.freezes_available = new_total
    streak.save(update_fields=['freezes_available'])
    return streak.freezes_available


def get_user_streak_summary(user, client_date=None, days_history=60):
    """
    Comprehensive streak summary including calendar history for UI visualization.
    """
    today_date = parse_client_date(client_date)
    streak = get_or_create_user_streak(user)

    evaluate_streak_health(streak, today_date)

    is_active_today = (streak.last_activity == today_date)

    # Can recover if previous_streak > 0 and broken within 3 days
    can_recover = False
    if streak.previous_streak > 0:
        if streak.broken_date:
            can_recover = (today_date - streak.broken_date).days <= 3
        else:
            can_recover = True

    # Fetch activities in the history range
    start_date = today_date - timedelta(days=days_history)
    activities = StreakActivity.objects.filter(
        user=user,
        activity_date__gte=start_date,
        activity_date__lte=today_date
    ).order_by('activity_date', 'created_at')

    # Build calendar map { 'YYYY-MM-DD': { 'status': 'ACTIVE'|'FROZEN'|'RECOVERED', 'activities': [...] } }
    calendar_history = {}
    today_str = today_date.strftime("%Y-%m-%d")
    today_activities = []

    for act in activities:
        d_str = act.activity_date.strftime("%Y-%m-%d")
        if d_str not in calendar_history:
            calendar_history[d_str] = {
                'date': d_str,
                'status': 'ACTIVE',
                'activities': []
            }

        calendar_history[d_str]['activities'].append(act.activity_type)

        if act.activity_type == 'FREEZE_USED':
            calendar_history[d_str]['status'] = 'FROZEN'
        elif act.activity_type == 'RECOVERY_CHALLENGE':
            calendar_history[d_str]['status'] = 'RECOVERED'

        if d_str == today_str:
            today_activities.append(act.activity_type)

    return {
        'current_streak': streak.current_streak,
        'best_streak': streak.best_streak,
        'is_active_today': is_active_today,
        'last_activity_date': streak.last_activity.strftime("%Y-%m-%d") if streak.last_activity else None,
        'freezes_available': streak.freezes_available,
        'can_recover': can_recover,
        'previous_streak': streak.previous_streak if can_recover else 0,
        'broken_date': streak.broken_date.strftime("%Y-%m-%d") if streak.broken_date else None,
        'today_activities': list(set(today_activities)),
        'calendar_history': calendar_history,
    }
