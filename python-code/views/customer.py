from django.contrib import messages
from django.shortcuts import render
from django.http import HttpResponseRedirect,HttpResponse,JsonResponse
from django.urls import reverse
from ..forms import UserForm
from job.models import Job, Job_notified, Job_blacklisting_customer
from django.contrib.auth.models import User
from django.contrib.auth import login
from service_categories.models import Categories, Provider_catgories
from Profile.models import Provider_profile, Provider_profile_image, Provider_profile_views, Provider_certificate_image
from conversation.models import Conversation
from django.contrib.auth.hashers import make_password
from django.contrib.auth.decorators import login_required, user_passes_test
from Profile.models import Customer_profile, Profile
from service_categories.models import Categories
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
import googlemaps
import random
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from geopy.distance import distance
from django.contrib.gis.geoip2 import GeoIP2
from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from django.template import Context
from django.conf import settings
from .stripe_payment import *
import stripe
from administrator.views.provider import *
from subscription.models import Charge
from django.core.mail import send_mail
from iso3166 import countries
import requests, json
from django.utils import timezone
from collections import namedtuple
import json



stripe.api_key = settings.STRIPE_SECRET_KEY # new

from django.db.models import Q
import datetime
from dateutil.relativedelta import relativedelta
# import stripe

import json

def test_route(request):
    pass

def charge(request):

    if request.method == 'POST':
        charge = stripe.Charge.create(
            amount=1000,
            currency='inr',
            description='A Django charge',
            source=request.POST['stripeToken'],
        )
        return render(request, 'customer/charge.html')

def send_provider_mail(user):

    job_list = Job.objects.filter(status='Y', paid_for='A', searching='Y', provider_id__isnull=True).values('id','category_id','zipcode','job_point','description','deadline','customer__customer_profile__cell_phone')

    for job in job_list:

        provider_list = Provider_profile.objects.filter(
            available='Y',
            provider__provider_profile__user_point__distance_lt=(job['job_point'], Distance(mi=25)),
            provider__provider_catgories__category_id__exact=job['category_id']
            #sunil change
            # provider__profile__authorize_customer_id__isnull=False).values('provider__email', 'provider_id',
            ).values('provider__email', 'provider_id',
                                                                           'subscribed',
                                                                           'provider__provider_profile__service_radius',
                                                                           'provider__provider_profile__user_point').distinct('provider__email')
        count = 0
        for prov in provider_list:

            dist = Distance(m=distance(job['job_point'], prov['provider__provider_profile__user_point']).miles)
            if prov['provider__provider_profile__service_radius'] > dist.m:
                if_notified = Job_notified.objects.filter(job_id=job['id'], provider_id=prov['provider_id'])

                if if_notified.count() and count < 3:

                    # ----------------------------------Job Notify database entry----------------------------#
                    job_notify = Job_notified.objects.create(job_id=job['id'], provider_id=prov['provider_id'])

                    template_html = get_template('customer/emails/notify_provider_template.html')

                    if settings.AUTHORIZE_NET_MODE == 'testMode':
                        interested_url = "http://178.128.163.250:8080/interested/"+job_notify.id
                        not_interested_url = "http://178.128.163.250:8080/not_interested/"+job_notify.id
                    else:
                        interested_url = "http://brokeniot.com/interested/" + job_notify.id
                        not_interested_url = "http://brokeniot.com/not_interested/" + job_notify.id

                    d = Context({'id': job['id'],
                                 'description': job['description'],
                                 'deadline': job['deadline'],
                                 'today_date_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                                 'cell_phone': job['customer__customer_profile__cell_phone'],
                                 'email': job['customer__email'],
                                 'notify_id': job_notify.id,
                                 'interested_url': interested_url,
                                 'not_interested_url': not_interested_url
                                 })

                    html_content = template_html.render(d.flatten())
                    msg = EmailMultiAlternatives('New Job', '', 'support@brokeniot.com',
                                                 ['sunil.iihglobal@gmail.com'], headers={'Reply-To': 'ronak.iihglobal@gmail.com'})
                    msg.attach_alternative(html_content, "text/html")
                    msg.send()



                    # if prov['subscribed'] == 'Y':
                    #
                    #     # mail_content = 'Hello Provider,' + '\n' + ' New Job Alert\n' + ' Job Id:' + str(job['id']) + '\nJob Description:' + job['description'] + '\nJob Timeline:' + job['deadline'] + '\nOwner Contact:' + job['customer__customer_profile__cell_phone'] if job['customer__customer_profile__cell_phone'] else 'Not Available'
                    #     mail_content = render_to_string('customer/layout/notify_provider_template.html', {
                    #         'id': job['id'],
                    #         'description': job['description'],
                    #         'deadline': job['deadline'],
                    #         'cell_phone': job['customer__customer_profile__cell_phone'],
                    #         'notifiy_id': job_notify.id
                    #     })
                    # elif prov['subscribed'] == 'N':
                    #
                    #     mail_content = render_to_string('customer/layout/notify_provider_template.html', {
                    #         'id': job['id'],
                    #         'description': job['description'],
                    #         'deadline': job['deadline'],
                    #         'cell_phone': job['customer__customer_profile__cell_phone'],
                    #         'notifiy_id': job_notify.id
                    #     })
                    # plain_message = strip_tags(mail_content)
                    # send_mail('New Job', plain_message, 'support@brokeniot.com', [prov['provider__email']],
                    #           fail_silently=False, html_message=mail_content)
                    count += 1

    return HttpResponse('mail send')

