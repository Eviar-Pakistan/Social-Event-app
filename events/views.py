from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from users.models import CustomUser
import os
from django.conf import settings
from django.http import JsonResponse
from .models import Posts , Like, Comment , UserGameScore, Games
from django.db import models
from rest_framework_simplejwt.tokens import AccessToken
import json
import base64
import uuid
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
from Crypto.Cipher import AES
from .utils import decrypt_qr  
from django.db.models import Sum, Case, When, IntegerField, Min, Max
from django.utils import timezone
from .models import Agenda
from django.db import transaction
from django.shortcuts import get_object_or_404
import re



def time_ago(dt):
    now = timezone.now()
    diff = now - dt

    seconds = diff.total_seconds()
    if seconds < 60:
        return f"{int(seconds)}s ago"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes}m ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours}h ago"
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f"{days}d ago"
    elif seconds < 2419200:
        weeks = int(seconds / 604800)
        return f"{weeks}w ago"
    else:
        months = int(seconds / 2419200)
        return f"{months}mo ago"



def natural_sort_key(text):
    return [int(num) if num.isdigit() else num.lower() 
            for num in re.split(r'(\d+)', text)]
 
@login_required(login_url='/api/users/signin/')
def events_view(request):
    # user = CustomUser.objects.get(id=user_id)
    user_id = request.session.get('user_id')
    if user_id:  # 4 spaces
        user = get_object_or_404(CustomUser, id=user_id)  # 8 spaces (inside if)
    else:  # 4 spaces
        user = request.user  



    banner_folder = os.path.join(settings.STATIC_ROOT, 'banners')
    if not os.path.exists(banner_folder):
        banner_folder = os.path.join(settings.BASE_DIR, 'static/banners')


    banners = []

    if os.path.exists(banner_folder):
        files = [
            file for file in os.listdir(banner_folder)
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))
        ]

        files.sort(key=natural_sort_key)

        for file in files:
            banners.append(f'banners/{file}')

    posts = Posts.objects.all().order_by('-created_at')
    for post in posts:
        post.is_liked_by_user = post.likes.filter(user=user).exists()


    top_3_users = (
        CustomUser.objects
            .filter(game_scores__is_participated=True)
            .annotate(
                total_points=Sum("game_scores__score"),
                earliest_completion=Min(
                    Case(
                        When(game_scores__is_completed=True, game_scores__completed_at__isnull=False, 
                             then='game_scores__completed_at'),
                        default=None,
                        output_field=models.DateTimeField()
                    )
                ),
                has_completed=Max(
                    Case(
                        When(game_scores__is_completed=True, then=1),
                        default=0,
                        output_field=IntegerField()
                    )
                )
            )
            .filter(total_points__gt=0)
            .order_by(
                '-total_points',           # First: Sort by total points (descending)
                '-has_completed',          # Second: Completed users first
                'earliest_completion'      # Third: Earlier completion time first
            )
            .distinct()
    )[:3]

    all_users = (
        CustomUser.objects
            .filter(game_scores__is_participated=True)
            .annotate(
                total_points=Sum("game_scores__score"),
                earliest_completion=Min(
                    Case(
                        When(game_scores__is_completed=True, game_scores__completed_at__isnull=False, 
                             then='game_scores__completed_at'),
                        default=None,
                        output_field=models.DateTimeField()
                    )
                ),
                has_completed=Max(
                    Case(
                        When(game_scores__is_completed=True, then=1),
                        default=0,
                        output_field=IntegerField()
                    )
                )
            )
            .filter(total_points__gt=0)
            .order_by(
                '-total_points',           # First: Sort by total points (descending)
                '-has_completed',          # Second: Completed users first
                'earliest_completion'      # Third: Earlier completion time first
            )
            .distinct()
    )


    print("all user",all_users)
    agendas = Agenda.objects.all().order_by('start_time')

    print("agendas",agendas)

    return render(request, 'events.html', {
        'user': user,
        'top_3_users': top_3_users,
        "all_users": all_users,
        'banners': banners,
        'agendas': agendas,
        'posts': posts,
        
    })


@login_required(login_url='/api/users/signin/')
def all_agendas_view(request):
    """Display all agendas in a table format"""
    # Get user from session
    user_id = request.session.get('user_id')
    if user_id:
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            user = request.user
    else:
        user = request.user
    
    # Get all agendas ordered by date and start_time
    agendas = Agenda.objects.all().order_by('date', 'start_time')
    
    return render(request, 'all_agendas.html', {
        'user': user,
        'agendas': agendas,
    })


