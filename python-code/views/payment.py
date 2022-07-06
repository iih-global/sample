import os, sys
import imp

from authorizenet import apicontractsv1
from authorizenet.apicontrollers import *
# constants = imp.load_source('modulename', 'constants.py')
import random
from decimal import *
from datetime import *
from django.conf import settings
import requests



#-------------------------------------------------------- Customer Profile -----------------------------------------------------------


def create_customer_profile(f_name, l_name, email, cc_name):

    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY


    createCustomerProfile = apicontractsv1.createCustomerProfileRequest()
    createCustomerProfile.merchantAuthentication = merchantAuth
    createCustomerProfile.profile = apicontractsv1.customerProfileType(f_name[0] + l_name[0:3] + str(random.randint(0, 10000)), cc_name, email)

    controller = createCustomerProfileController(createCustomerProfile)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()

    response = controller.getresponse()

    return response
    # headers = {'X-API-TOKEN': 'your_token_here'}
    # payload = {'title': 'value1', 'name': 'value2__11', 'response': response.messages.message[0]['text'].text}
    # r = requests.post(" ", data=payload, headers=headers)


def get_customer_profile(customerProfileId):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    getCustomerProfile = apicontractsv1.getCustomerProfileRequest()
    getCustomerProfile.merchantAuthentication = merchantAuth
    getCustomerProfile.customerProfileId = customerProfileId
    controller = getCustomerProfileController(getCustomerProfile)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()

    response = controller.getresponse()
    # print(response)
    # if (response.messages.resultCode == "Ok"):
    #     print("Successfully retrieved a customer with profile id %s and customer id %s" %
    #           (getCustomerProfile.customerProfileId, response.profile.merchantCustomerId))
    #     if hasattr(response, 'profile') == True:
    #         if hasattr(response.profile, 'paymentProfiles') == True:
    #             for paymentProfile in response.profile.paymentProfiles:
    #                 print("paymentProfile in get_customerprofile is:" % paymentProfile)
    #                 print("Payment Profile ID %s" % str(paymentProfile.customerPaymentProfileId))
    #         if hasattr(response.profile, 'shipToList') == True:
    #             for ship in response.profile.shipToList:
    #                 print("Shipping Details:")
    #                 print("First Name %s" % ship.firstName)
    #                 print("Last Name %s" % ship.lastName)
    #                 print("Address %s" % ship.address)
    #                 print("Customer Address ID %s" % ship.customerAddressId)
    #                 if hasattr(response, 'subscriptionIds') == True:
    #                     if hasattr(response.subscriptionIds, 'subscriptionId') == True:
    #                         print("list of subscriptionid:")
    #                         for subscriptionid in (response.subscriptionIds.subscriptionId):
    #                             print(subscriptionid)
    #                 else:
    #                     print("response code: %s" % response.messages.resultCode)
    #                 print(
    #                     "Failed to get customer profile information with id %s" % getCustomerProfile.customerProfileId)

    return response


def update_customer_profile(customerProfileId, cc_name, email, merchantCustomerId):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    updateCustomerProfile = apicontractsv1.updateCustomerProfileRequest()
    updateCustomerProfile.merchantAuthentication = merchantAuth
    updateCustomerProfile.profile = apicontractsv1.customerProfileExType()

    updateCustomerProfile.profile.customerProfileId = customerProfileId
    updateCustomerProfile.profile.merchantCustomerId = merchantCustomerId
    updateCustomerProfile.profile.description = cc_name
    updateCustomerProfile.profile.email = email

    controller = updateCustomerProfileController(updateCustomerProfile)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()

    response = controller.getresponse()

    return response






#---------------------------------------------------------Customer Payment Profile----------------------------------------------------

def create_customer_payment_profile(customerProfileId, cardNumber, cc_month, cc_year, f_name, l_name, address, city, zipcode):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    creditCard = apicontractsv1.creditCardType()
    creditCard.cardNumber = cardNumber
    creditCard.expirationDate = cc_year + "-" + cc_month

    payment = apicontractsv1.paymentType()
    payment.creditCard = creditCard

    billTo = apicontractsv1.customerAddressType()
    billTo.firstName = f_name
    billTo.lastName = "l_" + l_name
    billTo.address = address
    billTo.city = city
    # state
    billTo.zip = zipcode

    profile = apicontractsv1.customerPaymentProfileType()
    profile.payment = payment
    profile.billTo = billTo

    createCustomerPaymentProfile = apicontractsv1.createCustomerPaymentProfileRequest()
    createCustomerPaymentProfile.merchantAuthentication = merchantAuth
    createCustomerPaymentProfile.paymentProfile = profile
    # print("customerProfileId in create_customer_payment_profile. customerProfileId = %s" %customerProfileId)
    createCustomerPaymentProfile.customerProfileId = str(customerProfileId)

    controller = createCustomerPaymentProfileController(createCustomerPaymentProfile)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()

    response = controller.getresponse()

    return response