def user_check(user):
    if not user.is_superuser and user.profile.type == 'C':
        return True
    else:
        return False


def customer_signup(request):
    if request.method == 'GET':
        return render(request, 'customer/signup_as_customer.html')
    elif request.method == 'POST':
        user = UserForm(request.POST)
        username = request.POST['email']
        # username_exists = User.objects.filter(username__iexact=username).count()
        full_name = request.POST['full_name']
        email = request.POST['email']
        phone = request.POST['phone'].replace('-','');
        email_exists = User.objects.filter(email__exact=email).count()
        phone_exists = Customer_profile.objects.filter(cell_phone__exact=phone).count()
        password = request.POST['password']
        confirm_password = request.POST['confirm_password']
        if email_exists:
            messages.add_message(request,messages.ERROR, "Email already in use")
        if phone_exists:
            messages.add_message(request, messages.ERROR, "Phone already in use")
        # if username_exists:
        #     messages.add_message(request, messages.ERROR, "Username already in use")
        if password != confirm_password:
            messages.add_message(request, messages.ERROR, "Passwords don't match")

        is_valid_phone = False
        if len(str(phone)) >= 10 and len(str(phone)) <= 13:
            is_valid_phone = True

        if is_valid_phone == False:
            messages.add_message(request, messages.ERROR, "Phone is invalid")

        full_name = full_name.replace('  ', ' ')
        full_name = full_name.replace('  ', ' ')
        full_name = full_name.split(' ')

        count = 0
        first_name = ''
        last_name = ''
        for name_string in full_name:
            if count == 0:
                first_name = name_string
                count+=1
            else:
                last_name += name_string+' '
        if email_exists or phone_exists or password != confirm_password or is_valid_phone is False:
            return HttpResponseRedirect(reverse(customer_signup))
        else:
            user_create = User.objects.create(username=username,
                                              first_name=first_name,
                                              last_name=last_name,
                                              email=email,
                                              password=make_password(password),
                                              )

            user_create.profile.status = 'Y'
            user_create.profile.type = 'C'

            user_create.profile.stripe_customer_id = None
            user_create.profile.save()
            Customer_profile.objects.create(customer_id=user_create.id, cell_phone=phone)
            login(request, user_create)


            messages.add_message(request, messages.SUCCESS, 'Registered Successfully')
            return HttpResponseRedirect(reverse('customer_profile'))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def customer_profile(request):
    if request.method == 'GET':
        current_user = request.user

        blacklisted_job = Job_blacklisting_customer.objects.filter(customer_id=current_user.id).values_list('job_id', flat=True)
        job_list = Job.objects.filter(customer=current_user.id).exclude(id__in=blacklisted_job).order_by('-id')
        all_conversation = Conversation.objects.filter(home_owner_id=current_user.id)\
            .values('id', 'sender', 'job', 'home_owner', 'provider_id', 'provider__provider_profile__company_name', 'message', 'created_at')\

        conversation = all_conversation.filter(job_id__isnull=False)\
            .distinct('job', 'home_owner', 'provider__provider_profile__company_name')

        notify_accepted = Job_notified.objects.filter(interested='A', job__provider__isnull=True, job__customer_id=request.user.id)\
            .values('job_id', 'provider__provider_profile__company_name', 'provider_id', 'created_at')

        message_body = "SYSTEM GENERATED - Service Provider has placed a contact request"
        customer_details = Customer_profile.objects.filter(customer=current_user.id)[0]
        return render(request, 'customer/customer/dashboard.html', context={'customer_data': current_user,
                                                                            'customer_details': customer_details,
                                                                            'job_list': job_list,
                                                                            'conversation_list': conversation,
                                                                            'notify_accepted': notify_accepted,
                                                                            'message_body': message_body})


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def customer_profile_edit(request, purpose):
    if request.method == 'POST':
        current_user = request.user
        # user = User.objects.get(pk=current_user)
        if purpose == 'profile_update':
            first_name = request.POST['first_name']
            last_name = request.POST['last_name']
            email = request.POST['email']
            cell_phone = request.POST['cell_phone']
            current_user.first_name = first_name
            current_user.last_name = last_name
            current_user.email = email
            current_user.save()
            Customer_profile.objects.filter(customer_id=current_user.id).update(cell_phone=cell_phone)
            messages.add_message(request, messages.SUCCESS, 'Updated Successfully')
            return HttpResponseRedirect(reverse(customer_profile))
        elif purpose == 'password_change':
            password = request.POST['password']
            confirm_password = request.POST['confirm_password']
            if password == confirm_password:
                current_user.password = make_password(password)
                current_user.save()
                messages.add_message(request, messages.SUCCESS, 'Updated Successfully')
            else:
                messages.add_message(request, messages.ERROR, 'Passwords do not match')
            return HttpResponseRedirect(reverse(customer_profile))
        elif purpose == 'address_update':
            address = request.POST['address']
            zipcode = request.POST['zipcode']
            Customer_profile.objects.filter(customer_id=current_user.id).update(address=address, zipcode=zipcode)
            messages.add_message(request, messages.SUCCESS, 'Updated Successfully')
            return HttpResponseRedirect(reverse(customer_profile))


