
from django.conf.urls import url
from .views import home, customer, provider
from service_categories import views as service_category_views
    # import views as customer_views

urlpatterns = [
    url(r'^test_route', customer.test_route, name='test_route'),
    url(r'^charge', customer.charge, name='charge'),
    url(r'^send_provider_mail', customer.send_provider_mail, name='send_provider_mail'),
    url(r'^$', home.index, name='index'),
    url(r'^login$', home.customer_login, name='customer_login'),
    # url(r'^forgot_username$', home.forgot_username, name='forgot_username'),
    url(r'^forgot_password$', home.forgot_password, name='forgot_password'),
    url(r'^reset_password/(?P<user_id>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})$', home.reset_password, name='reset_password'),
    url(r'^logout$', home.logout_func, name='logout'),
    url(r'^signup_as_customer$', customer.customer_signup, name='customer_signup'),
    url(r'^signup_as_provider$', provider.provider_signup, name='provider_signup'),
    url(r'^about_us', home.about_us, name='about_us'),
    url(r'^how_it_works/service_professional', home.how_it_works_service_professional, name='how_it_works_service_professional'),
    url(r'^how_it_works/home_owner', home.how_it_works_home_owner, name='how_it_works_home_owner'),
    url(r'^contact_us', home.contact_us, name='contact_us'),
    url(r'^privacy_policy', home.privacy_policy, name='privacy_policy'),
    url(r'^terms_and_conditions', home.terms_and_conditions, name='terms_and_conditions'),
    url(r'^faq', home.faq, name='faq'),
    #url(r'^auto_find', home.auto_find, name='auto_find'),
    url(r'^auto_find', service_category_views.all_categories, name='auto_find'),
    
    url(r'^resource_center', home.resource_center, name='resource_center'),

    url(r'^my_account$', home.my_account, name='my_account'),

    url(r'^provider_details$', provider.provider_details, name='provider_details'),
    url(r'^provider_company_info$', provider.provider_company_info, name='provider_company_info'),
    url(r'^provider_profile$', provider.provider_profile, name='provider_profile'),
    url(r'^provider_payment$', provider.provider_payment, name='provider_payment'),
    url(r'^trial_end$', provider.trial_end, name='trial_end'),
    url(r'^provider_payment_edit$', provider.provider_payment_edit, name='provider_payment_edit'),
    url(r'^edit_subscription_type$', provider.edit_subscription_type, name='edit_subscription_type'),
    # url(r'^provider_subscription$', provider.provider_subscription, name='provider_subscription'),
    url(r'^provider_account$', provider.provider_account, name='provider_account'),
    url(r'^manage_services$', provider.manage_services, name='manage_services'),
    url(r'^manage_availability$', provider.manage_availability, name='manage_availability'),
    url(r'^add_services/(?P<pk>[0-9]+)$', provider.add_services, name='add_services'),
    url(r'^edit_service_price/(?P<cat_id>[0-9]+)$', provider.edit_service_price, name='edit_service_price'),
    url(r'^delete_provider_image/(?P<pk>[0-9]+)$', provider.delete_provider_image, name='delete_provider_image'),
    url(r'^delete_provider_certificate/(?P<pk>[0-9]+)$', provider.delete_provider_certificate, name='delete_provider_certificate'),


    url(r'^pro_finder$',customer.pro_finder, name='pro_finder'),
    url(r'^find_pro_by_location/(?P<category_name>[a-z ,A-Z,0-9,\w&-]+)/(?P<cat_id>[0-9]+)$', customer.find_pro_by_location, name='find_pro_by_location'),
    url(r'^get_location_pros/(?P<category_id>[0-9]+)/(?P<lat>-?\d+\.\d+)/(?P<lng>-?\d+\.\d+)/(?P<category_name>[a-z ,A-Z,0-9\w&-]+)', customer.get_location_pros, name='get_location_pros'),
    url(r'^provider_info/(?P<pk>[0-9]+)/(?P<cat_id>[0-9]+)/(?P<category_name>[\W&-|\w&-]+)/(?P<lat>-?\d+\.\d+)/(?P<lng>-?\d+\.\d+)$', customer.provider_info, name='provider_info'),
    url(r'^provider_profile_details/(?P<pk>[0-9]+)$', customer.provider_profile_details, name='provider_profile_details'),
    url(r'^prev_provider/(?P<provider_id>[0-9]+)/(?P<cat_id>[0-9]+)/(?P<lat>-?\d+\.\d+)/(?P<lng>-?\d+\.\d+)$', customer.prev_provider, name='prev_provider'),
    url(r'^next_provider/(?P<provider_id>[0-9]+)/(?P<cat_id>[0-9]+)/(?P<lat>-?\d+\.\d+)/(?P<lng>-?\d+\.\d+)$', customer.next_provider, name='next_provider'),


    url(r'^customer_profile/$', customer.customer_profile, name='customer_profile'),
    url(r'^customer_profile_edit/(?P<purpose>[a-w,_]+)$', customer.customer_profile_edit, name='customer_profile_edit'),

    url(r'^view_contact/(?P<pk>[0-9]+)/(?P<cat_id>[0-9]+)/(?P<category_name>[\W&-|\w&-]+)/(?P<lat>-?\d+\.\d+)/(?P<lng>-?\d+\.\d+)/(?P<job_id>[0-9]+)$', provider.view_contact, name="view_contact")
    # url(r'^view_contact_simple/(?P<pk>[0-9]+)/(?P<cat_id>[0-9]+)/(?P<category_name>[\W&-|\w&-]+)/(?P<zipcode>[0-9]+)/(?P<job_id>[0-9]+)$', provider.view_contact, name="view_contact")
]