from django.contrib import messages
from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, JsonResponse
from django.urls import reverse
from .forms import UserForm
from job.models import Job
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from service_categories.models import Categories, Provider_catgories
from django.contrib.auth.hashers import make_password
from django.contrib.auth.decorators import login_required
from Profile.models import Profile, Customer_profile, Provider_profile

# Create your views here.

