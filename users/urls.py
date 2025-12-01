from django.urls import path
from .views import signin,signup
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('signin/', signin, name='signin'),

]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