# @login_required(login_url='customer_login')
def pro_finder(request):

    if request.method == "GET":
        categories = Categories.objects.filter()
        parent_categories = categories.filter(category_level=0)
        child_categories = categories.filter(category_level=1)
        child_sub_categories = categories.filter(category_level=2)
        return render(request, 'customer/customer/pro_finder.html',
                      context={'parent_categories': parent_categories,
                               'child_categories': child_categories,
                               'child_sub_categories': child_sub_categories})
    else:
        return HttpResponseRedirect(reverse('index'))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def find_pro_by_location(request, category_name, cat_id):
    if request.method == "GET":
        g = GeoIP2()

        ip = request.META.get('HTTP_X_REAL_IP')

        country = ""
        if ip:
            country = g.city(ip)['country_code']
        else:
            country = 'US'
        return render(request, 'customer/customer/pro_search_by_location.html',
                      context={'category_name': category_name,
                               'country': country,
                               'cat_id': cat_id})
    elif request.method == "POST":
        zipcode = request.POST['zipcode']

        gmaps = googlemaps.Client(key='AIzaSyBSjfQJThGLeaOfWVdtWHCkfJ9C9pPeiiY')
        geocode_result = gmaps.geocode(zipcode)
        if geocode_result:

            category_id = request.POST['cat_id']
            return HttpResponseRedirect(reverse(get_location_pros, kwargs={
                'category_id': category_id,
                'lat': geocode_result[0]['geometry']['location']['lat'],
                'lng': geocode_result[0]['geometry']['location']['lng'],
                'category_name': category_name}))
        else:
            messages.add_message(request, messages.SUCCESS, 'Invalid address provided')
            return HttpResponseRedirect(reverse('find_pro_by_location', kwargs={'category_name': category_name, 'cat_id': cat_id}))