def update_customer_payment_profile(customerProfileId, customerPaymentProfileId, cc_number, cc_month, cc_year, bill_address, bill_city, bill_zip, first_name, last_name):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    creditCard = apicontractsv1.creditCardType()
    creditCard.cardNumber = cc_number
    creditCard.expirationDate = cc_year + "-" + cc_month

    payment = apicontractsv1.paymentType()
    payment.creditCard = creditCard

    paymentProfile = apicontractsv1.customerPaymentProfileExType()
    paymentProfile.billTo = apicontractsv1.customerAddressType()
    paymentProfile.billTo.firstName = first_name
    paymentProfile.billTo.lastName = last_name
    paymentProfile.billTo.address = bill_address
    paymentProfile.billTo.city = bill_city
    # paymentProfile.billTo.state = "WA"
    paymentProfile.billTo.zip = bill_zip
    # paymentProfile.billTo.country = "USA"
    # paymentProfile.billTo.phoneNumber = "000-000-000"
    paymentProfile.payment = payment
    paymentProfile.customerPaymentProfileId = customerPaymentProfileId

    updateCustomerPaymentProfile = apicontractsv1.updateCustomerPaymentProfileRequest()
    updateCustomerPaymentProfile.merchantAuthentication = merchantAuth
    updateCustomerPaymentProfile.paymentProfile = paymentProfile
    updateCustomerPaymentProfile.customerProfileId = customerProfileId
    updateCustomerPaymentProfile.validationMode = settings.AUTHORIZE_NET_MODE

    controller = updateCustomerPaymentProfileController(updateCustomerPaymentProfile)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()

    response = controller.getresponse()

    return response


def validate_customer_payment_profile(customerProfileId, customerPaymentProfileId):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    validateCustomerPaymentProfile = apicontractsv1.validateCustomerPaymentProfileRequest()
    validateCustomerPaymentProfile.merchantAuthentication = merchantAuth
    validateCustomerPaymentProfile.customerProfileId = customerProfileId
    validateCustomerPaymentProfile.customerPaymentProfileId = customerPaymentProfileId
    validateCustomerPaymentProfile.validationMode = settings.AUTHORIZE_NET_MODE

    validateCustomerPaymentProfileCntrlr = validateCustomerPaymentProfileController(validateCustomerPaymentProfile)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        validateCustomerPaymentProfileCntrlr.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    validateCustomerPaymentProfileCntrlr.execute()

    response = validateCustomerPaymentProfileCntrlr.getresponse()

    return response


#-----------------------------------------------------charge a customer profile-------------------------------------------------------
def charge_customer_profile(customerProfileId, paymentProfileId, amount):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    # create a customer payment profile
    profileToCharge = apicontractsv1.customerProfilePaymentType()
    profileToCharge.customerProfileId = customerProfileId
    profileToCharge.paymentProfile = apicontractsv1.paymentProfile()
    profileToCharge.paymentProfile.paymentProfileId = paymentProfileId

    transactionrequest = apicontractsv1.transactionRequestType()
    transactionrequest.transactionType = "authCaptureTransaction"
    transactionrequest.amount = amount
    transactionrequest.profile = profileToCharge


    createtransactionrequest = apicontractsv1.createTransactionRequest()
    createtransactionrequest.merchantAuthentication = merchantAuth
    createtransactionrequest.refId = "MerchantID-0001"

    createtransactionrequest.transactionRequest = transactionrequest
    createtransactioncontroller = createTransactionController(createtransactionrequest)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        createtransactioncontroller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    createtransactioncontroller.execute()

    response = createtransactioncontroller.getresponse()

    return response

#-----------------------------------------------create customer profile subscription-------------------------------------------------
def create_subscription_from_customer_profile(amount, profileId, paymentProfileId, start_date):

    # Setting the merchant details
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY
    # Setting payment schedule
    paymentschedule = apicontractsv1.paymentScheduleType()
    paymentschedule.interval = apicontractsv1.paymentScheduleTypeInterval() #apicontractsv1.CTD_ANON() #modified by krgupta
    paymentschedule.interval.length = 1
    paymentschedule.interval.unit = apicontractsv1.ARBSubscriptionUnitEnum.months
    # paymentschedule.startDate = datetime(2020, 8, 30)
    paymentschedule.startDate = start_date
    paymentschedule.totalOccurrences = 12
    # paymentschedule.trialOccurrences = 1

    #setting the customer profile details
    profile = apicontractsv1.customerProfileIdType()
    profile.customerProfileId = profileId
    profile.customerPaymentProfileId = paymentProfileId
    # profile.customerAddressId = customerAddressId

    # Setting subscription details
    subscription = apicontractsv1.ARBSubscriptionType()
    subscription.name = "Service Subscription"
    subscription.paymentSchedule = paymentschedule
    subscription.amount = amount
    # subscription.trialAmount = Decimal('0.00')
    subscription.profile = profile

    # Creating the request
    request = apicontractsv1.ARBCreateSubscriptionRequest()
    request.merchantAuthentication = merchantAuth
    request.subscription = subscription

    # Creating and executing the controller
    controller = ARBCreateSubscriptionController(request)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()
    # Getting the response
    response = controller.getresponse()

    return response


#-----------------------------------------------cancel customer profile subscription-------------------------------------------------
def cancel_subscription(subscriptionId):
    merchantAuth = apicontractsv1.merchantAuthenticationType()
    merchantAuth.name = settings.AUTHORIZE_NET_NAME
    merchantAuth.transactionKey = settings.AUTHORIZE_NET_TRANSACTION_KEY

    request = apicontractsv1.ARBCancelSubscriptionRequest()
    request.merchantAuthentication = merchantAuth
    request.refId = "Sample"
    request.subscriptionId = subscriptionId

    controller = ARBCancelSubscriptionController(request)
    if settings.AUTHORIZE_NET_MODE == 'liveMode':
        controller.setenvironment("https://api2.authorize.net/xml/v1/request.api")
    controller.execute()

    response = controller.getresponse()

#    if (response.messages.resultCode=="Ok"):
#        print("SUCCESS")
#        print("Message Code : %s" % response.messages.message[0]['code'].text)
#        print("Message text : %s" % response.messages.message[0]['text'].text)
#    else:
#        print("ERROR")
#        print("Message Code : %s" % response.messages.message[0]['code'].text)
#        print("Message text : %s" % response.messages.message[0]['text'].text)

    return response
