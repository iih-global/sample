from django import forms
from django.contrib.auth.models import User

class UserForm(forms.Form):
    username = forms.CharField()
    first_name = forms.CharField()
    last_name = forms.CharField()
    email = forms.EmailField()
    password = forms.CharField()
    confirm_password = forms.CharField()

    def clean(self):
        cleaned_data = super(UserForm, self).clean()
        username = cleaned_data.get('username')
        email = cleaned_data.get('email')
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        username_exists = User.objects.filter(username__iexact=username).count()
        email_exists = User.objects.filter(email__iexact=username).count()
        if username_exists:
            raise forms.ValidationError('The username is already in use!')
        if email_exists:
            raise forms.ValidationError('The email is already in use!')
        if password == confirm_password:
            raise forms.ValidationError('The passwords do not match!')