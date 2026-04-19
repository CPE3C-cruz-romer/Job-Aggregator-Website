from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

from .models import EmployerJob


class EmployerRegistrationForm(forms.Form):
    username = forms.CharField(max_length=150)
    email = forms.EmailField()
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            "autocomplete": "new-password",
            "placeholder": "Create password (min 8 chars, letters + numbers)",
        }),
        help_text="Use at least 8 characters with letters and numbers.",
    )
    password2 = forms.CharField(
        label="Re-type Password",
        widget=forms.PasswordInput(attrs={
            "autocomplete": "new-password",
            "placeholder": "Re-type password",
        }),
    )
    company_name = forms.CharField(max_length=200)

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("Username is already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Email is already registered.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")
        user = User(
            username=cleaned_data.get("username", ""),
            email=cleaned_data.get("email", ""),
        )
        if password1:
            validate_password(password1, user=user)
        if password1 and password2 and password1 != password2:
            self.add_error("password2", "Passwords do not match.")
        return cleaned_data


class EmployerJobForm(forms.ModelForm):
    class Meta:
        model = EmployerJob
        fields = [
            "title",
            "description",
            "location",
            "contact_number",
            "contact_email",
            "work_details",
            "requirements",
            "is_priority",
        ]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
            "work_details": forms.Textarea(attrs={"rows": 3}),
            "requirements": forms.Textarea(attrs={"rows": 3}),
        }
