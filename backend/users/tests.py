from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomUser, Department

STRONG_PASSWORD = 'Rush@2026Pass'


def make_user(username, department, password=STRONG_PASSWORD, **extra):
    return CustomUser.objects.create_user(
        username=username,
        email=f'{username}@therushrepublic.com',
        department=department,
        contact='9876543210',
        password=password,
        **extra,
    )


class SignupTests(APITestCase):
    url = reverse('signup')

    def payload(self, **overrides):
        data = {
            'username': 'newwriter',
            'email': 'newwriter@therushrepublic.com',
            'contact': '9876543210',
            'password': STRONG_PASSWORD,
            'confirm_password': STRONG_PASSWORD,
            'department': Department.SCRIPT_WRITER,
        }
        data.update(overrides)
        return data

    def test_signup_succeeds_and_returns_success_message(self):
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Account created successfully')
        self.assertTrue(CustomUser.objects.filter(email='newwriter@therushrepublic.com').exists())

    def test_script_writer_is_a_valid_department(self):
        response = self.client.post(
            self.url, self.payload(department=Department.SCRIPT_WRITER), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_email_is_rejected(self):
        make_user('existing', Department.SOCIAL_MEDIA)
        response = self.client.post(
            self.url, self.payload(email='existing@therushrepublic.com'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_mismatched_passwords_are_rejected(self):
        response = self.client.post(
            self.url, self.payload(confirm_password='Different@2026'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', response.data)

    def test_weak_password_is_rejected(self):
        response = self.client.post(
            self.url, self.payload(password='password', confirm_password='password'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_invalid_contact_is_rejected(self):
        response = self.client.post(self.url, self.payload(contact='12345'), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contact', response.data)


class LoginTests(APITestCase):
    url = reverse('login')

    def setUp(self):
        self.user = make_user('smuser', Department.SOCIAL_MEDIA)

    def test_login_returns_tokens_and_home_route(self):
        response = self.client.post(
            self.url,
            {'email': self.user.email, 'password': STRONG_PASSWORD},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['message'], 'Logged in successfully')
        self.assertEqual(response.data['home_route'], '/social-media-home')
        self.assertEqual(response.data['user']['department'], Department.SOCIAL_MEDIA)

    def test_script_writer_lands_on_script_writer_home(self):
        writer = make_user('writer', Department.SCRIPT_WRITER)
        response = self.client.post(
            self.url, {'email': writer.email, 'password': STRONG_PASSWORD}, format='json'
        )
        self.assertEqual(response.data['home_route'], '/script-writer-home')

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.url, {'email': self.user.email, 'password': 'Wrong@2026'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DepartmentAccessTests(APITestCase):
    """The core RBAC contract: each department reaches only its own endpoint."""

    def setUp(self):
        self.admin = make_user('adminuser', Department.ADMIN)
        self.social = make_user('social', Department.SOCIAL_MEDIA)
        self.prod = make_user('prod', Department.PRODUCTION_COORDINATOR)
        self.client_serv = make_user('cserv', Department.CLIENT_SERVICING)
        self.writer = make_user('scriptw', Department.SCRIPT_WRITER)

    def test_each_department_reaches_only_its_own_dashboard(self):
        endpoints = {
            'social-media': self.social,
            'production-coordinator': self.prod,
            'client-servicing': self.client_serv,
            'script-writer': self.writer,
        }
        for name, owner in endpoints.items():
            url = reverse(name)
            for user in endpoints.values():
                self.client.force_authenticate(user=user)
                response = self.client.get(url)
                expected = status.HTTP_200_OK if user == owner else status.HTTP_403_FORBIDDEN
                self.assertEqual(
                    response.status_code, expected,
                    f'{user.department} -> {name} expected {expected}, got {response.status_code}',
                )

    def test_admin_reaches_every_department_dashboard(self):
        self.client.force_authenticate(user=self.admin)
        for name in ('social-media', 'production-coordinator', 'client-servicing', 'script-writer'):
            self.assertEqual(self.client.get(reverse(name)).status_code, status.HTTP_200_OK)

    def test_admin_dashboard_is_admin_only(self):
        url = reverse('admin-dashboard')
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        for user in (self.social, self.prod, self.client_serv, self.writer):
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_requests_are_rejected(self):
        self.assertEqual(
            self.client.get(reverse('social-media')).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


class SwitchDepartmentTests(APITestCase):
    url = reverse('switch-department')

    def setUp(self):
        self.admin = make_user('adminuser', Department.ADMIN)
        self.social = make_user('social', Department.SOCIAL_MEDIA)

    def test_admin_can_switch_to_any_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url, {'department': Department.SCRIPT_WRITER}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['home_route'], '/script-writer-home')

    def test_non_admin_cannot_switch_department(self):
        self.client.force_authenticate(user=self.social)
        response = self.client.post(
            self.url, {'department': Department.SCRIPT_WRITER}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_department_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {'department': 'MARKETING'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AdminUserManagementTests(APITestCase):
    def setUp(self):
        self.admin = make_user('adminuser', Department.ADMIN)
        self.social = make_user('social', Department.SOCIAL_MEDIA)

    def test_admin_lists_all_users(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_non_admin_cannot_list_users(self):
        self.client.force_authenticate(user=self.social)
        self.assertEqual(self.client.get('/api/users/').status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_delete_own_account(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/users/{self.admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_toggle_another_user_active_flag(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/users/{self.social.id}/toggle_active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = make_user('social', Department.SOCIAL_MEDIA)

    def test_profile_returns_current_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertFalse(response.data['is_admin'])

    def test_departments_endpoint_is_public_and_lists_five(self):
        response = self.client.get(reverse('departments'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 5)
        self.assertIn(Department.SCRIPT_WRITER, [d['value'] for d in response.data])
