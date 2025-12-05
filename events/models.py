from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL 

class Posts(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    caption = models.TextField()
    image = models.ImageField(upload_to='event_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.caption[:30]} by {self.user.username}"

    @property
    def total_likes(self):
        return self.likes.count()

    @property
    def total_comments(self):
        return self.comments.count()


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey(Posts, on_delete=models.CASCADE, related_name='likes', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} liked {self.post.caption[:30]}"


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Posts, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} commented on {self.post.caption[:30]}"
    
    @property
    def profile_picture(self):
        if hasattr(self.user, 'selfie') and self.user.selfie:
            return self.user.selfie.url
        return None

class Games(models.Model):
    gameName = models.CharField(max_length=100)
    gamepoints = models.IntegerField()

    def __str__(self):
        return self.gameName
    
class UserGameScore(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_scores')
    game = models.ForeignKey(Games, on_delete=models.CASCADE, related_name='user_scores')
    score = models.IntegerField(default=0)
    is_participated = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    participated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('user', 'game')

    def __str__(self):
        return f"{self.user.username} - {self.game.gameName}: {self.score}"    
    
from django.db import models


class Agenda(models.Model):
    name = models.CharField(max_length=200)
    venue = models.CharField(max_length=200)
    date = models.CharField(max_length=255)
    duration = models.IntegerField(null=True,blank=True)
    dress_code = models.CharField(max_length=100, blank=True, null=True)
    start_time = models.TimeField()
    end_time = models.TimeField(null=True,blank=True)

    def __str__(self):
        return self.name
