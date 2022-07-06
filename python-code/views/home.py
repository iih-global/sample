
from django.contrib import messages
from django.shortcuts import render
from django.http import *
from django.urls import reverse
from django.contrib.auth import tokens
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.hashers import make_password
from django.utils.encoding import force_text
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from service_categories.models import Categories
from django.contrib.auth.decorators import login_required, user_passes_test
from Profile.models import Profile
from service_categories.models import Categories
from administrator.models import *
from django.core.mail import send_mail
from Profile.models import Provider_profile
from job.models import Job
from review.models import Job_review
from testimonial.models import Testimonial
from slider_message.models import SliderMessage
from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from django.template import Context
import datetime

def user_check(user):
    if not user.is_superuser and user.profile.type == 'C':
        return True
    else:
        return False


def index(request):
    top_categories = Categories.objects.filter(top_category__exact="Y")
    if request.user.is_authenticated:
        user_type = Profile.objects.filter(user=request.user.id).values_list('type', flat=True)[0]
        testimonials = Testimonial.objects.filter(testimonial_from_id=request.user.id)
        
    else:
        user_type = request.user
        testimonials = None

    service_categories = Categories.objects.filter(category_level=2)
    #provider_review = Provider_profile.objects.values('provider_id', 'image', 'company_name', 'active_since', 'city', 'rating').count()
    total_customers = Profile.objects.filter(type__exact='C').count()
    total_orders = Job.objects.count()
    total_reviews = Job_review.objects.count()
    approved_testimonials = Testimonial.objects.filter(approved=True)
    slider_message = SliderMessage.objects.filter(is_deleted=False)


    return render(request,
                'customer/index.html',
                context={
                    'top_categories': top_categories,
                    'service_categories': service_categories,
                    'user_type': user_type,
                    'total_reviews':total_reviews,
                    'total_customers': total_customers,
                    'total_orders': total_orders,
                    'testimonials': testimonials,
                    'approved_testimonials': approved_testimonials,
                    'slider_messages': slider_message
                })


def custom_404(request):
    return render(request, '404.html', {}, status=404)

def custom_500(request):
    return render(request, '500.html', {}, status=404)



def customer_login(request):
    next = ""
    if request.method == 'GET':
        next = request.GET.get('next', '')
        return render(request, 'customer/login.html', context={'next': next})

    elif request.method == 'POST':
        user_type = request.POST['login_user_type']
        username = request.POST['username']
        username_1 = request.POST['username_1']
        password = request.POST['password']
        password_1 = request.POST['password_1']
        next = request.POST['next']


        if user_type == 'home':
            user = authenticate(username=username, password=password)
            if user is None:
                user = authenticate(email=username_1, password=password_1)

            if user is not None and user.profile.type == 'C':
                if user.profile.status == 'Y':
                    login(request, user)
                    if next:
                        return HttpResponseRedirect(next)
                    else:
                        return HttpResponseRedirect(reverse('customer_profile'))
                else:
                    messages.add_message(request, messages.ERROR, "User was deactivated")
                    return HttpResponseRedirect(reverse('customer_login'))
            else:
                messages.add_message(request, messages.ERROR, "Invalid User Credentials")
                return HttpResponseRedirect(reverse('customer_login'))
        elif user_type == 'service':
            user = authenticate(username=username_1, password=password_1)
            if user is None:
                user = authenticate(email=username_1, password=password_1)

            if user is not None and user.profile.type == 'P':
                if user.profile.status == 'Y':
                    login(request, user)
                    if next:
                        return HttpResponseRedirect(next)
                    else:
                        return HttpResponseRedirect(reverse('provider_account'))
                else:
                    messages.add_message(request, messages.ERROR, "Pro was deactivated")
                    return HttpResponseRedirect(reverse('customer_login'))
            else:
                messages.add_message(request, messages.ERROR, "Invalid Pro Credentials")
                return HttpResponseRedirect(reverse('customer_login'))


# def forgot_username(request):
#     if request.method == "GET":
#         return render(request, 'customer/forgot_username.html')

