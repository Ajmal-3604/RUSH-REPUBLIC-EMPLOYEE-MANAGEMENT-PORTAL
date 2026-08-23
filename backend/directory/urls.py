from rest_framework.routers import DefaultRouter

from .views import BrandViewSet, FreelancerViewSet, ModelProfileViewSet, TeamMemberViewSet

router = DefaultRouter()
router.register('team', TeamMemberViewSet, basename='team')
router.register('freelancers', FreelancerViewSet, basename='freelancers')
router.register('models', ModelProfileViewSet, basename='models')
router.register('brands', BrandViewSet, basename='brands')

urlpatterns = router.urls
