var SC = (function(SC) {
	SC = SC || {};

	if (SC.loader) {
		return SC;
	}

	var initLayout = function() {
		SC.layoutController.init();
	};

	SC.loader = {
		initLayout: initLayout,
	};

	return SC;
})(SC);