def submit_qr(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JsonResponse({"status": "error", "message": "Missing or invalid token"}, status=401)

    token_str = auth_header.split(" ")[1]
    try:
        access_token = AccessToken(token_str)
        user = CustomUser.objects.get(id=access_token["user_id"])
    except CustomUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Invalid token: {e}"}, status=401)

    try:
        data = json.loads(request.body)
        qr_data = data.get("qr_data")
        if not qr_data:
            return JsonResponse({"status": "error", "message": "No QR data received"}, status=400)

        qr_json = decrypt_qr(qr_data)
        game_id = qr_json.get("id")
        game_name = qr_json.get("gameName")
        score = qr_json.get("gameScore", 0)
        qr_type = qr_json.get("type")

        if not game_id or not game_name or not qr_type:
            return JsonResponse({"status": "error", "message": "Invalid QR data"}, status=400)
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Failed to parse QR data: {e}"}, status=400)

    try:
        game = Games.objects.get(id=game_id)
    except Games.DoesNotExist:
        return JsonResponse({"status": "error", "message": f"Game '{game_name}' not found"}, status=404)

    try:
        with transaction.atomic():
            user_game_score, created = UserGameScore.objects.select_for_update().get_or_create(
                user=user,
                game=game,
                defaults={"score": 0, "is_participated": False, "is_completed": False}
            )

            if qr_type == "participation":
                if user_game_score.is_participated:
                    return JsonResponse({"status": "info", "message": "You have already participated in this game."})
                user_game_score.is_participated = True
                if not user_game_score.participated_at:
                    user_game_score.participated_at = timezone.now()
                user_game_score.score += score
                user_game_score.save()
                return JsonResponse({"status": "success", "message": "Participation recorded successfully."})

            elif qr_type == "completed":
                if  user_game_score.is_participated == False:
                    return JsonResponse({"status": "error", "message": "You must participate before completing the game."})
                if user_game_score.is_completed:
                    return JsonResponse({
                        "status": "info",
                        "score": user_game_score.score,
                        "message": "You have already completed this game."
                    })
                user_game_score.is_completed = True
                if not user_game_score.completed_at:
                    user_game_score.completed_at = timezone.now()
                user_game_score.score += score
                user_game_score.save()
                return JsonResponse({"status": "success", "score": user_game_score.score, "message": "Game completed successfully."})

            else:
                return JsonResponse({"status": "error", "message": "Invalid QR type."}, status=400)

    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Failed to update score: {e}"}, status=500)




def create_post(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST allowed"}, status=405)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JsonResponse({"status": "error", "message": "Missing or invalid token"}, status=401)

    token_str = auth_header.split(" ")[1]
    try:
        access_token = AccessToken(token_str)
        user_id = access_token["user_id"]
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Invalid token: {e}"}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
        caption = data.get("caption", "")
        image_data = data.get("image", None)

        image_file = None
        if image_data:
            format, imgstr = image_data.split(";base64,")
            ext = format.split("/")[-1]
            file_name = f"{uuid.uuid4()}.{ext}"
            image_file = ContentFile(base64.b64decode(imgstr), name=file_name)

        if not caption and not image_file:
            return JsonResponse({
                "status": "error",
                "message": "Caption or image is required."
            }, status=400)

        post = Posts.objects.create(user=user, caption=caption, image=image_file)

        return JsonResponse({
            "status": "success",
            "message": "Post created successfully.",
            "post_id": post.id
        }, status=201)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"An error occurred: {str(e)}"
        }, status=500)

    

def get_user_from_token(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, JsonResponse({"status": "error", "message": "Missing or invalid token"}, status=401)
    token_str = auth_header.split(" ")[1]
    try:
        access_token = AccessToken(token_str)
        user_id = access_token["user_id"]
        user = CustomUser.objects.get(id=user_id)
        return user, None
    except Exception as e:
        return None, JsonResponse({"status": "error", "message": f"Invalid token: {e}"}, status=401)

def like_post(request, post_id):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST allowed"}, status=405)

    user, error = get_user_from_token(request)
    if error:
        return error

    try:
        post = Posts.objects.get(id=post_id)
        like_obj, created = Like.objects.get_or_create(user=user, post=post)
        if not created:
            like_obj.delete()
            return JsonResponse({"status": "success", "message": "Post unliked", "total_likes": post.total_likes})
        return JsonResponse({"status": "success", "message": "Post liked", "total_likes": post.total_likes})
    except Posts.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Post not found"}, status=404)


def add_comment(request, post_id):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST allowed"}, status=405)

    user, error = get_user_from_token(request)
    if error:
        return error

    try:
        post = Posts.objects.get(id=post_id)
        data = json.loads(request.body)
        content = data.get("content", "").strip()
        if not content:
            return JsonResponse({"status": "error", "message": "Comment cannot be empty"}, status=400)

        comment = Comment.objects.create(user=user, post=post, content=content)
        return JsonResponse({
            "status": "success",
            "message": "Comment added",
            "comment": {
                "id": comment.id,
                "user": user.username,
                "content": comment.content,
                "created_at": comment.created_at.strftime("%Y-%m-%d %H:%M")
            },
            "total_comments": post.total_comments
        })

    except Posts.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Post not found"}, status=404)

@login_required(login_url='/api/users/signin/')
def post_detail(request, post_id):
    """Get post details for the detail modal"""
    try:
        # Get user from session or fallback to request.user
        user_id = request.session.get('user_id')
        if user_id:
            try:
                user = CustomUser.objects.get(id=user_id)
            except CustomUser.DoesNotExist:
                # Session user_id doesn't exist, use request.user instead
                user = request.user
        else:
            # No session user_id, use request.user from @login_required
            user = request.user
        
        post = Posts.objects.get(id=post_id)
        post.is_liked_by_user = post.likes.filter(user=user).exists()
        
        return JsonResponse({
            "status": "success",
            "post": {
                "id": post.id,
                "caption": post.caption,
                "image": post.image.url if post.image else None,
                "created_at": post.created_at.strftime("%B %d, %Y at %I:%M %p"),
                "user": post.user.username,
                "user_avatar": post.user.selfie.url if post.user.selfie else None,
                "total_likes": post.total_likes,
                "total_comments": post.total_comments,
                "is_liked_by_user": post.is_liked_by_user
            }
        })
    except Posts.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Post not found"}, status=404)
    except CustomUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
def get_comments(request, post_id):
    if request.method != "GET":
        return JsonResponse({"status": "error", "message": "Only GET allowed"}, status=405)

    user, error = get_user_from_token(request)
    if error:
        return error

    try:
        post = Posts.objects.get(id=post_id)
        comments = post.comments.all().order_by('-created_at')
        comments_data = [ {
        "id": c.id,
        "user": c.user.username,
        "content": c.content,
        "time_ago": time_ago(c.created_at),
        "profile_picture": c.profile_picture
    } for c in comments]

        return JsonResponse({"status": "success", "comments": comments_data})

    except Posts.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Post not found"}, status=404)
    

