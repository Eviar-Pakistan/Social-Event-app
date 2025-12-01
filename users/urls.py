from django.urls import path
from .views import signin,signup

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('signin/', signin, name='signin'),

]