@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def get_location_pros(request, category_id, lat, lng, category_name):
    if request.method == "GET":
        gmaps = googlemaps.Client(key='AIzaSyBSjfQJThGLeaOfWVdtWHCkfJ9C9pPeiiY')

        point = Point(x=float(lat),
                      y=float(lng), z=0)

        # ----------provider within 25 miles-------------#
        provider_list = Provider_catgories.objects.filter(category_id=category_id,
                                                          #sunil change.
                                                          # provider__profile__authorize_customer_id__isnull=False,
                                                          provider__provider_profile__available__exact='Y',
                                                          provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25))).\
            values(
            'provider_id', 'provider__provider_profile__service_radius', 'provider__provider_profile__user_point'
        ).distinct('provider_id')


        prov_id_list = []
        for prov in provider_list:
            dist = Distance(m=distance(point, prov['provider__provider_profile__user_point']).miles)
            if prov['provider__provider_profile__service_radius'] > dist.m:
                prov_id_list.append(prov['provider_id'])

        sorted_providers = provider_list.filter(provider_id__in=prov_id_list). \
            values(
            'provider__provider_profile__company_name',
            'provider__provider_profile__rating',
            'provider__provider_profile__image',
            'provider__provider_profile__rating',
            'provider__provider_profile__active_since',
            'provider__provider_profile__city',
            'provider', 'min_price', 'max_price'
        )



        page = request.GET.get('page', 1)

        paginator = Paginator(sorted_providers, 20)
        try:
            providers = paginator.page(page)
        except PageNotAnInteger:
            providers = paginator.page(1)
        except EmptyPage:
            providers = paginator.page(paginator.num_pages)

        import requests, json

        url = "https://maps.googleapis.com/maps/api/geocode/json"

        querystring = {"latlng": lat+','+lng, "key": "AIzaSyBSjfQJThGLeaOfWVdtWHCkfJ9C9pPeiiY"}

        payload = ""
        headers = {
            'cache-control': "no-cache",
            'Postman-Token': "4aa74151-fcb4-445d-a0a0-c491188b5129"
        }

        response = requests.request("GET", url, data=payload, headers=headers, params=querystring)

        location_data = json.loads(response.text)
        raw_location_name = location_data['plus_code']['compound_code']
        location_name = raw_location_name.split(" ", 1)[1]
        return render(request, 'customer/customer/pro_search_result.html', context={'provider_list': providers,
                                                                                    'category_id': category_id,
                                                                                    'category_name': category_name,
                                                                                    'lat': lat,
                                                                                    'lng': lng,
                                                                                    'address': location_name
                                                                                    })


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_info(request, pk, cat_id, category_name, lat, lng):
    if request.method == 'GET':
        provider_info = Provider_catgories.objects.filter(provider_id=pk).values('provider__provider_profile__city',
                                                                               'provider__provider_profile__company_address',
                                                                               'provider__provider_profile__zipcode',
                                                                               'provider__provider_profile__city',
                                                                               'provider__provider_profile__state',
                                                                               'provider__provider_profile__company_name',
                                                                               'provider__provider_profile__active_since',
                                                                               'provider__provider_profile__cell_phone',
                                                                               'provider__provider_profile__fax',
                                                                               'provider__provider_profile__image',
                                                                               'provider__provider_profile__description',
                                                                               'provider__provider_profile__available',
                                                                               'provider__provider_profile__rating',
                                                                               'provider__email',
                                                                               'provider__profile__provider_type',
                                                                               'provider__provider_catgories__category__name').distinct('provider__provider_catgories__category')
        provider_images = Provider_profile_image.objects.filter(provider_id=pk)
        provider_certificate_images = Provider_certificate_image.objects.filter(provider_id=pk)

        #creating search point
        point = Point(x=float(lat),
                      y=float(lng),
                      z=0)

        #getting provider within 25 miles
        provider_list = Provider_profile.objects.filter(
            provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25)),
            provider__provider_catgories__category_id__exact=cat_id
            #sunil chnage
            # provider__profile__authorize_customer_id__isnull=False).values('provider__email', 'provider_id',
            ).values('provider__email', 'provider_id',
                                                                           'subscribed',
                                                                           'provider__provider_profile__service_radius',
                                                                           'provider__provider_profile__user_point').distinct(
            'provider_id')

        #make provider_list within radius search
        provider_id_list = []
        for prov in provider_list:
            dist = Distance(m=distance(point, prov['provider__provider_profile__user_point']).miles)
            if prov['provider__provider_profile__service_radius'] > dist.m:
                provider_id_list.append(prov['provider_id'])

        refined_provider_list = provider_list.filter(provider_id__in=provider_id_list)

        providers_count = refined_provider_list.count()
        user_type = Profile.objects.filter(user_id=request.user.id).values('type')[0]

        view_count = None
        if user_type['type'] == 'C':
            view_count = Provider_profile_views.objects.filter(provider_id=pk,
                                                               customer_id=request.user.id).count()

        return render(request, 'customer/customer/pro_details.html', context={'provider_info': provider_info,
                                                                              'provider_images': provider_images,
                                                                              'provider_certificate_images': provider_certificate_images,
                                                                              'providers_count': providers_count,
                                                                              'cat_id': cat_id,
                                                                              'provider_id': pk,
                                                                              'lat': lat,
                                                                              'lng': lng,
                                                                              'view_count': view_count,
                                                                              'category_name': category_name})


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_profile_details(request, pk):
    if request.method == "GET":
        provider_info = Provider_catgories.objects.filter(provider_id=pk).values('provider__provider_profile__city',
                                                                                 'provider__provider_profile__company_address',
                                                                                 'provider__provider_profile__zipcode',
                                                                                 'provider__provider_profile__latitude',
                                                                                 'provider__provider_profile__longitude',
                                                                                 'provider__provider_profile__city',
                                                                                 'provider__provider_profile__state',
                                                                                 'provider__provider_profile__company_name',
                                                                                 'provider__provider_profile__active_since',
                                                                                 'provider__provider_profile__cell_phone',
                                                                                 'provider__provider_profile__fax',
                                                                                 'provider__provider_profile__image',
                                                                                 'provider__provider_profile__description',
                                                                                 'provider__provider_profile__available',
                                                                                 'provider__provider_profile__rating',
                                                                                 'provider__email',
                                                                                 'provider__profile__provider_type',
                                                                                 'provider__provider_catgories__category__name').distinct(
            'provider__provider_catgories__category')

        provider_images = Provider_profile_image.objects.filter(provider_id=pk)
        certificate_images = Provider_certificate_image.objects.filter(provider_id=pk)

        user_type = Profile.objects.filter(user_id=request.user.id).values('type')[0]

        view_count = None
        if user_type['type'] == 'C':
            view_count = Provider_profile_views.objects.filter(provider_id=pk,
                                                               customer_id=request.user.id).count()

        return render(request, 'customer/customer/simple_pro_details.html', context={'provider_info': provider_info,
                                                                              'provider_images': provider_images,
                                                                              'certificate_images': certificate_images,
                                                                              # 'providers_count': providers_count,
                                                                              # 'cat_id': cat_id,
                                                                              'provider_id': pk,
                                                                              'view_count': view_count
                                                                              # 'category_name': category_name
                                                                              })


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def prev_provider(request, provider_id, cat_id, lat, lng):
    if request.method == 'GET':

        # creating search point
        point = Point(x=float(lat),
                      y=float(lng),
                      z=0)

        # getting provider within 25 miles
        provider_list = Provider_profile.objects.filter(provider_id__lt=provider_id,
                                                   provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25)),
                                                    provider__provider_catgories__category_id__exact=cat_id,
                                                    available='Y').values('provider_id',
                                                    'provider__provider_catgories__category__name',
                                                    'provider__provider_profile__user_point',
                                                    'provider__provider_profile__service_radius').order_by('-id')[:1]

        # make provider_list within radius search
        provider_id_list = []
        for prov in provider_list:
            dist = Distance(m=distance(point, prov['provider__provider_profile__user_point']).miles)
            if prov['provider__provider_profile__service_radius'] > dist.m:
                provider_id_list.append(prov['provider_id'])

        refined_provider_list = Provider_profile.objects.filter(provider_id__in=provider_id_list,
                                                                provider_id__lt=provider_id,
                                                                provider__provider_profile__user_point__distance_lt=(
                                                                point, Distance(mi=25)),
                                                                # provider__profile__authorize_customer_id__isnull=False,
                                                                #sunil change
                                                                provider__provider_catgories__category_id__exact=cat_id).values(
            'provider_id', 'provider__provider_catgories__category__name').order_by('-id')[:1]

        if refined_provider_list.count():
            return HttpResponseRedirect(reverse(provider_info, kwargs={
                'pk': refined_provider_list[0]['provider_id'],
                'cat_id': cat_id,
                'category_name': refined_provider_list[0]['provider__provider_catgories__category__name'],
                'lat': lat,
                'lng': lng}))
        else:

            # getting provider within 25 miles
            provider_list = Provider_profile.objects.filter(provider_id__gt=provider_id,
                                                       provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25)),
                                                       # provider__profile__authorize_customer_id__isnull=False,
                                                            #sunil change
                                                        available='Y',
                                                       provider__provider_catgories__category_id__exact=cat_id).values(
                                                            'provider_id',
                'provider__provider_catgories__category__name',
                'provider__provider_profile__user_point',
                'provider__provider_profile__service_radius').order_by('-id')[:1]

            for prov in provider_list:
                dist = Distance(m=distance(point, prov['provider__provider_profile__user_point']).miles)
                if prov['provider__provider_profile__service_radius'] > dist.m:
                    provider_id_list.append(prov['provider_id'])

            refined_provider_list = Provider_profile.objects.filter(provider_id__in=provider_id_list,
                                                                    provider_id__gt=provider_id,
                                                       provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25)),
                                                       # provider__profile__authorize_customer_id__isnull=False,
                                                       #sunil change
                                                       available='Y',
                                                       provider__provider_catgories__category_id__exact=cat_id).values(
                                                            'provider_id',
                'provider__provider_catgories__category__name',
                'provider__provider_profile__user_point',
                'provider__provider_profile__service_radius').order_by('-id')[:1]

            if refined_provider_list.count():
                return HttpResponseRedirect(reverse(provider_info, kwargs={'pk': refined_provider_list[0]['provider_id'], 'cat_id': cat_id, 'category_name': refined_provider_list[0]['provider__provider_catgories__category__name'], 'lat': lat, 'lng': lng}))
            else:
                category = Categories.objects.get(pk=cat_id)

                return HttpResponseRedirect(reverse(provider_info, kwargs={'pk': provider_id,
                                                                           'cat_id': cat_id,
                                                                           'category_name':category.name,
                                                                            'lat': lat,
                                                                            'lng': lng,
                                                                           }))





