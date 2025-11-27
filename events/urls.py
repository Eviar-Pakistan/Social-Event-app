from django.urls import path
from .views import events_view,create_post,add_comment,like_post,get_comments,submit_qr

urlpatterns = [
path('',events_view, name='events'),
path('create_post/',create_post, name='create_post'),
 path('<int:post_id>/like/', like_post, name='like_post'),
path('<int:post_id>/comment/', add_comment, name='add_comment'),
path('<int:post_id>/comments/', get_comments, name='get_comments'),
path("submit-qr/", submit_qr, name="submit_qr"),


]
