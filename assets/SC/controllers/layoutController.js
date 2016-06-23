var SC = (function(SC) {
	SC = SC || {};
	
	if (SC.layoutController) {
		return SC;
	}
    
    var selectors = SC.constants.selectors,
    center = $(selectors.center),
    left = $(selectors.left),
    right = $(selectors.right),
    details = $(selectors.details),
    buttons = $(selectors.layoutButtons);
    
    var sizes = {
        'xs': {
                left: 'col-xs-12',
                right: 'col-xs-12',
                center: 'col-xs-12',
                details: 'col-xs-12',
                leftdef: 'hidden-xs',
                rightdef: 'col-xs-12',
                centerdef: 'hidden-xs',
                detailsdef: 'hidden-xs',
                hld: '88.33vh',
                hrd: '88.33vh',
                hcd: '45vh',
                hdd: '43.33vh',
                hl: '88.33vh',
                hr: '88.33vh',
                hc: '88.33vh',
                hd: '0vh'
            },
        'sm': {
                left: 'col-sm-4',
                right: 'col-sm-4',
                center: 'col-sm-4',
                details: 'col-sm-4',
                leftdef: 'hidden-sm',
                rightdef: 'col-sm-4',
                centerdef: 'col-sm-8',
                detailsdef: 'hidden-sm',
                hld: '88.33vh',
                hrd: '44vh',
                hcd: '88.33vh',
                hdd: '44.33vh',
                hl: '88.33vh',
                hr: '88.33vh',
                hc: '88.33vh',
                hd: '0vh'
            },
        'md': {
                left: 'col-md-4',
                right: 'col-md-4',
                center:'col-md-4',
                details: 'col-md-12',
                leftdef: 'hidden-md',
                rightdef: 'col-md-4',
                centerdef: 'col-md-8',
                detailsdef: 'hidden-md',
                hld: '63.33vh',
                hrd: '63.33vh',
                hcd: '63.33vh',
                hdd: '25vh',
                hl: '88.33vh',
                hr: '88.33vh',
                hc: '88.33vh',
                hd: '0vh'
            },
        'lg': {
                left: 'col-lg-3',
                right: 'col-lg-3',
                center: 'col-lg-6',
                details: 'col-lg-12',
                leftdef: 'hidden-lg',
                rightdef: 'col-lg-3',
                centerdef: 'col-lg-9',
                detailsdef: 'hidden-lg',
                hld: '63.33vh',
                hrd: '63.33vh',
                hcd: '63.33vh',
                hdd: '25vh',
                hl: '88.33vh',
                hr: '88.33vh',
                hc: '88.33vh',
                hd: '0vh'
            }
    };
    
    var dsize = ['lg', 'md', 'sm', 'xs'];
    
    var findBootstrapDeviceSize = function () {
        for (var i = dsize.length - 1; i >= 0; i--) {
            // Need to add &nbsp; for Chrome. Works fine in Firefox/Safari/Opera without it.
            // Chrome seem to have an issue with empty div's
            $el = $('<div id="sizeTest" class="hidden-'+dsize[i]+'">&nbsp;</div>');
            $el.appendTo($('body'));

            if ($el.is(':hidden')) {
                $el.remove();
                return dsize[i];
            }
            $el.remove();
        }
        return 'unknown';
    };
    
    var states = {
        leftVis: false,
        rightVis: true,
        detailsVis: false
    };
        
    var currentSize = findBootstrapDeviceSize();
    var hidden = 'hidden-' + currentSize;
    
    var resizeLayout = function () {
        
        if (currentSize === undefined) {
            currentSize = findBootstrapDeviceSize();
        }
        
        var fullScreen = parseInt(sizes[currentSize]['center'].split('-').pop());
        var shownCenter = !isNaN(fullScreen);
        
        if (shownCenter && !states.leftVis && currentSize !== 'xs') {
            fullScreen += parseInt(sizes[currentSize]['left'].split('-').pop());
        }
        if (shownCenter && !states.rightVis && currentSize !== 'xs' && currentSize !== 'sm') {
            fullScreen += parseInt(sizes[currentSize]['right'].split('-').pop());
        }
        if (shownCenter && !states.rightVis && !states.detailsVis && currentSize === 'sm') {
            fullScreen += parseInt(sizes[currentSize]['right'].split('-').pop());
        }
        
        var regex = new RegExp("^col-" + currentSize + "-");
        left.removeClassRegex(regex); 
        right.removeClassRegex(regex); 
        center.removeClassRegex(regex);
        details.removeClassRegex(regex);
        left.addClass(sizes[currentSize]['left']);
        right.addClass(sizes[currentSize]['right']);
        if (shownCenter) {
            center.addClass('col-' + currentSize + '-' + fullScreen);
        } else {
            center.addClass(hidden);
        }
        details.addClass(sizes[currentSize]['details']);
        
        if (currentSize === 'sm') {
            verticalSize();
        }
    };
    
    var verticalSize = function () {
        
        if (currentSize === undefined) {
            currentSize = findBootstrapDeviceSize();
        }
        
        if (states.detailsVis) {
            left.css('height', sizes[currentSize]['hld']); 
            right.css('height', sizes[currentSize]['hrd']); 
            center.css('height', sizes[currentSize]['hcd']);
            details.css('height', sizes[currentSize]['hdd']);
        } else {
            left.css('height', sizes[currentSize]['hl']); 
            right.css('height', sizes[currentSize]['hr']); 
            center.css('height', sizes[currentSize]['hc']);
            details.css('height', sizes[currentSize]['hd']);
        }
        
        if (currentSize === 'sm') {
            if (states.detailsVis && !states.rightVis) {
                details.css('height', sizes[currentSize]['hr']);
            }
        }
    };
            
    var toggleTarget = function (target) {
        
        var id = target.attr('id');
        var layout = id + 'Vis';
        
        if (id === 'left' || id === 'right') {
            if (target.hasClass(hidden)) {
                target.removeClass(hidden);
                states[layout] = true;
            } else {
                target.addClass(hidden);
                states[layout] = false;
            }    
        } else {
            if (!target.hasClass(hidden)) {
                target.addClass(hidden);
                states['detailsVis'] = false;
            } else {
                target.removeClass(hidden);
                states['detailsVis'] = true;
            }
            verticalSize();
        }

        resizeLayout();
    };
	
	var init = function() {
		// Layout handler
		buttons.click(function(event) {
			event.preventDefault();
            var role = $(this).data('role');
			toggleTarget($('#' + role));
		});
        
        var resizeId;
        $(window).resize(function() {
            clearTimeout(resizeId);
            resizeId = setTimeout(doneResizing, 500);
        });
        
        function doneResizing(){
            //whatever we want to do 
            console.log(findBootstrapDeviceSize());
            currentSize = findBootstrapDeviceSize();
            //verticalSize();
        }
        
        if (currentSize === undefined) {
            currentSize = findBootstrapDeviceSize();
        }
        
        left.addClass(sizes[currentSize]['leftdef']);
        right.addClass(sizes[currentSize]['rightdef']);
        center.addClass(sizes[currentSize]['centerdef']);
        details.addClass(sizes[currentSize]['detailsdef']);
        
        verticalSize();
	};
	
	SC.layoutController = {
		init: init,
        resize: resizeLayout
	};
	
	return SC;
})(SC);