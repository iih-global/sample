from django.contrib import messages
from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, JsonResponse
from django.urls import reverse
# from ..forms import UserForm
# from job.models import Job
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.utils.http import urlencode
from django.shortcuts import redirect
from django.core.mail import send_mail

# import twocheckout.twocheckout
from job.models import Job
from service_categories.models import Categories, Provider_catgories
from django.contrib.auth.hashers import make_password
from django.contrib.auth.decorators import login_required, user_passes_test
from subscription.models import Charge
from Profile.models import Provider_profile, Provider_profile_image, Provider_payment, Provider_certificate_image, \
    Provider_profile_views, Profile, Customer_profile
import broken_iot.settings as SETTINGS
from .stripe_payment import *
from django.core.urlresolvers import resolve
# import stripe


import os, sys
# from .payment import *
from apscheduler.schedulers.background import BackgroundScheduler
import googlemaps
from django.contrib.gis.geos import Point
from django.contrib.gis.geoip2 import GeoIP2
from django.template.loader import get_template
from django.template import Context
from django.core.mail import EmailMultiAlternatives
import datetime
from dateutil.relativedelta import relativedelta



def user_check(user):
    if user.profile.type == 'P':
        return True
    else:
        return False


def provider_signup(request):
    if request.method == 'GET':
        return render(request, 'customer/signup_as_provider.html')
    elif request.method == 'POST':
        # user = UserForm(request.POST)
        username = request.POST['email']
        # username_exists = User.objects.filter(username__iexact=username).count()
        full_name = request.POST['full_name']
        email = request.POST['email']
        email_exists = User.objects.filter(email__exact=email).count()
        provider_type = request.POST['provider_type']
        password = request.POST['password']
        confirm_password = request.POST['confirm_password']
        if email_exists:
            messages.add_message(request,messages.ERROR, "Email already in use")
        # if username_exists:
        #     messages.add_message(request, messages.ERROR, "Username already in use")
        if password != confirm_password:
            messages.add_message(request, messages.ERROR, "Passwords don't match")
        full_name = full_name.replace('  ', ' ')
        full_name = full_name.replace('  ', ' ')
        full_name = full_name.split(' ')

        count = 0
        first_name = ''
        last_name = ''
        for name_string in full_name:
            if count == 0:
                first_name = name_string
                count += 1
            else:
                last_name += name_string+' '
        if email_exists or password != confirm_password:
            return HttpResponseRedirect(reverse('provider_signup'))
        else:
            user_create = User.objects.create(username=username,
                                              first_name=first_name,
                                              last_name=last_name,
                                              email=email,
                                              password=make_password(password),
                                              )
            # stripe.api_key = 'sk_test_MAi8sJSquMqF3VMRwjSFBcGn'

            # stripe_customer = stripe.Customer.create(
            #     email=user_create.email,
            #     description="Customer for " + user_create.email,
            #     # source="tok_mastercard"  # obtained with Stripe.js
            # )
            user_create.profile.status = 'Y'
            user_create.profile.type = 'P'
            if provider_type == 'P':
                user_create.profile.provider_type = 'P'
            elif provider_type == 'H':
                user_create.profile.provider_type = 'H'
            user_create.profile.stripe_customer_id = None
            # user_create.profile.stripe_customer_id = stripe_customer['id']
            user_create.profile.save()

            trial_month = SETTINGS.TRIAL_MONTH

            today = datetime.datetime.now()
            trial_end_date = today + relativedelta(months=int(trial_month))

            Provider_profile.objects.create(provider_id=user_create.id,trial_end_at=trial_end_date,is_trial=True)

            login(request, user_create)

            template_html = get_template('customer/emails/create_new_provider.html')
            d = Context({'provider_name': first_name +' '+last_name,
                         'today_date_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M")})

            html_content = template_html.render(d.flatten())
            msg = EmailMultiAlternatives('BrokenIot - Subscription Created', '', 'support@brokeniot.com',
                                         [email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()

            messages.add_message(request, messages.SUCCESS, 'Registration was Successfull')
            return HttpResponseRedirect(reverse(provider_details))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_details(request):
    provider = request.user

    if request.method == 'GET':
        categories = Categories.objects.filter()
        parent_categories = categories.filter(category_level=0)
        child_category = categories.filter(category_level=1)
        child_sub_category = categories.filter(category_level=2).order_by('name')
        provider_details = Provider_profile.objects.filter(provider_id=provider.id)[0]

        provider_categories = Provider_catgories.objects.filter(provider_id=provider.id)
        provider_categories_list = provider_categories.values_list('category_id',flat=True)

        country = "US"
        g = GeoIP2()

        ip = request.META.get('HTTP_X_REAL_IP')
        if ip:
            country = g.city(ip)['country_code']
        else:
            country = 'US'
        return render(request, 'customer/providers/provider_work_details.html', context={'provider_id': provider.id,
                                                                                         'parent_categories': parent_categories,
                                                                                         'child_category': child_category,
                                                                                         'child_sub_category': child_sub_category,
                                                                                         'provider_details': provider_details,
                                                                                         'provider_categories': provider_categories,
                                                                                         'provider_categories_list': provider_categories_list,
                                                                                         'country': country
                                                                                         })
    elif request.method == 'POST':
        service_radius = request.POST['service_radius']
        zipcode = request.POST['zipcode']

        if 'categories[]' in request.POST:
            categories = request.POST.getlist('categories[]')
            parent = request.POST.getlist('parent[]')
            pro_details = Provider_profile.objects.get(provider_id=provider.id)

            gmaps = googlemaps.Client(key='')
            geocode_result = gmaps.geocode(zipcode)

            g = GeoIP2()

            ip = request.META.get('HTTP_X_REAL_IP')

            country = ""
            if ip:
                country = g.city(ip)['country_code']
            else:
                country = 'US'

            if_country_true = 0
            if geocode_result:
                for i in range(len(geocode_result[0]['address_components'])):

                    if 'short_name' in geocode_result[0]['address_components'][i]:

                        if geocode_result[0]['address_components'][i]['short_name'] == country:

                            if_country_true = 1
                            point = Point(x=geocode_result[0]['geometry']['location']['lat'], y=geocode_result[0]['geometry']['location']['lng'], z=0, srid=4326)
                            if pro_details:

                                lat = geocode_result[0]['geometry']['location']['lat']
                                lng = geocode_result[0]['geometry']['location']['lng']

                                provider_profile_country = get_country_base_on_lat_and_long(lat,lng)

                                if provider_profile_country is None or provider_profile_country == '':
                                    messages.add_message(request, messages.ERROR,'You have exceeded your rate-limit for this API.')
                                    return HttpResponseRedirect(reverse('provider_details'))

                                pro_details.service_radius = service_radius
                                pro_details.latitude = geocode_result[0]['geometry']['location']['lat']
                                pro_details.longitude = geocode_result[0]['geometry']['location']['lng']
                                pro_details.zipcode = zipcode
                                pro_details.user_point = point
                                pro_details.category_list = categories
                                pro_details.country = provider_profile_country
                                pro_details.save()

                                Provider_catgories.objects.filter(provider_id=provider.id).delete()
                                for index, cat_id in enumerate(categories):

                                    Provider_catgories.objects.create(category_id=cat_id,
                                                                      provider_id=provider.id,
                                                                      parent_id_id=parent[index])
                            else:
                                Provider_profile.objects.create(provider_id=provider.id,
                                                                service_radius=service_radius,
                                                                zipcode=zipcode,
                                                                category_list=categories)
                                for cat_id in categories:
                                    Provider_catgories.objects.create(category_id=cat_id,
                                                                      provider_id=provider.id)


                if if_country_true == 1:
                    return HttpResponseRedirect(reverse('provider_company_info'))
                else:
                    messages.add_message(request, messages.ERROR, 'The address/zipcode entered does not exists.')
                    return HttpResponseRedirect(reverse('provider_details'))
            else:
                messages.add_message(request, messages.ERROR, 'The zipcode entered does not exists.')
                return HttpResponseRedirect(reverse('provider_details'))

            return HttpResponseRedirect(reverse(provider_company_info))
        else:
            messages.add_message(request, messages.ERROR, 'Need to add atleast one Task')
            return HttpResponseRedirect(reverse('provider_details'))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_account(request):
    if request.method == 'GET':
        provider_details = Provider_profile.objects.filter(company_name__isnull=False,
                                                           business_phone__isnull=False,
                                                           provider_id=request.user.id).count()
        if provider_details:
            q = request.GET.get('is_register', None)
            if q:
                if request.GET['is_register'] == '1':

                    # provider_details = Provider_profile.objects.get(provider_id=request.user.id)
                    # provider_details.is_trial = False
                    # provider_details.save()

                    if request.GET['is_subscribe'] == '1':
                        messages.add_message(request, messages.SUCCESS,
                                         'Payment information added successfully and you are subscribed.')
                    else:
                        messages.add_message(request, messages.SUCCESS,
                                         'Payment information added successfully and you will be charged per job basis.')

            return render(request, 'customer/providers/account.html')
        else:
            return HttpResponseRedirect(reverse('provider_details'))
    else:
        return 404


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_company_info(request):
    pro_details = Provider_profile.objects.get(provider_id=request.user.id)
    if request.method == 'GET':
        g = GeoIP2()

        ip = request.META.get('HTTP_X_REAL_IP')

        country = ""
        if ip:
            country = g.city(ip)['country_code']
        else:
            country = 'US'

        c_year = datetime.date.today().year

        return render(request,
                      'customer/providers/provider_company_details.html',
                      context={'provider_details': pro_details,
                               'range': range (1900, c_year + 1),
                               'country': country})

    elif request.method == 'POST':
        gmaps = googlemaps.Client(key='')
        geocode_result = gmaps.geocode(request.POST['zipcode'])

        g = GeoIP2()

        ip = request.META.get('HTTP_X_REAL_IP')


        country = ""
        if ip:
            country = g.city(ip)['country_code']
        else:
            country = 'US'

        if_country_true = 0
        if geocode_result:
            for i in range(len(geocode_result[0]['address_components'])):
                if 'short_name' in geocode_result[0]['address_components'][i]:
                    if geocode_result[0]['address_components'][i]['short_name'] == country:
                        if_country_true = 1
                        point = Point(x=geocode_result[0]['geometry']['location']['lat'],
                                      y=geocode_result[0]['geometry']['location']['lng'], z=0, srid=4326)

                        lat = geocode_result[0]['geometry']['location']['lat']
                        lng = geocode_result[0]['geometry']['location']['lng']

                        country = pro_details.country

                        if country is None or country == '':
                            country = get_country_base_on_lat_and_long(lat, lng)
                            if country is None or country == '':
                                messages.add_message(request, messages.ERROR,
                                                     'You have exceeded your rate-limit for this API.')
                                return HttpResponseRedirect(reverse('provider_company_info'))

                        else:
                            if pro_details.zipcode != request.POST['zipcode']:
                                country = get_country_base_on_lat_and_long(lat, lng)
                                if country is None or country == '':
                                    messages.add_message(request, messages.ERROR,
                                                         'You have exceeded your rate-limit for this API.')
                                    return HttpResponseRedirect(reverse('provider_company_info'))

                        pro_details.country = country
                        pro_details.company_name = request.POST['company_name']
                        pro_details.company_address = request.POST['company_address']
                        pro_details.city = request.POST['city']
                        pro_details.state = request.POST['state']
                        pro_details.zipcode = request.POST['zipcode']
                        pro_details.latitude = geocode_result[0]['geometry']['location']['lat']
                        pro_details.longitude = geocode_result[0]['geometry']['location']['lng']
                        pro_details.user_point = point
                        pro_details.type_of_business = request.POST['type_of_business']
                        pro_details.no_of_employees = request.POST['no_of_employees']
                        pro_details.active_since = request.POST['active_since']
                        # pro_details.website = request.POST['website']
                        pro_details.business_phone = request.POST['business_phone']
                        pro_details.cell_phone = request.POST['cell_phone']
                        pro_details.fax = None

                        pro_details.save()

                        name = request.POST['owner_name']
                        name = name.replace('  ', ' ')
                        name = name.replace('  ', ' ')
                        name = name.split(' ')

                        count = 0
                        first_name = ''
                        last_name = ''
                        for name_string in name:
                            if count == 0:
                                first_name = name_string
                                count += 1
                            else:
                                last_name += name_string + ' '
                        request.user.first_name = first_name
                        request.user.last_name = last_name
                        request.user.email = request.POST['email']
                        request.user.save()

                        # messages.add_message(request, messages.SUCCESS, 'Updated Successfully')

            if if_country_true == 1:
                profile = Profile.objects.get(user_id=request.user.id)
                if profile.stripe_customer_id is None:
                    customer_profile_response = create_customer_profile(request.user.first_name,
                                                                    request.user.last_name, request.user.email)
                    if (customer_profile_response != False):

                        profile.stripe_customer_id = customer_profile_response.stripe_id
                        profile.save()
                        return HttpResponseRedirect(reverse(provider_profile))
                    else:
                        messages.add_message(request, messages.ERROR, 'The stripe customer does not created.')
                        return HttpResponseRedirect(reverse('provider_company_info'))
                else:
                    return HttpResponseRedirect(reverse(provider_profile))
            else:
                messages.add_message(request, messages.ERROR, 'The zipcode entered does not exists.')
                return HttpResponseRedirect(reverse('provider_company_info'))
        else:
            messages.add_message(request, messages.ERROR, 'The zipcode entered does not exists.')
            return HttpResponseRedirect(reverse('provider_company_info'))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_profile(request):
    provider = request.user
    provider_details = Provider_profile.objects.get(provider_id=provider.id)

    if request.method == 'GET':
        provider_images = Provider_profile_image.objects.filter(provider_id=request.user.id)
        provider_certificate = Provider_certificate_image.objects.filter(provider_id=request.user.id)
        return render(request, 'customer/providers/provider_profile.html',
                      context={'provider_details': provider_details,
                               'provider_images': provider_images,
                               'provider_certificate': provider_certificate,
                               'provider_type': request.user.profile.provider_type})
    elif request.method == "POST":
        filesize = 0
        provider_details.description = request.POST['description']
        if 'profile_image' in request.FILES:
            for image in request.FILES.getlist('profile_image'):
                filesize += image.size

        provider_details.save()
        if 'certificate_documents' in request.FILES:
            for image in request.FILES.getlist('certificate_documents'):
                filesize += image.size

        if filesize < 5242880:
            if 'profile_image' in request.FILES:
                for image in request.FILES.getlist('profile_image'):

                    Provider_profile_image.objects.create(provider_id=provider.id, image=image)
                provider_details.image = request.FILES.getlist('profile_image')[0]
            provider_details.save()
            if 'certificate_documents' in request.FILES:
                for image in request.FILES.getlist('certificate_documents'):
                    # filesize += image.size
                    Provider_certificate_image.objects.create(provider_id=provider.id, image=image)
            #return HttpResponseRedirect(reverse(provider_payment))

            if provider_details.is_trial == 1:
                provider_details.subscribed = 'Y'
                provider_details.save()

                messages.add_message(request, messages.SUCCESS, 'Your trial subscription created successfully.')
                return HttpResponseRedirect(reverse('my_account'))
            else:
                return HttpResponseRedirect(reverse(provider_payment))
        else:
            messages.add_message(request, messages.ERROR, 'Max upload limit exceeded')
            return HttpResponseRedirect(reverse('provider_profile'))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def trial_end(request):
    provider_id = request.user.id
    try:
        provider_details = Provider_profile.objects.get(provider_id=provider_id)
    except Provider_profile.DoesNotExist:
        provider_details = None
    if provider_details is None:
        return JsonResponse({'status': 0, 'message': 'Provider is not valid'})
    provider_details.is_trial = False
    provider_details.save()
    return JsonResponse({'status': 1, 'message': 'trial status changed'})


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_payment(request):
    provider_id = request.user.id
    try:
        # provider_payment = Provider_payment.objects.get(provider_id=provider_id)
        provider_payment = Profile.objects.get(user=provider_id)
    except Provider_payment.DoesNotExist:
        provider_payment = None

    provider_profile = Provider_profile.objects.get(provider_id=provider_id)

    lat = provider_profile.latitude
    lng = provider_profile.longitude

    alpha2_country_code = provider_profile.country
    if alpha2_country_code is None or alpha2_country_code == '':
        alpha2_country_code = get_country_base_on_lat_and_long(lat,lng)
        if alpha2_country_code is None or alpha2_country_code == '':
            messages.add_message(request, messages.ERROR,
                                 'You have exceeded your rate-limit for this API.')

            current_url = resolve(request.path_info).url_name
            if current_url != 'provider_payment': #this condition for middleware
                return HttpResponseRedirect(reverse('provider_payment'))


        provider_profile.country = alpha2_country_code
        provider_profile.save()

    all_charge = Charge.objects.filter(charge_type='S')
    subscription_charge = all_charge.filter(charge_type='S', country__iexact='US')
    if alpha2_country_code in ['IN', 'PK', 'CA']:
        subscription_charge = all_charge.filter(charge_type='S', country__iexact=alpha2_country_code)

    #setting currency
    currency = 'USD'
    if alpha2_country_code == 'IN':
        currency = 'INR'
    elif alpha2_country_code == 'PK':
        currency = 'PKR'
    elif alpha2_country_code == 'CA':
        currency = 'CAD'


    if request.method == 'GET':
        ######--------------------Authorise.net-----------------########
        authorize_payment_data = get_customer_profile(provider_payment.stripe_customer_id)

        payment_method = payment_method_list(provider_payment.stripe_customer_id)

        card_type = None
        exp_month = None
        exp_year = None
        client_secret = None
        address = ''
        city = ''
        postal_code = ''
        name = ''
        is_edit_card_details = 0
        payment_details = None
        if authorize_payment_data != False and payment_method != False:
            payment_details = authorize_payment_data

            if len(payment_method['data']) > 0 and payment_method['data'][0]['card']['brand'] is not None:
                is_edit_card_details = 1
                card_type = payment_method['data'][0]['card']['brand']
            if len(payment_method['data']) > 0 and  payment_method['data'][0]['card']['exp_month'] is not None:
                is_edit_card_details = 1
                exp_month = payment_method['data'][0]['card']['exp_month']
            if len(payment_method['data']) > 0 and payment_method['data'][0]['card']['exp_year'] is not None:
                is_edit_card_details = 1
                exp_year = payment_method['data'][0]['card']['exp_year']

            if is_edit_card_details == 1:
                if payment_method['data'][0]['billing_details']['address']['line1'] is not None:
                    address = payment_method['data'][0]['billing_details']['address']['line1']
                if payment_method['data'][0]['billing_details']['address']['city'] is not None:
                    city = payment_method['data'][0]['billing_details']['address']['city']
                if payment_method['data'][0]['billing_details']['address']['postal_code'] is not None:
                    postal_code = payment_method['data'][0]['billing_details']['address']['postal_code']
                if payment_method['data'][0]['billing_details']['name'] is not None:
                    name = payment_method['data'][0]['billing_details']['name']

            intent = setup_intent(provider_payment.stripe_customer_id)
            client_secret = intent.client_secret
        mode = SETTINGS.STRIPE_PUBLISHABLE_KEY

        return render(request, 'customer/providers/provider_payment.html', context={'client_secret' : client_secret,
                                                                                    'is_edit_card_details' : is_edit_card_details,
                                                                                    'provider_payment': payment_details,
                                                                                    'subscription_charge': subscription_charge,
                                                                                    'provider_profile': provider_profile,
                                                                                    'currency': currency,
                                                                                    'card_type': card_type,
                                                                                    'exp_month': exp_month,
                                                                                    'exp_year': exp_year,
                                                                                    'mode': mode,
                                                                                    'address': address,
                                                                                    'city': city,
                                                                                    'postal_code': postal_code,
                                                                                    'name': name,
                                                                                })

    elif request.method == "POST":

        subscribe = request.POST['subscribe']

        if subscribe == 'Y':
            if provider_payment.authorize_customer_id == None:
                stripe_customer_id = Profile.objects.get(user_id=request.user.id).stripe_customer_id

                if stripe_customer_id is not None:
                    provider_profile = Provider_profile.objects.get(provider_id=request.user.id)

                    changes = None
                    if provider_profile.country != None:
                        changes = Charge.objects.get(charge_type='S',country=provider_profile.country.lower())
                    else:
                        changes = Charge.objects.get(charge_type='S',country='us')

                    #plan_id = SETTINGS.STRIPE_PLAN_ID

                    plan_id = changes.plan_id
                    get_plan = get_subscription_plan(plan_id)
                    if (get_plan == False):
                        return JsonResponse({'status': 0, 'message': 'plan is not created.'})

                    create_subscription_from_customer_profile_response = create_subscription_from_customer_profile(
                        stripe_customer_id, get_plan.id, provider_payment.updated_at)

                    if (create_subscription_from_customer_profile_response != False):
                        provider_profile.subscribed = 'Y'
                        provider_profile.save()
                        provider_payment.subscription_customer_id = create_subscription_from_customer_profile_response.id
                        provider_payment.save()
                        return JsonResponse({'status': 1, 'message': 'subscription created successfully.'})
                    else:
                        return JsonResponse({'status': 0, 'message': 'customer is not created.'})
                else:
                    return JsonResponse({'status':0,'message':'customer is not created.'})



@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def provider_payment_edit(request):
    provider_id = request.user.id
    try:
        # provider_payment = Provider_payment.objects.get(provider_id=provider_id)
        provider_payment = Profile.objects.get(user=provider_id)
    except Provider_payment.DoesNotExist:
        provider_payment = None
    subscription_charge = Charge.objects.filter(charge_type='S')
    if request.method == "GET":
        provider_profile = Provider_profile.objects.get(provider_id=provider_id)
        mode = SETTINGS.STRIPE_PUBLISHABLE_KEY

        intent = setup_intent(provider_payment.stripe_customer_id)
        client_secret = intent.client_secret

        address = ''
        city = ''
        postal_code = ''
        name = ''

        payment_method = payment_method_list(provider_payment.stripe_customer_id)

        if payment_method != False:
            if len(payment_method['data']) > 0 and payment_method['data'][0]['billing_details']['address']['line1'] is not None:
                address = payment_method['data'][0]['billing_details']['address']['line1']
            if len(payment_method['data']) > 0 and payment_method['data'][0]['billing_details']['address']['city'] is not None:
                city = payment_method['data'][0]['billing_details']['address']['city']
            if len(payment_method['data']) > 0 and payment_method['data'][0]['billing_details']['address']['postal_code'] is not None:
                postal_code = payment_method['data'][0]['billing_details']['address']['postal_code']
            if len(payment_method['data']) > 0 and payment_method['data'][0]['billing_details']['name'] is not None:
                    name = payment_method['data'][0]['billing_details']['name']

        return render(request, 'customer/providers/edit_provider_payment.html',
                      context={'subscription_charge': subscription_charge,
                               'provider_profile': provider_profile,
                               'mode': mode,
                               'client_secret': client_secret,
                               'address': address,
                               'city': city,
                               'postal_code': postal_code,
                               'name': name
                               })

    elif request.method == "POST":

        stripe_customer_id = provider_payment.stripe_customer_id
        get_payment_method = payment_method_list(stripe_customer_id)

        if get_payment_method != False:
            old_payment_id = get_payment_method.data[1].id
            new_payment_id = get_payment_method.data[0].id
            detach_payment = detach_payment_method(old_payment_id)
            if detach_payment != False:
                set_default_card = update_customer_set_default_payment(stripe_customer_id, new_payment_id)
                if set_default_card != False:
                    messages.add_message(request, messages.SUCCESS, 'Payment information updated')
                    return JsonResponse({'status': 1, 'message': 'Payment information updated'})
                else:
                    messages.add_message(request, messages.ERROR, "Encountered some issue, please try again")
                    return JsonResponse({'status': 0, 'message': 'Encountered some issue, please try again'})
            else:
                messages.add_message(request, messages.ERROR, "Encountered some issue, please try again")
                return JsonResponse({'status': 0, 'message': 'Encountered some issue, please try again'})
        else:
            messages.add_message(request, messages.ERROR, "Encountered some issue, please try again")
            return JsonResponse({'status': 0, 'message': 'Encountered some issue, please try again'})

@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def edit_subscription_type(request):
    provider_id = request.user.id

    try:
        # provider_payment = Provider_payment.objects.get(provider_id=provider_id)
        provider_payment = Profile.objects.get(user=provider_id)
    except Provider_payment.DoesNotExist:
        provider_payment = None

    # get provider details
    provider_profile_details = Provider_profile.objects.get(provider_id=provider_id)
    lat = provider_profile_details.latitude
    lng = provider_profile_details.longitude
    subscription_type = Provider_profile.objects.filter(provider_id=provider_id).only('subscribed').first().subscribed
    all_charge = Charge.objects.filter(charge_type='S')

    alpha2_country_code = provider_profile_details.country
    if alpha2_country_code is None or alpha2_country_code == '':
        alpha2_country_code = get_country_base_on_lat_and_long(lat,lng)
        if alpha2_country_code is None or alpha2_country_code == '':
            messages.add_message(request, messages.ERROR,
                                 'You have exceeded your rate-limit for this API.')
            return HttpResponseRedirect(reverse('edit_subscription_type'))
        provider_profile_details.country = alpha2_country_code
        provider_profile_details.save()

    subscription_charge_by_country = all_charge.filter(country__iexact='US')[0].amount
    if alpha2_country_code in ['IN', 'PK', 'CA']:
        subscription_charge_by_country = all_charge.filter(country__iexact=alpha2_country_code)[0].amount

    # setting currency
    currency = 'USD'
    if alpha2_country_code == 'IN':
        currency = 'INR'
    elif alpha2_country_code == 'PK':
        currency = 'PKR'
    elif alpha2_country_code == 'CA':
        currency = 'CAD'
    if request.method == "GET":
        return render(request, 'customer/providers/edit_provider_subscription.html', context={'subscription_type': subscription_type,
                                                                                              'subscription_charge': subscription_charge_by_country,
                                                                                              'currency': currency
                                                                                              })
    elif request.method == "POST":
        subscribe = request.POST['subscribe']

        #---Authorize.net customer profile ID----
        customer_profile_id = request.user.profile.stripe_customer_id
        if subscribe == 'Y':
            #--------------------------getting customer profile-----------------------------
            get_customer_profile_response = get_customer_profile(customer_profile_id)

            if get_customer_profile_response != False:


                #------------------------------checking if already subscribed-------------------
                if_subscribed = Provider_profile.objects.get(provider_id=provider_id).subscribed

                if if_subscribed == 'N':
                    #-----------------------------creating subscription using customer payment profile--------------------

                    provider_profile = Provider_profile.objects.get(provider_id=provider_id)
                    changes = None
                    if provider_profile.country != None:
                        changes = Charge.objects.get(charge_type='S', country=provider_profile.country.lower())
                    else:
                        changes = Charge.objects.get(charge_type='S', country='us')

                    plan_id = changes.plan_id
                    # plan_id = SETTINGS.STRIPE_PLAN_ID
                    get_plan = get_subscription_plan(plan_id)

                    if (get_plan == False):
                        messages.add_message(request, messages.ERROR, 'Must create plan before add customer.')
                        return HttpResponseRedirect(reverse('provider_payment'))


                    create_subscription_from_customer_profile_response = create_subscription_from_customer_profile(
                        customer_profile_id,get_plan.id,provider_payment.updated_at)

                    if (create_subscription_from_customer_profile_response != False):

                        provider_profile_details.subscribed = 'Y'
                        provider_profile_details.save()

                        profile = Profile.objects.get(pk=request.user.profile.id)
                        profile.subscription_customer_id = create_subscription_from_customer_profile_response.id
                        profile.save()

                        messages.add_message(request, messages.SUCCESS,
                                             'Payment information added successfully and you are subscribed.')

                        # mail_content_for_subscribe = "Hi "+provider_profile_details.company_name + ",\n\nThank you for your business.\n\nYou have now successfully activated your subscription with BrokentIoT.\n\nIt was great working with you, looking forward to doing business again.\n\nPlease let us know if you have any query.\n\nRegards,\nBrokentIoT Team"
                        provider_email = User.objects.only('email').get(pk=request.user.id).email

                        template_html = get_template('customer/emails/subscription_successfully.html')
                        d = Context({'company_name': provider_profile_details.company_name,'today_date_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M")})

                        html_content = template_html.render(d.flatten())
                        msg = EmailMultiAlternatives('Subscription created successfully!', '', 'support@brokeniot.com',
                                                     [provider_email])
                        msg.attach_alternative(html_content, "text/html")
                        msg.send()
                        
                        # send_mail('Subscription created successfully!', mail_content_for_subscribe, 'support@brokeniot.com',[provider_email])
                        return HttpResponseRedirect(reverse('provider_account'))
                    else:
                        messages.add_message(request, messages.ERROR,
                                             create_subscription_from_customer_profile_response.messages.message[
                                                 0]['text'].text)
                        return HttpResponseRedirect(reverse('provider_payment'))
        elif subscribe == 'N':

            # --------------------------getting customer profile-----------------------------
            get_customer_profile_response = get_customer_profile(customer_profile_id)
            if get_customer_profile_response != False:

                # ------------------------------checking if already subscribed-------------------
                if_subscribed = Provider_profile.objects.get(provider_id=provider_id).subscribed

                if if_subscribed == 'Y':
                    customer_subscription_id  = request.user.profile.subscription_customer_id

                    if customer_subscription_id is not None:
                        res = cancel_subscription(str(customer_subscription_id))

                    #__if 'subscriptionIds' in get_customer_profile_response:
                    # if hasattr(get_customer_profile_response, 'subscriptionIds') == True:
                    #     if hasattr(get_customer_profile_response.subscriptionIds, 'subscriptionId') == True:
                    #         #__customer_subscription_id = get_customer_profile_response.subscriptionIds.subscriptionId
                    #         for customer_subscription_id in (get_customer_profile_response.subscriptionIds.subscriptionId):
                    #             res = cancel_subscription(str(customer_subscription_id))


        Provider_profile.objects.filter(provider_id=provider_id).update(subscribed=subscribe)
        messages.add_message(request, messages.SUCCESS, 'Subscription type updated')
        return HttpResponseRedirect(reverse(provider_account))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def manage_services(request):
    provider = request.user
    list_id = []
    if request.method == 'GET':
        subcategory = Categories.objects.filter(category_level=1)
        services_offered = Provider_catgories.objects.filter(provider_id=provider.id)
        for service in services_offered:
            if service.parent_id_id not in list_id:
                list_id.append(service.parent_id_id)
        return render(request, 'customer/providers/services_offered.html',
                      context={'services_offered': services_offered,
                               'sub_category': subcategory,
                               'list_id': list_id})
    elif request.method == 'POST':
        pass


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def manage_availability(request):
    provider = request.user.id
    provider_details = Provider_profile.objects.get(provider_id=provider)
    if request.method == 'GET':
        return render(request, 'customer/providers/manage_availability.html', context={'if_active': provider_details.available})
    elif request.method == 'POST':
        availabilty = request.POST['available']
        profile = Profile.objects.get(user_id=provider)
        stripe_sub_id = profile.subscription_customer_id

        if provider_details.subscribed == 'Y' and stripe_sub_id != None:
            is_status = 1
            if availabilty == 'Y':
                enabled_sub = enabled_subscription(stripe_sub_id)
                if enabled_sub == False:
                    is_status = 0
            if availabilty == 'N':
                disabled_sub = disabled_subscription(stripe_sub_id)
                if disabled_sub == False:
                    is_status = 0
            if is_status == 0:
                messages.add_message(request, messages.SUCCESS, 'Something issue in subscription enabled/disabled.')
                return HttpResponseRedirect(reverse(manage_availability))

        provider_details.available = availabilty
        provider_details.save()
        messages.add_message(request, messages.SUCCESS, 'Availability updated Successfully')
        return HttpResponseRedirect(reverse(manage_availability))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def add_services(request, pk):
    provider = request.user
    if request.method == 'GET':
        category = Categories.objects.filter(parent_id=pk)
        provider_categories = Provider_catgories.objects.filter(provider_id=provider.id, parent_id_id=pk).values('id', 'category_id', 'parent_id', 'parent_id__name', 'parent_id_id', 'min_price', 'max_price')
        return render(request, 'customer/providers/edit_service_offered.html',
                      context={'category': category,
                               'provider_categories': provider_categories})
    elif request.method == 'POST':

        services_list = request.POST.getlist('services[]')
        service_list_by_parent_category = Provider_catgories.objects.filter(parent_id_id=pk, provider_id=provider.id).values('category_id')
        # Provider_catgories.objects.filter(parent_id_id=pk, provider_id=provider.id).delete()
        for list_id in services_list:
            provider_categories = Provider_catgories.objects.filter(provider_id=provider.id, category_id=list_id)
            if provider_categories.count() == 0:
                Provider_catgories.objects.create(category_id=list_id,
                                                  provider_id=provider.id,
                                                  parent_id_id=pk)
        for pro_cat_list in service_list_by_parent_category:
            if services_list.count(str(pro_cat_list['category_id'])) == 0:
                Provider_catgories.objects.filter(parent_id_id=pk, category_id=pro_cat_list['category_id']).delete()


        return HttpResponseRedirect(reverse(manage_services))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def edit_service_price(request, cat_id):
    # pass
    provider_category = Provider_catgories.objects.filter(provider_id=request.user.id, category_id=cat_id)
    if request.method == "GET":
        return render(request, 'customer/providers/service_price_edit.html',
                      context={'cat_id': cat_id,
                               'provider_category': provider_category[0]})
    elif request.method == "POST":
        provider_category.update(min_price=request.POST['min_price'], max_price=request.POST['max_price'])
        # request.POST['min_price']
        # request.POST['max_price']
        messages.add_message(request, messages.SUCCESS, 'Cost updated Successfully')
        return HttpResponseRedirect(reverse(edit_service_price, kwargs={'cat_id': cat_id}))



@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def delete_provider_image(request, pk):
    if request.method == 'GET':
        provider_profile_image = Provider_profile_image.objects.filter(provider_id=request.user.id, pk=pk).delete()
        if provider_profile_image:
            messages.add_message(request, messages.SUCCESS, 'Image removed Successfully')
        else:
              messages.add_message(request, messages.ERROR, 'Not Authorised')
        return HttpResponseRedirect(reverse(provider_profile))


@login_required(login_url='customer_login')
@user_passes_test(user_check, login_url='customer_login')
def delete_provider_certificate(request, pk):
    if request.method == 'GET':
        provider_certificate = Provider_certificate_image.objects.filter(provider_id=request.user.id)
        provider_certificate_count = provider_certificate.count()
        if provider_certificate_count > 1:
            provider_certificate_delete = provider_certificate.filter(pk=pk).delete()
            if provider_certificate_delete:
                messages.add_message(request, messages.SUCCESS, 'Document removed Successfully')
            else:
                messages.add_message(request, messages.ERROR, 'Not Authorised')
        else:
            messages.add_message(request, messages.ERROR, 'Not Authorised')
        return HttpResponseRedirect(reverse(provider_profile))

# does not require user type checking
@login_required(login_url='customer_login')
def view_contact(request, pk, cat_id, category_name, lat, lng, job_id):

    if request.method == 'GET':
        scheduler = BackgroundScheduler()
        user_type = Profile.objects.filter(user_id=request.user.id).values('type', 'authorize_customer_id')[0]

        if user_type['type'] == 'C':
            view_count = Provider_profile_views.objects.filter(provider_id=pk, customer_id=request.user.id).count()
            if view_count:
                if int(job_id) == 0 and int(cat_id) == 0:
                    return redirect('provider_profile_details', pk=pk)
                elif int(job_id):
                    return redirect('provider_info_for_job',
                                                        pk=pk, cat_id=cat_id,
                                                                category_name=category_name, job_id=job_id)
                else:
                    return redirect('provider_info', pk=pk, cat_id=cat_id,
                                                                category_name=category_name, lat=lat, lng=lng)
            else:
                provider_subscribed = Provider_profile.objects.only('subscribed').get(provider_id=pk).subscribed
                provider_email = User.objects.only('email').get(pk=pk).email

                if provider_subscribed == 'N':
                    Provider_profile_views.objects.create(customer_id=request.user.id, provider_id=pk)

                elif provider_subscribed == 'Y':
                    Provider_profile_views.objects.create(customer_id=request.user.id, provider_id=pk, charged='Y')

                if int(job_id) == 0 and int(cat_id) == 0:
                    scheduler.add_job(
                        lambda: mail_to_users(job_id, request.user.id, request.user.email, pk, provider_email),
                        max_instances=1)
                    scheduler.start()
                    return redirect('provider_profile_details',
                                    pk=pk)
                if int(job_id):
                    scheduler.add_job(
                        lambda: mail_to_users(job_id, request.user.id, request.user.email, pk, provider_email),
                        max_instances=1)
                    scheduler.start()
                    return redirect('provider_info_for_job',
                                    pk=pk, cat_id=cat_id,
                                    category_name=category_name, job_id=job_id)
                else:
                    scheduler.add_job(
                        lambda: mail_to_users(job_id, request.user.id, request.user.email, pk, provider_email),
                        max_instances=1)
                    scheduler.start()
                    return redirect('provider_info', pk=pk, cat_id=cat_id,
                                    category_name=category_name, lat=lat, lng=lng)

        elif user_type['type'] == 'P':
            return HttpResponse('Unauthorized action')
    else:
        return HttpResponse('Unauthorized action')


@login_required(login_url='customer_login')
def view_contact_simple(request, provider_id):

    if request.method == 'GET':
        scheduler = BackgroundScheduler()
        user_type = Profile.objects.filter(user_id=request.user.id).values('type', 'authorize_customer_id')[0]

        if user_type['type'] == 'C':
            view_count = Provider_profile_views.objects.filter(provider_id=provider_id, customer_id=request.user.id).count()
            if view_count:

                return redirect('provider_profile_details', pk=provider_id)

            else:
                provider_subscribed = Provider_profile.objects.only('subscribed').get(provider_id=provider_id).subscribed
                provider_email = User.objects.only('email').get(pk=provider_id).email

                if provider_subscribed == 'N':
                    Provider_profile_views.objects.create(customer_id=request.user.id, provider_id=provider_id)

                elif provider_subscribed == 'Y':
                    Provider_profile_views.objects.create(customer_id=request.user.id, provider_id=provider_id, charged='Y')

                job_id = 0
                scheduler.add_job(
                    lambda: mail_to_users(job_id, request.user.id, request.user.email, provider_id, provider_email),
                    max_instances=1)
                scheduler.start()
                return redirect('provider_profile_details',
                                pk=provider_id)


        elif user_type['type'] == 'P':
            return HttpResponse('Unauthorized action')
    else:
        return HttpResponse('Unauthorized action')

def mail_to_users(job_id, customer_id, owner_email, provider_id, provider_email):
    job_details = None
    if job_id != "0":
        job_details = Job.objects.filter(id=job_id).values('customer__email', 'customer_id', 'title')[0]
    # -------------------------------------------------------SEND MAIL SECTION-----------------------------------------------
    
    # -------------------------------------------------------MAIL TO PROVIDER---------------------------------------------------
    home_owner_phone = Customer_profile.objects.only('cell_phone').get(customer_id=customer_id).cell_phone
    
    if job_id != "0":
        provider_job_url = "http://brokeniot.com/provider_job_view/" + str(job_id)
        
        template_html = get_template('customer/emails/home_owner_contact.html')

        d = Context({'provider_job_url': provider_job_url,
                     'today_date_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                     'job_id': str(job_id),
                     'contact': home_owner_phone,
                     'email': owner_email,
                     'job_title': job_details['title']})

        html_content = template_html.render(d.flatten())
        msg = EmailMultiAlternatives('Home Owner Contact-BrokenIot', '', 'support@brokeniot.com',
                                     [provider_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()

    # mail_content_provider = provider_message_body + custom_message
    # send_mail('Home Owner Contact-BrokenIot', mail_content_provider, 'support@brokeniot.com',
    #           [provider_email])

    # ---------------------------------------------------------MAIL TO OWNER------------------------------------------------------
    
    service_provider_phone = Provider_profile.objects.only('cell_phone').get(
        provider_id=provider_id).cell_phone

    provider_profile_url = "http://brokeniot.com/provider_profile_details/" + str(provider_id)

    template_html = get_template('customer/emails/service_provider_contact.html')

    d = Context({'provider_profile_url': provider_profile_url,
                 'today_date_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                 'job_id': str(job_id),
                 'contact': service_provider_phone,
                 'email': provider_email,
                 'job_title': job_details['title']})

    html_content = template_html.render(d.flatten())
    msg = EmailMultiAlternatives('Service Provider Contact-BrokenIot', '', 'support@brokeniot.com',
                                 [owner_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()
    return HttpResponse('mail Send')
    
    # send_mail('Service Provider Contact-BrokenIot', mail_content_owner, 'support@brokeniot.com',
    #           [owner_email])

def get_country_base_on_lat_and_long(lat,lng):
    import requests, json
    from iso3166 import countries


    url = "https://maps.googleapis.com/maps/api/geocode/json"
    querystring = {"latlng": str(lat) + ',' + str(lng), "key": ""}
    payload = ""
    headers = {
        'cache-control': "no-cache",
        'Postman-Token': ""
    }

    response = requests.request("GET", url, data=payload, headers=headers, params=querystring)
    result = json.loads(response.text)
    if result['results'] is not None and result['results'] != '' and len(result['results']) > 0:
        new_result = result['results'][0]['formatted_address']
        new_result_array = new_result.split(' ')
        country = countries.get(new_result_array[-1])
        alpha2_country_code = country.alpha2
        return alpha2_country_code
    else:
        return None