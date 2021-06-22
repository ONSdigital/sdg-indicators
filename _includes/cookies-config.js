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
        {% if site.analytics.ga_prod and site.analytics.ga_prod != '' %}
        {
            name: 'google-analytics',
            cookies: ['_gat', '_gid', 'ga'],
            callback: function(consent, service) {
                if (consent) {
                    console.log('Debug: Sending analytics to Google...');
                    initialiseGoogleAnalytics();
                }
            },
        },
        {% endif %}
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
            ],
            callback: function(consent, service) {
                if (consent) {
                    console.log('Debug: Sending analytics to Hotjar...');
                    initialiseHotjar();
                }
            },
        }
    ],
};
