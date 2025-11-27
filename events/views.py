from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from users.models import CustomUser
import os
from django.conf import settings
from django.http import JsonResponse
from .models import Posts , Like, Comment , UserGameScore, Games
from rest_framework_simplejwt.tokens import AccessToken
import json
import base64
import uuid
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
from Crypto.Cipher import AES
from .utils import decrypt_qr  
from django.db.models import Sum
from .models import Agenda

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
    
 
@login_required(login_url='/api/users/signin/')
def events_view(request):
    user_id = request.session.get('user_id')
    user = CustomUser.objects.get(id=user_id)

    banner_folder = os.path.join(settings.STATIC_ROOT, 'banners')
    if not os.path.exists(banner_folder):
        banner_folder = os.path.join(settings.BASE_DIR, 'static/banners')

    banners = []
    if os.path.exists(banner_folder):
        for file in os.listdir(banner_folder):
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                banners.append(f'banners/{file}') 

    posts = Posts.objects.all().order_by('-created_at')
    for post in posts:
        post.is_liked_by_user = post.likes.filter(user=user).exists()


    top_3_users = (
        CustomUser.objects
            .filter(game_scores__is_participated=True)  
            .annotate(total_points=Sum("game_scores__score")) 
            .order_by("-total_points") 
            .distinct()
    )[:3]  # Only top 3

    agendas = Agenda.objects.all().order_by('start_time')

    print("agendas",agendas)

    return render(request, 'events.html', {
        'user': user,
        'top_3_users': top_3_users,
        'banners': banners,
        'agendas': agendas,
        'posts': posts,
    })




def submit_qr(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid method"})
    
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
        data = json.loads(request.body)
        qr_data = data.get("qr_data")
        if not qr_data:
            return JsonResponse({"status": "error", "message": "No QR data received"})

        qr_json = decrypt_qr(qr_data)
        game_id = qr_json.get("id")
        game_name = qr_json.get("gameName")
        score = qr_json.get("gameScore", 0)
        qr_type = qr_json.get("type")


        if not game_name:
            return JsonResponse({"status": "error", "message": "Game name missing"})

        user_id = request.session.get("user_id")
        if not user_id:
            return JsonResponse({"status": "error", "message": "User not logged in"})

        user = CustomUser.objects.get(id=user_id)

        try:
            game = Games.objects.get(id=game_id)
        except Games.DoesNotExist:
            return JsonResponse({"status": "error", "message": f"Game {game_name} not found"})

        user_game_score, created = UserGameScore.objects.get_or_create(
            user=user,
            game=game,
            defaults={"score": 0, "is_participated": False, "is_completed": False}
        )


        if qr_type == "participation":
            if user_game_score.is_participated:
                return JsonResponse({
                    "status": "info",
                    "message": "You have already participated in this game."
                })

            user_game_score.is_participated = True
            user_game_score.score += score
            user_game_score.save()

            return JsonResponse({
                "status": "success",
                "message": "Participation recorded successfully."
            })

        if qr_type == "completed":
            if not user_game_score.is_participated:
                return JsonResponse({
                    "status": "error",
                    "message": "You must participate before completing the game."
                })

            if user_game_score.is_completed:
                return JsonResponse({
                    "status": "info",
                    "score": user_game_score.score,
                    "message": "You have already completed this game."
                })

            user_game_score.is_completed = True
            user_game_score.score += score

            user_game_score.save()

            return JsonResponse({
                "status": "success",
                "score": user_game_score.score,
                "message": "Game completed successfully."
            })

        return JsonResponse({
            "status": "error",
            "message": "Invalid QR type."
        })

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)})




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
    

