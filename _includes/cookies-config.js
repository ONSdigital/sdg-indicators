var klaroConfig = {
    version: 1,
    elementID: 'klaro',
    styling: {
        theme: ['light', 'top', 'wide'],
    },
    noAutoLoad: true, // no autoload because we have a custom notice and form
    htmlTexts: false,
    embedded: false,
    groupByPurpose: true,
    storageMethod: 'cookie',
    cookieName: 'klaro',
    cookieExpiresAfterDays: 365,
    default: false,
    mustConsent: false,
    acceptAll: true,
    hideDeclineAll: false,
    hideLearnMore: false,
    noticeAsModal: false,
    services: [
        {
            name: 'contrast',
            default: true,
            title: 'High-contrast mode',
            purposes: ['functional'],
            cookies: ['contrast'],
            required: true,
            optOut: false,
            onlyOnce: true,
        },
        {% if site.analytics.ga_prod and site.analytics.ga_prod != '' %}
        {
            name: 'google-analytics',
            title: 'Google Analytics',
            default: false,
            purposes: ['analytics'],
            cookies: ['_gat', '_gid', 'ga'],
            callback: function(consent, service) {
                if (consent) {
                    console.log('Debug: Sending analytics to Google...');
                    initialiseGoogleAnalytics();
                }
            },
            required: false,
            optOut: false,
            onlyOnce: false,
        },
        {% endif %}
    ],
};
