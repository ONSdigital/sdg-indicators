{% assign analytics_ga_prod = site.analytics.ga_prod and site.analytics.ga_prod != '' %}
{% assign analytics_ua = site.analytics.ua and site.analytics.ua != '' %}
{% assign analytics_gtag = site.analytics.gtag and site.analytics.gtag != '' %}
var klaroConfig = {
    noAutoLoad: true, // no autoload because we have a custom notice and form
    storageMethod: 'cookie',
    cookieName: 'cookie_settings',
    cookieExpiresAfterDays: 365,
    default: false,
    services: [
        {
            name: 'contrast',
            default: true,
            cookies: ['contrast'],
            required: true,
        },
        {% if analytics_ga_prod or analytics_ua or analytics_gtag  %}
        {
            name: 'google-analytics',
            {% if site.analytics.extra_cookies %}
            cookies: [].concat(['_gat', '_gid', '_ga'], {{ site.analytics.extra_cookies | jsonify }}),
            {% else %}
            cookies: ['_gat', '_gid', '_ga'],
            {% endif %}
        },
        {% endif %}
        {% if site.hotjar %}
        {
            name: 'hotjar',
            cookies: [
                '_hjClosedSurveyInvites',
                '_hjDonePolls',
                '_hjMinimizedPolls',
                '_hjDoneTestersWidgets',
                '_hjIncludedInSample',
                '_hjShownFeedbackMessage',
                '_hjid',
                '_hjRecordingLastActivity',
                '_hjTLDTest',
                '_hjUserAttributesHash',
                '_hjCachedUserAttributes',
                '_hjLocalStorageTest',
                '_hjAbsoluteSessionInProgress',
                '_hjFirstSeen',
                '_hjIncludedInPageviewSample',
            ],
        },
        {% endif %}
    ],
};
