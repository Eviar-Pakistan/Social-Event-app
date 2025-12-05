import re
import json
import base64
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate, login
from django.core.files.base import ContentFile
from .models import CustomUser
from django.contrib.auth.decorators import login_required

def login_view(request):
    return render(request, 'login.html')





import re
import json
import base64
from datetime import timedelta
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from .models import CustomUser
from .utils import get_client_ip
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.gis.geoip2 import GeoIP2

from django.contrib.gis.geoip2 import GeoIP2

def get_region(request):
    ip = get_client_ip(request)
    if not ip:
        return None
    
    try:
        g = GeoIP2()
        location = g.city(ip)
        return {
            "city": location.get("city", ""),
            "region": location.get("region", ""),
            "country": location.get("country_name", "")
        }
    except Exception as e:
        print("GeoIP lookup failed:", e)
        return {"city": None, "region": None, "country": None}

def signup(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            contact = data.get('contactNo')
            password = data.get('password')
            role = data.get('role')
            region = data.get("region")
            selfie_base64 = data.get('selfie')
            # region_info = get_region(request)

            # print("region",region_info)

            if not username:
                return JsonResponse({'success': False, 'message': 'Username is required.'}, status=400)
            if not re.fullmatch(r'[A-Za-z ]+', username):
                return JsonResponse({'success': False, 'message': 'Username can only contain letters and spaces.'}, status=400)
            if CustomUser.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'message': 'Username already exists.'}, status=400)

            if not email:
                return JsonResponse({'success': False, 'message': 'Email is required.'}, status=400)
            if CustomUser.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'message': 'Email already exists.'}, status=400)

            if not contact:
                return JsonResponse({'success': False, 'message': 'Contact number is required.'}, status=400)
            if not re.fullmatch(r'03\d{9}', contact):
                return JsonResponse({'success': False, 'message': 'Contact number must start with 03 and be 11 digits.'}, status=400)
            if CustomUser.objects.filter(contact=contact).exists():
                return JsonResponse({'success': False, 'message': 'Contact number already exists.'}, status=400)

            if not password:
                return JsonResponse({'success': False, 'message': 'Password is required.'}, status=400)
            if len(password) < 6:
                return JsonResponse({'success': False, 'message': 'Password must be at least 6 characters long.'}, status=400)

            if not region:
                return JsonResponse({'success': False, 'message': 'Region is required.'}, status=400)

            if not role:
                return JsonResponse({'success': False, 'message': 'Role is required.'}, status=400)

            if not selfie_base64:
                return JsonResponse({'success': False, 'message': 'Selfie is required.'}, status=400)

            user = CustomUser(
                username=username,
                email=email,
                contact=contact,
                role=role,
                region=region
            )
            user.set_password(password)

            format, imgstr = selfie_base64.split(';base64,')
            ext = format.split('/')[-1]
            user.selfie = ContentFile(base64.b64decode(imgstr), name=f"{username}_selfie.{ext}")

            user.save()

            user = authenticate(request, email=email, password=password)
            request.session['user_id'] = user.id
            request.session.save()

            if user is not None:
                login(request, user)
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                return JsonResponse({
                    'success': True,
                    'access': access_token,
                    'refresh': str(refresh),
                    'redirect': '/api/events/'
                }, status=201)
            else:
                return JsonResponse({'success': False, 'message': 'Authentication failed after signup.'}, status=400)

        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'}, status=500)

    return render(request, "signup.html")



def signin(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return JsonResponse({'success': False, 'message': 'Email and password are required.'}, status=400)

            user = authenticate(request, email=email, password=password)
            if user is not None:
                login(request, user)
                request.session['user_id'] = user.id


                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                return JsonResponse({
                    'success': True,
                    'access': access_token,
                    'refresh': str(refresh),
                    'redirect': '/api/events/'
                })
            else:
                return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=401)

        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'}, status=500)

    return render(request, 'login.html')