def forgot_password(request):
    if request.method == "GET":
        return render(request, 'customer/forgot_password.html')
    elif request.method == "POST":
        email = request.POST['email']
        try:
            try:
                user_data = User.objects.get(email=email)
            except (User.DoesNotExist):
                user_data = None

            if user_data is None:
                try:
                    user_data = User.objects.get(username=email)
                except (User.DoesNotExist):
                    messages.add_message(request, messages.ERROR,
                                         "The mail id provided is not registered with BrokenIot")
                    return HttpResponseRedirect(reverse(forgot_password))

            token_generator = tokens.PasswordResetTokenGenerator()
            generated_token = token_generator.make_token(user_data)
            
            #encoded_uid = urlsafe_base64_encode(bytes([user_data.id]))
            encoded_uid = urlsafe_base64_encode(bytes(str(user_data.id), 'utf-16'))

            password_reset_link = 'http://brokeniot.com'+reverse('reset_password', kwargs={'user_id': encoded_uid, 'token': generated_token })
            custom_message = "You are receiving this mail, because you have placed a password reset request. Click on the link provided to continue to change the password. "


            d = Context({'message': custom_message, 'today_date_time': datetime.datetime.now().strftime("%Y-%m-%d %H:%M"), 'url' : password_reset_link})
            template_html = get_template('customer/emails/change_password.html')
            html_content = template_html.render(d.flatten())
            msg = EmailMultiAlternatives('BrokenIot - Password Reset', '', 'support@brokeniot.com', [user_data.email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()

            # send_mail("BrokenIot - Password Reset", custom_message, 'support@brokeniot.com', [user_data.email], fail_silently=False)

            messages.add_message(request, messages.SUCCESS, "A password reset mail has been forwarded to the registered mail address.")

            return HttpResponseRedirect(reverse(forgot_password))
        except (User.DoesNotExist):
            messages.add_message(request, messages.ERROR, "The mail id provided is not registered with BrokenIot")
            return HttpResponseRedirect(reverse(forgot_password))


def reset_password(request, user_id, token):
    uid = urlsafe_base64_decode(user_id)
    #uid = int.from_bytes(uid, "little")
    uid = int(uid.decode('utf-16'))
    if request.method == "GET":

        try:
            user_data = User.objects.get(pk=uid)
            token_generator = tokens.PasswordResetTokenGenerator()
            if token_generator.check_token(user_data, token):
                return render(request, 'customer/reset_password.html', context={'user_id': user_id,
                                                                                'token': token})
            else:
                return HttpResponse("The link is invalid or has expired")
        except (User.DoesNotExist):
            return HttpResponse("The link is invalid or has expired")
    elif request.method == "POST":

        try:
            user_data = User.objects.get(pk=uid)
            token_generator = tokens.PasswordResetTokenGenerator()
            if token_generator.check_token(user_data, token):

                new_password = request.POST['new_password']
                confirm_password = request.POST['confirm_new_password']
                if new_password == confirm_password:
                    user_data.password = make_password(new_password)
                    user_data.save()
                    messages.add_message(request, messages.SUCCESS, "Password updated Successfully")
                    return HttpResponseRedirect(reverse(customer_login))
                else:
                    messages.add_message(request, messages.ERROR, "Passwords does not match, please try again")
                    return HttpResponseRedirect(reverse(reset_password, kwargs={'user_id': user_id, 'token': token}))
            else:
                return HttpResponse("The link is invalid or has expired")
        except (User.DoesNotExist):
            return HttpResponse("The link is invalid or has expired")


@login_required(login_url='customer_login')
def my_account(request):
    if request.method == 'GET':
        if request.user.profile.type == 'C':
            return HttpResponseRedirect(reverse('customer_profile'))
        elif request.user.profile.type == 'P':
            return HttpResponseRedirect(reverse('provider_account'))



def logout_func(request):
    logout(request)
    return HttpResponseRedirect(reverse(customer_login))


def about_us(request):
    if request.method == 'GET':
        about_data = About.objects.all()
        return render(request, 'customer/about.html', context={'about_data': about_data})

def how_it_works_home_owner(request):
    if request.method == 'GET':
        return render(request, 'customer/how_it_works_home_owner.html')

def how_it_works_service_professional(request):
    if request.method == 'GET':
        return render(request, 'customer/how_it_works_service_professional.html')



def contact_us(request):
    if request.method == 'GET':
        contact_data = Contact.objects.all()
        return render(request, 'customer/contact.html', context={'contact_data': contact_data})


def privacy_policy(request):
    if request.method == 'GET':
        privacy_policy_data = Privacy_policy.objects.all()
        return render(request, 'customer/privacy_policy.html', context={'privacy_policy_data': privacy_policy_data})


def terms_and_conditions(request):
    if request.method == 'GET':
        terms_and_conditions_data = Terms_and_condition.objects.all()
        return render(request, 'customer/terms_and_condition.html', context={'terms_and_conditions_data': terms_and_conditions_data})


def faq(request):
    if request.method == "GET":
        faq_data = Faq.objects.all()
        return render(request, 'customer/faq.html', context={'faq_data': faq_data})

def auto_find(request):
    if request.method == "GET":
        auto_find_data = Auto_find.objects.all()
        return render(request, 'customer/auto_find.html', context={'auto_find_data': auto_find_data})


def resource_center(request):
    if request.method == "GET":
        resource_center_data = Resource_center.objects.all()
        return render(request, 'customer/resource_center.html', context={'resource_center_data': resource_center_data})


