'use strict'
var SC = (function(SC) {
	SC = SC || {};

	if (SC.constants) {
		return SC;
	}

	SC.constants = {

		selectors : {
			pageContainerId : 'content-wrapper',
            
			layoutHeader : 'header',
			currentLanguage : '#current-language',

			// buttons
			signOutButton : '.btn-signout',
			languageButton : '.change-lang',
			helpButton : '.btn-help',

			pagePropertiesHolder : '#jsProperties',
            
            //layouts
            center: '#center',
            left: '#left',
            right: '#right',
            details: '#details',
            
            //layouts buttons
            layoutButtons: '[data-event="columns"]'
		},

		languages : {
			bg : 'bg',
			en : 'en'
		},

		events : {
			pageLoaded : "pageLoaded",
			layoutLoaded: "layoutLoaded",
			pageChangeRequest: 'pageChangeRequest',
			adjustTableColumns: 'adjustTableColumns',
			newInlineCampaign: 'newInlineCampaign',
			inlineCampaignDisabled: 'inlineCampaignDisabled',
			inlineCampaignRead: 'inlineCampaignRead',
			changeBreadcrumbStep: 'changeBreadcrumbStep'
		},

		keyCodes : {
			enter : 13,
			escape : 27
		},

		contentTypes : {
			urlEncoded : 'application/x-www-form-urlencoded'
		},

		httpStatus : {
			unauthorized : 401,
			interrupted: 0
		},

		timeouts : {
			redirect : 1000
		}

	};

	return SC;
})(SC);