"""
@project Reedo
@module tests
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-10-14
"""
from datetime import date, timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import Streak, StreakActivity
from users.streak_service import (
    record_streak_activity,
    get_user_streak_summary,
    recover_streak,
    add_freeze_to_user,
    get_or_create_user_streak
)

User = get_user_model()


class StreakSystemTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bookworm",
            email="bookworm@reedo.com",
            password="securePassword123!",
            full_name="Book Worm"
        )
        self.client.force_authenticate(user=self.user)

    def test_first_activity_starts_streak_at_one(self):
        today = date(2026, 10, 1)
        res = record_streak_activity(self.user, 'READING_PROGRESS', client_date=today)
        self.assertEqual(res['current_streak'], 1)
        self.assertEqual(res['best_streak'], 1)
        self.assertTrue(res['is_active_today'])

        self.user.refresh_from_db()
        self.assertEqual(self.user.streak_days, 1)

    def test_same_day_activity_does_not_double_increment(self):
        today = date(2026, 10, 1)
        record_streak_activity(self.user, 'READING_PROGRESS', client_date=today)
        res2 = record_streak_activity(self.user, 'ECHO_POST', client_date=today)
        
        self.assertEqual(res2['current_streak'], 1)
        self.assertFalse(res2['extended'])
        self.user.refresh_from_db()
        self.assertEqual(self.user.streak_days, 1)

    def test_consecutive_days_increment_streak(self):
        day1 = date(2026, 10, 1)
        day2 = date(2026, 10, 2)
        day3 = date(2026, 10, 3)

        record_streak_activity(self.user, 'READING_PROGRESS', client_date=day1)
        record_streak_activity(self.user, 'BOOK_REVIEW', client_date=day2)
        res3 = record_streak_activity(self.user, 'IMMERSION_SESSION', client_date=day3)

        self.assertEqual(res3['current_streak'], 3)
        self.assertEqual(res3['best_streak'], 3)
        self.user.refresh_from_db()
        self.assertEqual(self.user.streak_days, 3)

    def test_freeze_protects_missed_day(self):
        day1 = date(2026, 10, 1)
        # Missed Oct 2!
        day3 = date(2026, 10, 3)

        record_streak_activity(self.user, 'READING_PROGRESS', client_date=day1)
        
        # User has 1 freeze by default
        streak = get_or_create_user_streak(self.user)
        self.assertEqual(streak.freezes_available, 1)

        # On day 3, auto-freeze should consume 1 freeze for day 2 and continue streak!
        res = record_streak_activity(self.user, 'ECHO_POST', client_date=day3)
        self.assertEqual(res['current_streak'], 2)
        self.assertEqual(res['freezes_available'], 0)

        # Verify a FREEZE_USED activity was logged for Oct 2
        freeze_activity = StreakActivity.objects.filter(
            user=self.user,
            activity_type='FREEZE_USED',
            activity_date=date(2026, 10, 2)
        ).first()
        self.assertIsNotNone(freeze_activity)

    def test_broken_streak_and_immersion_recovery(self):
        day1 = date(2026, 10, 1)
        day2 = date(2026, 10, 2)
        record_streak_activity(self.user, 'READING_PROGRESS', client_date=day1)
        record_streak_activity(self.user, 'READING_PROGRESS', client_date=day2)

        # Empty freezes to simulate no protection
        streak = get_or_create_user_streak(self.user)
        streak.freezes_available = 0
        streak.save()

        # Day 5 (missed Oct 3 and 4)
        day5 = date(2026, 10, 5)
        res5 = record_streak_activity(self.user, 'READING_PROGRESS', client_date=day5)
        # Streak resets to 1, but previous streak 2 is saved for recovery!
        self.assertEqual(res5['current_streak'], 1)
        
        streak.refresh_from_db()
        self.assertEqual(streak.previous_streak, 2)

        # Now test immersion recovery challenge on day 5
        recovery_res = recover_streak(self.user, method='IMMERSION', client_date=day5)
        self.assertTrue(recovery_res['success'])
        self.assertEqual(recovery_res['current_streak'], 3) # Restored 2 + 1 for today

        self.user.refresh_from_db()
        self.assertEqual(self.user.streak_days, 3)

    def test_streak_summary_endpoint(self):
        day1 = date(2026, 10, 1)
        record_streak_activity(self.user, 'READING_PROGRESS', client_date=day1)
        
        response = self.client.get('/api/users/streak/?date=2026-10-01')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['current_streak'], 1)
        self.assertTrue(data['is_active_today'])
        self.assertIn('2026-10-01', data['calendar_history'])
        self.assertIn('READING_PROGRESS', data['today_activities'])

    def test_claim_quest_advances_streak(self):
        response = self.client.post('/api/users/claim-quest/', {'points': 50, 'client_date': '2026-10-10'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['streak']['current_streak'], 1)
        self.assertEqual(data['streak']['activity_type'], 'QUEST_CLAIM')

    def test_add_freeze_endpoint(self):
        response = self.client.post('/api/users/streak/claim-freeze/', {'reason': 'Milestone Reward'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(data['freezes_available'], 2)
