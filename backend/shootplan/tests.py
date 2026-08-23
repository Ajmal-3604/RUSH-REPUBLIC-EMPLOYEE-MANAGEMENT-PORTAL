from rest_framework import status
from rest_framework.test import APITestCase

from users.models import CustomUser, Department

from .models import ShootPlan, Reel, BudgetItem, Feedback

STRONG_PASSWORD = 'Rush@2026Pass'


def make_user(username, department):
    return CustomUser.objects.create_user(
        username=username,
        email=f'{username}@therushrepublic.com',
        department=department,
        contact='9876543210',
        password=STRONG_PASSWORD,
    )


class ShootPlanScopeTests(APITestCase):
    """A plan created by one department must be invisible to the others."""

    def setUp(self):
        self.admin = make_user('adminuser', Department.ADMIN)
        self.social = make_user('social', Department.SOCIAL_MEDIA)
        self.writer = make_user('writer', Department.SCRIPT_WRITER)

        self.social_plan = ShootPlan.objects.create(
            title='Summer Campaign', client_name='Acme',
            department=Department.SOCIAL_MEDIA, created_by=self.social,
        )
        self.writer_plan = ShootPlan.objects.create(
            title='Brand Film Script', client_name='Globex',
            department=Department.SCRIPT_WRITER, created_by=self.writer,
        )

    def test_user_only_lists_own_department_plans(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.get('/api/shoot-plans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([p['title'] for p in response.data], ['Summer Campaign'])

    def test_admin_lists_every_plan(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/shoot-plans/')
        self.assertEqual(len(response.data), 2)

    def test_admin_can_filter_by_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/shoot-plans/?department=SCRIPT_WRITER')
        self.assertEqual([p['title'] for p in response.data], ['Brand Film Script'])

    def test_user_cannot_retrieve_another_departments_plan(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.get(f'/api/shoot-plans/{self.writer_plan.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_create_plan_for_another_department(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post('/api/shoot-plans/', {
            'title': 'Sneaky', 'client_name': 'X',
            'department': Department.CLIENT_SERVICING,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('department', response.data)

    def test_created_plan_persists_with_author_and_department(self):
        self.client.force_authenticate(user=self.writer)
        response = self.client.post('/api/shoot-plans/', {
            'title': 'Episode 2', 'client_name': 'Initech',
            'department': Department.SCRIPT_WRITER, 'location': 'Studio B',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        plan = ShootPlan.objects.get(title='Episode 2')
        self.assertEqual(plan.created_by, self.writer)
        self.assertEqual(plan.department, Department.SCRIPT_WRITER)

    def test_only_admin_can_delete_a_plan(self):
        self.client.force_authenticate(user=self.social)
        self.assertEqual(
            self.client.delete(f'/api/shoot-plans/{self.social_plan.id}/').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(
            self.client.delete(f'/api/shoot-plans/{self.social_plan.id}/').status_code,
            status.HTTP_204_NO_CONTENT,
        )


class ShootPlanChildTests(APITestCase):
    def setUp(self):
        self.social = make_user('social', Department.SOCIAL_MEDIA)
        self.writer = make_user('writer', Department.SCRIPT_WRITER)
        self.social_plan = ShootPlan.objects.create(
            title='Summer Campaign', client_name='Acme',
            department=Department.SOCIAL_MEDIA, created_by=self.social,
        )

    def test_reel_creation_persists(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post('/api/reels/', {
            'shoot_plan': self.social_plan.id, 'title': 'Teaser',
            'platform': 'INSTAGRAM', 'duration_seconds': 15,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Reel.objects.filter(title='Teaser').exists())

    def test_cannot_attach_reel_to_another_departments_plan(self):
        self.client.force_authenticate(user=self.writer)
        response = self.client.post('/api/reels/', {
            'shoot_plan': self.social_plan.id, 'title': 'Hijack',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Reel.objects.filter(title='Hijack').exists())

    def test_budget_remaining_is_computed(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post('/api/budget-items/', {
            'shoot_plan': self.social_plan.id, 'category': 'CREW',
            'allocated_amount': '1000.00', 'spent_amount': '250.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['remaining_amount'], '750.00')

    def test_negative_budget_is_rejected(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post('/api/budget-items/', {
            'shoot_plan': self.social_plan.id, 'category': 'CREW',
            'allocated_amount': '-5.00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_stamps_reviewer_and_timestamp(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post('/api/reviews/', {
            'shoot_plan': self.social_plan.id, 'status': 'APPROVED',
            'remarks': 'Looks good.',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reviewer_name'], 'social')
        self.assertIsNotNone(response.data['reviewed_at'])

    def test_plan_detail_nests_every_category(self):
        BudgetItem.objects.create(shoot_plan=self.social_plan, category='CREW', allocated_amount=100)
        Reel.objects.create(shoot_plan=self.social_plan, title='Teaser')
        self.client.force_authenticate(user=self.social)
        response = self.client.get(f'/api/shoot-plans/{self.social_plan.id}/')
        for key in ('reels', 'photos', 'crew', 'budget_items', 'reviews', 'feedback'):
            self.assertIn(key, response.data)
        self.assertEqual(len(response.data['reels']), 1)
        self.assertEqual(response.data['budget_allocated'], 100.0)


class FeedbackTests(APITestCase):
    def setUp(self):
        self.admin = make_user('adminuser', Department.ADMIN)
        self.social = make_user('social', Department.SOCIAL_MEDIA)
        self.social2 = make_user('social2', Department.SOCIAL_MEDIA)
        self.writer = make_user('writer', Department.SCRIPT_WRITER)

        self.social_feedback = Feedback.objects.create(
            department=Department.SOCIAL_MEDIA, author=self.social,
            subject='Camera delay', message='Gear arrived late on set.',
        )
        self.writer_feedback = Feedback.objects.create(
            department=Department.SCRIPT_WRITER, author=self.writer,
            subject='Script deadline', message='Need one more revision day.',
        )

    def test_feedback_is_stamped_with_author_department(self):
        self.client.force_authenticate(user=self.writer)
        response = self.client.post('/api/feedback/', {
            'subject': 'Tooling', 'message': 'Portal is quick to use.',
            'category': 'TOOLING', 'rating': 5,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['department'], Department.SCRIPT_WRITER)
        self.assertEqual(response.data['author_name'], 'writer')

    def test_feedback_persists_and_is_returned_after_refetch(self):
        self.client.force_authenticate(user=self.writer)
        self.client.post('/api/feedback/', {
            'subject': 'Persisted', 'message': 'Should survive a reload.',
        }, format='json')
        response = self.client.get('/api/feedback/')
        self.assertIn('Persisted', [f['subject'] for f in response.data])
        self.assertTrue(Feedback.objects.filter(subject='Persisted').exists())

    def test_department_sees_only_its_own_feedback(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.get('/api/feedback/')
        self.assertEqual([f['subject'] for f in response.data], ['Camera delay'])

    def test_admin_sees_all_feedback(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/feedback/')
        self.assertEqual(len(response.data), 2)

    def test_admin_can_edit_any_feedback(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/feedback/{self.writer_feedback.id}/',
            {'status': 'RESOLVED', 'admin_response': 'Extra day granted.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.writer_feedback.refresh_from_db()
        self.assertEqual(self.writer_feedback.admin_response, 'Extra day granted.')

    def test_author_can_edit_own_feedback(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.patch(
            f'/api/feedback/{self.social_feedback.id}/',
            {'message': 'Gear arrived 40 minutes late.'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_teammate_cannot_edit_someone_elses_feedback(self):
        self.client.force_authenticate(user=self.social2)
        response = self.client.patch(
            f'/api/feedback/{self.social_feedback.id}/',
            {'message': 'Rewritten by a teammate.'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_department_cannot_reach_feedback_at_all(self):
        self.client.force_authenticate(user=self.writer)
        response = self.client.patch(
            f'/api/feedback/{self.social_feedback.id}/',
            {'message': 'Not mine.'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_admin_cannot_write_admin_response(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.patch(
            f'/api/feedback/{self.social_feedback.id}/',
            {'admin_response': 'Pretending to be admin.'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_message_is_rejected(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post(
            '/api/feedback/', {'subject': 'Hi', 'message': 'no'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_feedback_summary_reports_average_rating(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/feedback/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['average_rating'], 5.0)
