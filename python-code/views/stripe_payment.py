import stripe
from collections import namedtuple
import json
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY # new

def create_customer_profile(f_name, l_name, email):
    try:
        stripe_customer = stripe.Customer.create(
            name=f_name+' '+l_name,
            email=email,
            description="Customer for " + email,
        )
        return stripe_customer
    except:
        return False

def get_customer_profile(customerProfileId):
    try:
        get_customer = stripe.Customer.retrieve(customerProfileId)
        return get_customer
    except:
        return False

def update_customer_profile(customerProfileId, cc_name, email):
    try:
        stripe_customer = stripe.Customer.modify(
            customerProfileId,
            name=cc_name,
            email=email,
        )
        return stripe_customer
    except:
        return False

def create_customer_payment_profile(customerProfileId, cardNumber, cc_month, cc_year, cc_csv, cc_name, address, city, zipcode,card_type):
    try:
        stripe_card = stripe.Customer.create_source(
            customerProfileId,
            source=card_type,
            # source={
            # 'object':'tok_amex',
            # 'number':cardNumber,
            # 'exp_month':cc_month,
            # 'exp_year':cc_year,
            # 'cvc':cc_csv,
            # 'name': cc_name,
            # 'address_line1':address,
            # 'address_city':city,
            # 'address_zip':zipcode
            # }
        )
        return stripe_card
    except:
        return False

def update_customer_payment_profile(customerProfileId, customerPaymentProfileId, cc_month, cc_year, bill_address, bill_city, bill_zip, cc_name):
    try:
        stripe_card = stripe.Customer.modify_source(
            customerProfileId,
            customerPaymentProfileId,
            name=cc_name,
            exp_month=cc_month,
            exp_year=cc_year,
            address_line1=bill_address,
            address_city=bill_city,
            address_zip=bill_zip
        )
        return stripe_card
    except:
        return False

def delete_customer_payment_profile(customerProfileId, customerPaymentProfileId):
    try:
        stripe_card = stripe.Customer.delete_source(
            customerProfileId,
            customerPaymentProfileId,
        )
        return stripe_card
    except:
        return False


def charge_customer_profile(customer_id,amount,currency):
    try:
        charge = stripe.Charge.create(
                amount=(int(amount)*100),
                currency='USD',
                description=customer_id+" payment.",
                customer=customer_id,
            )
        return charge
    except:
        return False

# ------------------------------------- Subscription -------------------------------------------
def update_customer_set_default_payment(customer_id,payment_method):
    try:
        customer_update = stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method},
        )
        return customer_update
    except:
        return False

def create_subscription_plan(amount,currency,interval,name):
    try:
        plan = stripe.Plan.create(
            amount=int(amount)*100,
            currency=currency,
            interval=interval,
            product={"name": name},
        )
        return plan
    except:
        return False

def get_subscription_plan(plan):
    try:
        plan = stripe.Plan.retrieve(plan)
        return plan
    except:
        return False
def delete_subscription_plan(plan_id):
    try:
        plan = stripe.Plan.delete(plan_id)
        return plan
    except:
        return False

def create_subscription_from_customer_profile(customer_id,plan_id, start_date):
    try:
        plan = stripe.Plan.retrieve(plan_id)
        if plan is not None and plan is not False:
            payment_method = payment_method_list(customer_id)
            if payment_method != False:
                payment_method_id = payment_method['data'][0]['id']
                update_customer = update_customer_set_default_payment(customer_id, payment_method_id)
                if update_customer != False:
                    create_subscription = stripe.Subscription.create(
                        customer=customer_id,
                        default_payment_method=payment_method_id,
                        items=[{"plan": plan_id}])
                    return create_subscription
                else:
                    return False
            else:
                return False
        else:
            return False
    except:
        return False

def cancel_subscription(subscription_id):
    try:
        return stripe.Subscription.delete(subscription_id)
    except:
        return False

def disabled_subscription(subscription_id):
    try:
        update_subscription = stripe.Subscription.modify(
            subscription_id,
            pause_collection={
                'behavior': 'mark_uncollectible',
            }
        )
        return update_subscription
    except:
        return False

def enabled_subscription(subscription_id):
    try:
        update_subscription = stripe.Subscription.modify(
            subscription_id,
            pause_collection=''
        )
        return update_subscription
    except:
        return False

def setup_intent(customerProfileId):
    try:
        stripe_intent = stripe.SetupIntent.create(customer=customerProfileId, payment_method_types=["card"])
        return stripe_intent
    except:
        return False

def payment_method_list(customerProfileId):
    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=customerProfileId,
            type="card",
        )
        return payment_methods
    except:
        return False

def payment_intent_create(customer_id,amount,currency):
    try:
        if amount < 1:
            return True

        payment_method = payment_method_list(customer_id)
        payment_method_id = payment_method['data'][0]['id']

        if payment_method != False:
            update_customer = update_customer_set_default_payment(customer_id, payment_method_id)
            if update_customer != False:
                payment_intent_create = stripe.PaymentIntent.create(
                    amount=int(amount)*100,
                    currency=currency,
                    customer=customer_id,
                    payment_method=payment_method_id,
                    off_session=True,
                    confirm=True,
                )
                return payment_intent_create
            else:
                return False
        else:
            return False
    except:
        return False

def detach_payment_method(payment_method_id):
    try:
        payment_method = stripe.PaymentMethod.detach(
            payment_method_id,
        )
        return payment_method
    except:
        return False


# def create_customer_payment_profile(card_number, cc_month, cc_year, cc_csv):
#     try:
#         stripe_customer = stripe.PaymentMethod.create(
#             type="card",
#             card={
#                 "number": card_number,
#                 "exp_month": cc_month,
#                 "exp_year": cc_year,
#                 "cvc": cc_csv,
#             },
#         )
#         return stripe_customer
#     except:
#         return False
#
# def customer_payment_profile_attach(customer_id,card_generate_id):
#     try:
#         stripe_customer = stripe.PaymentMethod.attach(
#             card_generate_id,
#             customer=customer_id,
#         )
#         return stripe_customer
#     except:
#         return False

