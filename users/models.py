from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.db.models import Sum


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)  
    contact = models.CharField(max_length=20, unique=True)  
    selfie = models.ImageField(upload_to='selfies/', blank=True, null=True)
    role = models.CharField(max_length=50, blank=True)
    region = models.CharField(max_length=100, blank=True)

    USERNAME_FIELD = "email"  
    REQUIRED_FIELDS = ["username", "contact"] 

    def __str__(self):
        return self.email
    
    def total_points(self):
        return self.game_scores.aggregate(total=Sum('score'))['total'] or 0
