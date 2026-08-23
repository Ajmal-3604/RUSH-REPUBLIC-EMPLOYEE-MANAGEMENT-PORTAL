from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ShootPlanViewSet,
    PlanModelViewSet,
    PlanModelPhotoViewSet,
    PlanLocationViewSet,
    PlanLocationPhotoViewSet,
    PropViewSet,
    PropPhotoViewSet,
    ReelViewSet,
    ReelPhotoViewSet,
    PhotoViewSet,
    PhotoBriefImageViewSet,
    PhotoReferenceLinkViewSet,
    TravelExpenseViewSet,
    CrewMemberViewSet,
    BudgetItemViewSet,
    ReviewApprovalViewSet,
    FeedbackViewSet,
)

router = DefaultRouter()
router.register(r'shoot-plans', ShootPlanViewSet, basename='shoot-plans')
router.register(r'plan-models', PlanModelViewSet, basename='plan-models')
router.register(r'plan-model-photos', PlanModelPhotoViewSet, basename='plan-model-photos')
router.register(r'plan-locations', PlanLocationViewSet, basename='plan-locations')
router.register(r'plan-location-photos', PlanLocationPhotoViewSet, basename='plan-location-photos')
router.register(r'props', PropViewSet, basename='props')
router.register(r'prop-photos', PropPhotoViewSet, basename='prop-photos')
router.register(r'reels', ReelViewSet, basename='reels')
router.register(r'reel-photos', ReelPhotoViewSet, basename='reel-photos')
router.register(r'photos', PhotoViewSet, basename='photos')
router.register(r'photo-brief-images', PhotoBriefImageViewSet, basename='photo-brief-images')
router.register(r'photo-reference-links', PhotoReferenceLinkViewSet, basename='photo-reference-links')
router.register(r'travel-expenses', TravelExpenseViewSet, basename='travel-expenses')
router.register(r'crew', CrewMemberViewSet, basename='crew')
router.register(r'budget-items', BudgetItemViewSet, basename='budget-items')
router.register(r'reviews', ReviewApprovalViewSet, basename='reviews')
router.register(r'feedback', FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]
