from Profile.models import Profile,Provider_profile
import datetime
from django.urls import reverse
from django.http import HttpResponseRedirect,HttpResponse
from django.core.urlresolvers import resolve
from django.contrib import messages
import sys


def is_expire_middleware(get_response):
    # One-time configuration and initialization.

    def middleware(request):
        current_url = resolve(request.path_info).url_name

        if current_url == 'provider_payment' or current_url == 'logout' or current_url == 'trial_end':
            response = get_response(request)
            return response

        try:
            profile = Profile.objects.get(user_id=request.user.id)
        except Profile.DoesNotExist:
            profile = None

        if profile is None:
            response = get_response(request)
            return response

        try:
            provider_profile = Provider_profile.objects.get(provider_id=request.user.id)
        except Provider_profile.DoesNotExist:
            provider_profile = None

        if provider_profile is None:
            response = get_response(request)
            return response

        if provider_profile.is_trial == 0:
            response = get_response(request)
            return response

        trial_expire_at = provider_profile.trial_end_at.strftime("%Y-%m-%d")
        today = datetime.datetime.now().strftime("%Y-%m-%d")

        if trial_expire_at < today and current_url != 'provider_payment':
            messages.add_message(request, messages.ERROR, 'Your trial subscription expire before continue please entry payment details.')
            return HttpResponseRedirect(reverse('provider_payment'))

        response = get_response(request)
        return response

    return middleware