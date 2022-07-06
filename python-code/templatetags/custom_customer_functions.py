from django import template
from Profile.models import Provider_profile_image
from administrator.models import Social
from conversation.models import Conversation
from service_categories.models import Categories

register = template.Library()

@register.simple_tag()
def get_parent_name(parent_id, services_offered):
    for service in services_offered:
        if service.parent_id_id == parent_id:
            return service.parent_id


@register.simple_tag()
def get_service_count(parent_id, services_offered):
    count = 0
    for service in services_offered:
        if service.parent_id_id == parent_id:
            count += 1
    return count


@register.simple_tag()
def get_total_service_count(parent_id, sub_category):
    for sub in sub_category:
        if sub.id == parent_id:
            return sub.child_count


@register.simple_tag()
def check_if_serviced(cat_id, provider_categories):
    for pro_cat in provider_categories:
        if pro_cat['category_id'] == cat_id:
            return 'checked'
    return 'notchecked'


@register.simple_tag()
def get_provider_min_price(provider_categories, cat_id):
    for prov_categories in provider_categories:
        if prov_categories['category_id'] == cat_id:
            return prov_categories['min_price']


@register.simple_tag()
def get_provider_max_price(provider_categories, cat_id):
    for prov_categories in provider_categories:
        if prov_categories['category_id'] == cat_id:
            return prov_categories['max_price']
    # return provider_categories[1]['max_price']

@register.simple_tag()
def get_profile_image(provider_id):
    provider_profile_image = Provider_profile_image.objects.filter(provider_id=provider_id).order_by('id')
    # print('provider_profile_image')
    # print(provider_profile_image.image)
    if provider_profile_image:
        # print(provider_profile_image[0].image)
        return provider_profile_image[0].image.url
    else:
        return None
    # return None

@register.simple_tag()
def check_if_conversation(job_id, provider_id):
    conversation_count = Conversation.objects.filter(job_id=job_id, provider_id=provider_id).count()
    # print(conversation_count)
    return conversation_count

@register.simple_tag()
def get_parent_categories():
    parent_categories = Categories.objects.filter(parent_id__isnull=True)
    return parent_categories

class AssignNode(template.Node):
    def __init__(self, name, value):
        self.name = name
        self.value = value

    def render(self, context):
        context[self.name] = self.value.resolve(context, True)
        return ''


def do_assign(parser, token):
    """
    Assign an expression to a variable in the current context.

    Syntax::
        {% assign [name] [value] %}
    Example::
        {% assign list entry.get_related %}

    """
    bits = token.contents.split()
    if len(bits) != 3:
        raise template.TemplateSyntaxError("'%s' tag takes two arguments" % bits[0])
    value = parser.compile_filter(bits[2])
    return AssignNode(bits[1], value)


register.tag('assign', do_assign)

@register.simple_tag()
def get_social_links():
    social_links = Social.objects.all()
    return social_links