@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def next_provider(request, provider_id, cat_id, lat, lng):
    if request.method == 'GET':

        # creating search point
        point = Point(x=float(lat),
                      y=float(lng),
                      z=0)

        provider_list = Provider_profile.objects.filter(provider_id__gt=provider_id,
                                                   provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25)),
                                                   provider__provider_catgories__category_id__exact=cat_id,available='Y').values(
                                                    'provider_id','provider__provider_catgories__category__name','provider__provider_profile__user_point','provider__provider_profile__service_radius').order_by('id')[:1]


        # make provider_list within radius search
        provider_id_list = []
        for prov in provider_list:
            dist = Distance(m=distance(point, prov['provider__provider_profile__user_point']).miles)
            if prov['provider__provider_profile__service_radius'] > dist.m:
                provider_id_list.append(prov['provider_id'])

        refined_provider_list = Provider_profile.objects.filter(provider_id__in=provider_id_list,
                                                                provider_id__gt=provider_id,
                                                                provider__provider_profile__user_point__distance_lt=(
                                                                point, Distance(mi=25)),
                                                                # provider__profile__authorize_customer_id__isnull=False,
                                                                #sunil change
                                                                provider__provider_catgories__category_id__exact=cat_id).values(
            'provider_id', 'provider__provider_catgories__category__name').order_by('-id')[:1]

        if refined_provider_list.count():
            return HttpResponseRedirect(
                reverse(provider_info, kwargs={'pk': refined_provider_list[0]['provider_id'], 'cat_id': cat_id, 'category_name': refined_provider_list[0]['provider__provider_catgories__category__name'], 'lat': lat, 'lng': lng}))
        else:
            provider_list = Provider_profile.objects.filter(provider_id__lt=provider_id,
                                                       provider__provider_profile__user_point__distance_lt=(point, Distance(mi=25)),
                                                       available='Y',
                                                       provider__provider_catgories__category_id__exact=cat_id).values(
                                                       'provider_id',
                'provider__provider_catgories__category__name',
                'provider__provider_profile__user_point',
                'provider__provider_profile__service_radius').order_by('id')[:1]

            # make provider_list within radius search
            provider_id_list = []
            for prov in provider_list:
                dist = Distance(m=distance(point, prov['provider__provider_profile__user_point']).miles)
                if prov['provider__provider_profile__service_radius'] > dist.m:
                    provider_id_list.append(prov['provider_id'])

            refined_provider_list = Provider_profile.objects.filter(provider_id__in=provider_id_list,
                                                                    provider_id__lt=provider_id,
                                                                    provider__provider_profile__user_point__distance_lt=(
                                                                        point, Distance(mi=25)),
                                                                    # provider__profile__authorize_customer_id__isnull=False,
                                                                    #sunil change
                                                                    available='Y',
                                                                    provider__provider_catgories__category_id__exact=cat_id).values(
                'provider_id',
                'provider__provider_catgories__category__name').order_by('-id')[:1]

            if refined_provider_list.count():
                return HttpResponseRedirect(
                reverse(provider_info, kwargs={'pk': refined_provider_list[0]['provider_id'], 'cat_id': cat_id, 'category_name': refined_provider_list[0]['provider__provider_catgories__category__name'], 'lat': lat, 'lng': lng}))
            else:
                category = Categories.objects.get(pk=cat_id)

                return HttpResponseRedirect(reverse(provider_info, kwargs={'pk': provider_id,
                                                                           'cat_id': cat_id,
                                                                           'category_name':category.name,
                                                                            'lat': lat,
                                                                            'lng': lng,
                                                                           }))

