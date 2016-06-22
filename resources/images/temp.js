/* Copyright (c) 2006-2013 by OpenLayers Contributors (see authors.txt for
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

 /**
 * @requires OpenLayers/Util.js
 * @requires OpenLayers/Popup.js
 * @requires OpenLayers/Popup/FramedCloud.js
 */

/*
This source contains adjustments on OL popups for proper calculation of the
autosize. For more details see "../README.md"

Patches included:
    pending to review by OL team:
        https://github.com/openlayers/openlayers/pull/507 Get right size when
            force height or width.
        https://github.com/openlayers/openlayers/pull/485 Get right scrollbar
            width.
        https://github.com/openlayers/openlayers/pull/533 Using IE no parent
            is a object!
        https://github.com/openlayers/openlayers/pull/544 Extra padding.
        https://github.com/openlayers/openlayers/pull/565 Fractional size
            using IE9.
        https://github.com/openlayers/openlayers/pull/566 Take into account
            scroll bar to calculate min/max size.
        https://github.com/openlayers/openlayers/pull/613 FramedCloud Popup:
            adjust the insertion point.
    fixed in 2.12:
        https://github.com/openlayers/openlayers/pull/505
    other patches included but are pending publication as "Pull Rquest" on OL:
        * Chrome+ABP does not consider the size of images
            (https://github.com/openlayers/openlayers/issues/595).
        * Consider the border on `contentDisplayClass`.
        * Margin should be considered when padding on `contentDisplayClass`
            is zero.

Patched functions:
    OpenLayers.Util.getRenderedDimensions
    OpenLayers.Util.getScrollbarWidth
    OpenLayers.Util.getW3cBoxModel   <-- new!
    OpenLayers.Popup.prototype.getContentDivPadding
    OpenLayers.Popup.prototype.setSize
    OpenLayers.Popup.prototype.updateSize
    OpenLayers.Popup.FramedCloud.prototype.positionBlocks (object)
*/

// ** OpenLayers.Util **
/**
 * Method: getRenderedDimensions
 * Renders the contentHTML offscreen to determine actual dimensions for
 *     popup sizing. As we need layout to determine dimensions the content
 *     is rendered -9999px to the left and absolute to ensure the
 *     scrollbars do not flicker
 *
 * Parameters:
 * contentHTML
 * size - {<OpenLayers.Size>} If either the 'w' or 'h' properties is
 *     specified, we fix that dimension of the div to be measured. This is
 *     useful in the case where we have a limit in one dimension and must
 *     therefore meaure the flow in the other dimension.
 * options - {Object}
 *
 * Allowed Options:
 *     displayClass - {String} Optional parameter.  A CSS class name(s) string
 *         to provide the CSS context of the rendered content.
 *     containerElement - {DOMElement} Optional parameter. Insert the HTML to
 *         this node instead of the body root when calculating dimensions.
 *
 * Returns:
 * {<OpenLayers.Size>}
 */
OpenLayers.Util.getRenderedDimensions = function(contentHTML, size, options) {

    var w, h;

    // create temp container div with restricted size
    var container = document.createElement("div");
    container.style.visibility = "hidden";

    var containerElement = (options && options.containerElement)
        ? options.containerElement : document.body;

    // Opera and IE7 can't handle a node with position:aboslute if it inherits
    // position:absolute from a parent.
    var parentHasPositionAbsolute = false;
    var superContainer = null;
    var parent = containerElement;
    while (parent && parent.tagName.toLowerCase()!="body") {
        var parentPosition = OpenLayers.Element.getStyle(parent, "position");
        if(parentPosition == "absolute") {
            parentHasPositionAbsolute = true;
            break;
        } else if (parentPosition && parentPosition != "static") {
            break;
        }
        parent = parent.parentNode;
    }
    if(parentHasPositionAbsolute && (containerElement.clientHeight === 0 ||
                                     containerElement.clientWidth === 0) ){
        superContainer = document.createElement("div");
        superContainer.style.visibility = "hidden";
        superContainer.style.position = "absolute";
        superContainer.style.overflow = "visible";
        superContainer.style.width = document.body.clientWidth + "px";
        superContainer.style.height = document.body.clientHeight + "px";
        superContainer.appendChild(container);
    }
    container.style.position = "absolute";

    //fix a dimension, if specified.
    if (size) {
        if (size.w) {
            w = size.w;
            container.style.width = w + "px";
        } else if (size.h) {
            h = size.h;
            container.style.height = h + "px";
        }
        container.style.overflow = "hidden";
    }

    //add css classes, if specified
    if (options && options.displayClass) {
        container.className = options.displayClass;
    }

    // create temp content div and assign content
    var content = document.createElement("div");
    var noMargin = '<div style="margin:0px; clear:both; padding:0;' +
       ' height:1px; width:1px; line-height:1px; background-color:#000"></div>';
    content.innerHTML = noMargin + contentHTML + noMargin;

    // we need overflow visible when calculating the size
    content.style.overflow = "visible";
    if (content.childNodes) {
        for (var i=content.childNodes.length; i--;) {
            if (!content.childNodes[i].style) continue;
            content.childNodes[i].style.overflow = "visible";
        }
    }

    // add content to restricted container
    container.appendChild(content);

    // append container to body for rendering
    if (superContainer) {
        containerElement.appendChild(superContainer);
    } else {
        containerElement.appendChild(container);
    }

    // fix img dimensions: chrome bug
    var images = content.getElementsByTagName("img");
    for (var i = images.length; i--;) {
        var img = images[i],
            aux;
        if (img.naturalWidth && img.naturalHeight &&
                                                 (!img.width || !img.height)) {
            if (!img.width && !img.height) {
                img.height = img.naturalHeight;
                img.width = img.naturalWidth;
            } else if (img.width) {
                img.height = Math.round(img.naturalHeight *
                                  (parseInt(img.width, 10) / img.naturalWidth));
            } else if (img.height) {
                img.width = Math.round(img.naturalWidth *
                                (parseInt(img.height, 10) / img.naturalHeight));
            }
        }
    }

    // calculate scroll width of content and add corners and shadow width
    if (!w) {
        w = Math.ceil(parseFloat(OpenLayers.Element.getStyle(content,"width")));
        if (!w) {
            w = parseInt(content.scrollWidth);
        }
        // update container width to allow height to adjust
        container.style.width = w + "px";
    }
    // capture height and add shadow and corner image widths
    if (!h) {
        h = Math.ceil(parseFloat(
                               OpenLayers.Element.getStyle(content, "height")));
        if (!h){
            h = parseInt(content.scrollHeight);
        }
        h -= 2; // Remove 1px * 2 of noMargin
    }

    // remove elements
    container.removeChild(content);
    if (superContainer) {
        superContainer.removeChild(container);
        containerElement.removeChild(superContainer);
    } else {
        containerElement.removeChild(container);
    }

    return new OpenLayers.Size(w, h);
};

/**
 * APIFunction: getScrollbarWidth
 * This function has been modified by the OpenLayers from the original version,
 *     written by Matthew Eernisse and released under the Apache 2
 *     license here:
 *
 *     http://www.fleegix.org/articles/2006/05/30/getting-the-scrollbar-width-in-pixels
 *
 *     It has been modified simply to cache its value, since it is physically
 *     impossible that this code could ever run in more than one browser at
 *     once.
 *
 * Returns:
 * {Integer}
 */
OpenLayers.Util.getScrollbarWidth = function() {

    var scrollbarWidth = OpenLayers.Util._scrollbarWidth;

    if (scrollbarWidth == null) {
        var scr = null;
        var inn = null;
        var wNoScroll = 0;
        var wScroll = 0;

        // Outer scrolling div
        scr = document.createElement('div');
        scr.style.position = 'absolute';
        scr.style.top = '-1000px';
        scr.style.left = '-1000px';
        scr.style.width = '100px';
        scr.style.height = '50px';
        // Start with no scrollbar
        scr.style.overflow = 'hidden';

        // Inner content div
        inn = document.createElement('div');
        inn.style.width = '100%';
        inn.style.height = '200px';

        // Put the inner div in the scrolling div
        scr.appendChild(inn);
        // Append the scrolling div to the doc
        document.body.appendChild(scr);

        // Width of the inner div sans scrollbar
        wNoScroll = inn.offsetWidth;

        // Add the scrollbar
        scr.style.overflow = 'auto';
        scr.style.overflowY = 'scroll';
        scr.style.overflowX = 'hidden';
        // Width of the inner div width scrollbar
        wScroll = scr.clientWidth;

        // Remove the scrolling div from the doc
        document.body.removeChild(document.body.lastChild);

        // Pixel width of the scroller
        OpenLayers.Util._scrollbarWidth = (wNoScroll - wScroll);
        scrollbarWidth = OpenLayers.Util._scrollbarWidth;
    }

    return scrollbarWidth;
};

/**
 * APIFunction: getW3cBoxModel
 * Determine the box model. If returns true, then browser uses the w3c box,
 *      otherwise, the browser uses the traditional box model.
 *
 * Returns:
 * {Boolean}
 */
OpenLayers.Util.getW3cBoxModel = function() {
    var w3cBoxModel = OpenLayers.Util._w3cBoxModel;

    if (w3cBoxModel == null) {
        // Determine the box model. If the testDiv's clientWidth is 3, then
        // the borders are outside and we are dealing with the w3c box
        // model. Otherwise, the browser uses the traditional box model and
        // the borders are inside the box bounds, leaving us with a
        // clientWidth of 1.
        var testDiv = document.createElement("div");
        //testDiv.style.visibility = "hidden";
        testDiv.style.position = "absolute";
        testDiv.style.border = "1px solid black";
        testDiv.style.width = "3px";
        document.body.appendChild(testDiv);
        w3cBoxModel = testDiv.clientWidth == 3;
        document.body.removeChild(testDiv);
    }
    return w3cBoxModel;
};

// ** OpenLayers.Popup **
/**
 * Method: getContentDivPadding
 * Glorious, oh glorious hack in order to determine the css 'padding' of
 *     the contentDiv. IE/Opera return null here unless we actually add the
 *     popup's main 'div' element (which contains contentDiv) to the DOM.
 *     So we make it invisible and then add it to the document temporarily.
 *
 *     Once we've taken the padding readings we need, we then remove it
 *     from the DOM (it will actually get added to the DOM in
 *     Map.js's addPopup)
 *
 * Returns:
 * {<OpenLayers.Bounds>}
 */
OpenLayers.Popup.prototype.getContentDivPadding = function() {
    //use cached value if we have it
    var contentDivPadding = this._contentDivPadding;
    if (!contentDivPadding) {

        if (this.div.parentNode == null || !OpenLayers.Util.isElement(this.div.parentNode)) {
            //make the div invisible and add it to the page
            this.div.style.display = "none";
            document.body.appendChild(this.div);
        }

        //read the padding settings from css, put them in an OL.Bounds
        contentDivPadding = new OpenLayers.Bounds(
            OpenLayers.Element.getStyle(this.contentDiv, "padding-left"),
            OpenLayers.Element.getStyle(this.contentDiv, "padding-bottom"),
            OpenLayers.Element.getStyle(this.contentDiv, "padding-right"),
            OpenLayers.Element.getStyle(this.contentDiv, "padding-top")
        );
        var contentDivBorder = new OpenLayers.Bounds(
            OpenLayers.Element.getStyle(this.contentDiv, "border-left-width"),
            OpenLayers.Element.getStyle(this.contentDiv, "border-bottom-width"),
            OpenLayers.Element.getStyle(this.contentDiv, "border-right-width"),
            OpenLayers.Element.getStyle(this.contentDiv, "border-top-width")
        );
        contentDivPadding.left += isNaN(contentDivBorder.left) ?
                                                    0 : contentDivBorder.left;
        contentDivPadding.bottom += isNaN(contentDivBorder.bottom) ?
                                                    0 : contentDivBorder.bottom;
        contentDivPadding.right += isNaN(contentDivBorder.right) ?
                                                    0 : contentDivBorder.right;
        contentDivPadding.top += isNaN(contentDivBorder.top) ?
                                                    0 : contentDivBorder.top;

        //cache the value
        this._contentDivPadding = contentDivPadding;

        if (this.div.parentNode == document.body) {
            //remove the div from the page and make it visible again
            document.body.removeChild(this.div);
            this.div.style.display = "";
        }
    }
    return contentDivPadding;
};

/**
 * Method: setSize
 * Used to adjust the size of the popup.
 *
 * Parameters:
 * contentSize - {<OpenLayers.Size>} the new size for the popup's
 *     contents div (in pixels).
 */
OpenLayers.Popup.prototype.setSize = function(contentSize) {
    this.size = contentSize.clone();
    this.contentSize = contentSize;

    // if our contentDiv has a css 'padding' set on it by a stylesheet, we
    //  must add that to the desired "size".
    var contentDivPadding = this.getContentDivPadding();
    var wPaddingCont = contentDivPadding.left + contentDivPadding.right;
    var hPaddingCont = contentDivPadding.top + contentDivPadding.bottom;

    // take into account the popup's 'padding' property
    this.fixPadding();
    var wPaddingFix = this.padding.left + this.padding.right;
    var hPaddingFix = this.padding.top + this.padding.bottom;

    // make extra space for the close div
    if (this.closeDiv) {
        var closeDivWidth = parseInt(this.closeDiv.style.width);
        wPaddingFix += closeDivWidth + contentDivPadding.right;
    }

    //increase size of the main popup div to take into account the
    // users's desired padding and close div.
    this.size.w += wPaddingCont + wPaddingFix;
    this.size.h += hPaddingCont + hPaddingFix;

    if (this.div != null) {
        this.div.style.width = this.size.w + "px";
        this.div.style.height = this.size.h + "px";
    }
    if (this.contentDiv != null){
        if (OpenLayers.Util.getW3cBoxModel()) {
            this.contentDiv.style.width = contentSize.w + "px";
            this.contentDiv.style.height = contentSize.h + "px";
        } else {
            // now if our browser is IE & on quirks mode, we need to actually make the contents
            // div itself bigger to take its own padding into effect. this makes
            // me want to shoot someone, but so it goes.
            this.contentDiv.style.width = (contentSize.w + wPaddingCont) + "px";
            this.contentDiv.style.height = (contentSize.h + hPaddingCont) + "px";
        }
    }
};

/**
 * APIMethod: updateSize
 * Auto size the popup so that it precisely fits its contents (as
 *     determined by this.contentDiv.innerHTML). Popup size will, of
 *     course, be limited by the available space on the current map
 */
OpenLayers.Popup.prototype.updateSize = function() {

    // determine actual render dimensions of the contents by putting its
    // contents into a fake contentDiv (for the CSS) and then measuring it
    // regardless padding of contentDisplayClass.
    var preparedHTML = "<div class='" + this.contentDisplayClass+ "'" +
        " style='padding:0px; border-width:0px'>" +
        this.contentDiv.innerHTML +
        "</div>";

    var containerElement = (this.map) ? this.map.div : document.body;
    var realSize = OpenLayers.Util.getRenderedDimensions(
        preparedHTML, null, {
            displayClass: this.displayClass,
            containerElement: containerElement
        }
    );

    // is the "real" size of the div is safe to display in our map?
    var safeSize = this.getSafeContentSize(realSize);

    var newSize = null;
    if (safeSize.equals(realSize)) {
        //real size of content is small enough to fit on the map,
        // so we use real size.
        newSize = realSize;
        // Chrome if images then can generate both scrollbars when not needed.
        this.contentDiv.style.overflowX = "hidden";
        this.contentDiv.style.overflowY = "hidden";
    } else {

        // make a new 'size' object with the clipped dimensions
        // set or null if not clipped.
        var fixedSize = {
            w: (safeSize.w < realSize.w) ? safeSize.w : null,
            h: (safeSize.h < realSize.h) ? safeSize.h : null
        };

        if (fixedSize.w && fixedSize.h) {
            //content is too big in both directions, so we will use
            // max popup size (safeSize), knowing well that it will
            // overflow both ways.
            newSize = safeSize;
        } else {
            //content is clipped in only one direction, so we need to
            // run getRenderedDimensions() again with a fixed dimension
            var clippedSize = OpenLayers.Util.getRenderedDimensions(
                preparedHTML, fixedSize, {
                    displayClass: this.contentDisplayClass,
                    containerElement: containerElement
                }
            );

            //if the clipped size is still the same as the safeSize,
            // that means that our content must be fixed in the
            // offending direction. If overflow is 'auto', this means
            // we are going to have a scrollbar for sure, so we must
            // adjust for that.
            //
            var currentOverflow = OpenLayers.Element.getStyle(
                this.contentDiv, "overflow"
            );
            if ( (currentOverflow != "hidden") &&
                 (clippedSize.w <= safeSize.w && clippedSize.h <= safeSize.h) ) {
                var scrollBar = OpenLayers.Util.getScrollbarWidth();
                var contentDivPadding = this.getContentDivPadding();
                if (fixedSize.w) {
                    if (clippedSize.h + scrollBar >= safeSize.h) {
                        if (this.maxSize && clippedSize.h + scrollBar +
                                    contentDivPadding.top +
                                    contentDivPadding.bottom > this.maxSize.h) {
                            clippedSize.h = this.maxSize.h -
                                (contentDivPadding.top + contentDivPadding.bottom);
                        } else {
                            clippedSize.h += scrollBar;
                        }
                    }
                } else {
                    if (clippedSize.w + scrollBar >= safeSize.w) {
                        if (this.maxSize && clippedSize.w + scrollBar +
                                    contentDivPadding.left +
                                    contentDivPadding.right > this.maxSize.w) {
                            clippedSize.w = this.maxSize.w -
                                (contentDivPadding.left + contentDivPadding.right);
                        } else {
                            clippedSize.w += scrollBar;
                        }
                    }
                }
            }

            newSize = this.getSafeContentSize(clippedSize);
        }
    }
    this.setSize(newSize);
};

// ** OpenLayers.Popup.FramedCloud **
/**
 * Property: positionBlocks
 * {Object} Hash of differen position blocks, keyed by relativePosition
 *     two-character code string (ie "tl", "tr", "bl", "br")
 */
(function(){
    var fc_pb = OpenLayers.Popup.FramedCloud.prototype.positionBlocks;
    fc_pb.tl.blocks[4].position = new OpenLayers.Pixel(0, -687);
    fc_pb.tr.offset =  new OpenLayers.Pixel(-44, 0);
    fc_pb.tr.blocks[3].size = new OpenLayers.Size(22, 18);
    fc_pb.tr.blocks[3].position = new OpenLayers.Pixel(-1238, -632);
    fc_pb.bl.offset = new OpenLayers.Pixel(44, 0);
})();

//START COOKIE JS
/*!
 * jQuery Cookie Plugin v1.4.0
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
        if (typeof define === 'function' && define.amd) {
                // AMD. Register as anonymous module.
                define(['jquery'], factory);
        } else {
                // Browser globals.
                factory(jQuery);
        }
}(function ($) {

        var pluses = /\+/g;

        function encode(s) {
                return config.raw ? s : encodeURIComponent(s);
        }

        function decode(s) {
                return config.raw ? s : decodeURIComponent(s);
        }

        function stringifyCookieValue(value) {
                return encode(config.json ? JSON.stringify(value) : String(value));
        }

        function parseCookieValue(s) {
                if (s.indexOf('"') === 0) {
                        // This is a quoted cookie as according to RFC2068, unescape...
                        s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                }

                try {
                        // Replace server-side written pluses with spaces.
                        // If we can't decode the cookie, ignore it, it's unusable.
                        // If we can't parse the cookie, ignore it, it's unusable.
                        s = decodeURIComponent(s.replace(pluses, ' '));
                        return config.json ? JSON.parse(s) : s;
                } catch(e) {}
        }

        function read(s, converter) {
                var value = config.raw ? s : parseCookieValue(s);
                return $.isFunction(converter) ? converter(value) : value;
        }

        var config = $.cookie = function (key, value, options) {

                // Write
                if (value !== undefined && !$.isFunction(value)) {
                        options = $.extend({}, config.defaults, options);

                        if (typeof options.expires === 'number') {
                                var days = options.expires, t = options.expires = new Date();
                                t.setDate(t.getDate() + days);
                        }

                        return (document.cookie = [
                                encode(key), '=', stringifyCookieValue(value),
                                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                                options.path    ? '; path=' + options.path : '',
                                options.domain  ? '; domain=' + options.domain : '',
                                options.secure  ? '; secure' : ''
                        ].join(''));
                }

                // Read

                var result = key ? undefined : {};

                // To prevent the for loop in the first place assign an empty array
                // in case there are no cookies at all. Also prevents odd result when
                // calling $.cookie().
                var cookies = document.cookie ? document.cookie.split('; ') : [];

                for (var i = cookies.length; i--;) {
                        var parts = cookies[i].split('=');
                        var name = decode(parts.shift());
                        var cookie = parts.join('=');

                        if (key && key === name) {
                                // If second argument (value) is a function it's a converter...
                                result = read(cookie, value);
                                break;
                        }

                        // Prevent storing a cookie that we couldn't decode.
                        if (!key && (cookie = read(cookie)) !== undefined) {
                                result[name] = cookie;
                        }
                }

                return result;
        };

        config.defaults = {};

        $.removeCookie = function (key, options) {
                if ($.cookie(key) === undefined) {
                        return false;
                }

                // Must not alter options, thus extending a fresh object...
                $.cookie(key, '', $.extend({}, options, { expires: -1 }));
                return !$.cookie(key);
        };

}));



function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function getCookie() {
    var vars = {};
    var parts = $.cookie("connection").replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
        var lon = 5;
        var lat = 40;
        var zoom = 5;
        var map, layer, vector, olLayer, hLayer, popup, feature, style, ruleDir, ruleMove, features22;
        var myAddress = '';
        var vehicles = [];
        var conn = getCookie();
        var connect;
function init(){
    map = new OpenLayers.Map('map');

    var apiKey = "AqTGBsziZHIJYYxgivLBf0hVdrAk9mWO5cQcb8Yux8sW5M8c8opEC2lZqKR1ZZXf";
    var osm = new OpenLayers.Layer.OSM();
var cloud = new OpenLayers.Layer.OSM("OSM Cycle",
  ["http://a.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
   "http://b.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
   "http://c.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png"],{isBaseLayer: true});

var transport = new OpenLayers.Layer.OSM("OSM Transport",
   ['http://a.tile2.opencyclemap.org/transport/${z}/${x}/${y}.png']);

var quest = new OpenLayers.Layer.OSM("OSM MapQuest",
   ['http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png']);

    var gmapp = new OpenLayers.Layer.Google(
                "Google Physical",
                {type: google.maps.MapTypeId.TERRAIN, numZoomLevels: 20}
            );
    //gmapp.mapObject.addOverlay(new GStreetviewOverlay());
    var gmaps = new OpenLayers.Layer.Google(
                "Google Streets", // the default
                {numZoomLevels: 20}
            );
    //gmaps.mapObject.addOverlay(new GStreetviewOverlay());
    var gmaph = new OpenLayers.Layer.Google(
                "Google Hybrid",
                {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
            );
    //gmaph.mapObject.addOverlay(new GStreetviewOverlay());
    var gmapss = new OpenLayers.Layer.Google(
                "Google Satellite",
                {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
            );
    //gmapss.mapObject.addOverlay(new GStreetviewOverlay());

    var road = new OpenLayers.Layer.Bing({
                name: "Bing Road",
                key: apiKey,
                type: "Road"
            });
            var hybrid = new OpenLayers.Layer.Bing({
                name: "Bing Hybrid",
                key: apiKey,
                type: "AerialWithLabels"
            });
            var aerial = new OpenLayers.Layer.Bing({
                name: "Bing Aerial",
                key: apiKey,
                type: "Aerial"
            });

//openweather.org
    var layer_cloud = new OpenLayers.Layer.XYZ(
        "clouds",
        "http://${s}.tile.openweathermap.org/map/clouds/${z}/${x}/${y}.png",
        {
            isBaseLayer: false,
            opacity: 0.7,
            sphericalMercator: true,
            visibility: false
        }
    );
    var layer_precipitation = new OpenLayers.Layer.XYZ(
        "precipitation",
        "http://${s}.tile.openweathermap.org/map/precipitation/${z}/${x}/${y}.png",
        {
            isBaseLayer: false,
            opacity: 0.5,
            sphericalMercator: true,
            visibility: false
        }
    );
    var layer_pressure = new OpenLayers.Layer.XYZ(
        "pressure",
        "http://${s}.tile.openweathermap.org/map/pressure/${z}/${x}/${y}.png",
        {
            isBaseLayer: false,
            opacity: 0.5,
            sphericalMercator: true,
            visibility: false
        }
    );
    var layer_wind = new OpenLayers.Layer.XYZ(
        "wind",
        "http://${s}.tile.openweathermap.org/map/wind/${z}/${x}/${y}.png",
        {
            isBaseLayer: false,
            opacity: 0.5,
            sphericalMercator: true,
            visibility: false
        }
    );
    var layer_temp = new OpenLayers.Layer.XYZ(
        "temperature",
        "http://${s}.tile.openweathermap.org/map/temp/${z}/${x}/${y}.png",
        {
            isBaseLayer: false,
            opacity: 0.5,
            sphericalMercator: true,
            visibility: false
        }
    );
    var layer_snow = new OpenLayers.Layer.XYZ(
        "snow",
        "http://${s}.tile.openweathermap.org/map/snow/${z}/${x}/${y}.png",
        {
            isBaseLayer: false,
            opacity: 0.5,
            sphericalMercator: true,
            visibility: false
        }
    );
    var stations = new OpenLayers.Layer.Vector.OWMStations("Stations",{visibility: false});
	// Make weather layer. Server clastering of markers is using.
	var city = new OpenLayers.Layer.Vector.OWMWeather("Weather",{visibility: false});

//openweather.org
//, transport, cloud, quest, gmapp, gmaps, gmaph, gmapss, road, hybrid, aerial, ,layer_cloud,layer_precipitation,layer_pressure,layer_wind,layer_temp,layer_snow
 map.addLayers([osm, transport, cloud, quest, gmapp, gmaps, gmaph, gmapss, road, hybrid, aerial,layer_cloud,layer_precipitation,layer_pressure,layer_wind,layer_temp,layer_snow,stations,city]);
//gmaps.mapObject.addOverlay(new GStreetviewOverlay());
map.setBaseLayer(cloud);
map.setCenter(
        new OpenLayers.LonLat(24.5, 42.9).transform(
            new OpenLayers.Projection("EPSG:4326"),
            map.getProjectionObject()
        ),
        7
    );

    map.addControl(new OpenLayers.Control.LayerSwitcher());

    var filterMove = new OpenLayers.Filter.Comparison({
	            type: OpenLayers.Filter.Comparison.EQUAL_TO,
	            property: "statut",
	            value: 0});
	ruleMove = new OpenLayers.Rule({
                filter: filterMove,
                symbolizer: {
                graphicWidth: 32,
                graphicHeight: 32,
                graphicYOffset: -16,
                graphicXOffset: -16,
                labelXOffset: 0,
                labelYOffset: -30,
                externalGraphic: "${icon}"
                }
            });
    ruleDir = new OpenLayers.Rule({
                    filter: filterMove,
                    symbolizer: {
                    rotation: "${direction}",
                    graphicWidth: 20,
                    graphicHeight: 20,
                    graphicYOffset: -10,
                    graphicXOffset: -10,
                    labelXOffset: 0,
                    labelYOffset: -24,
                    externalGraphic: "http://85.130.111.122/aspx/img/dir.png"
                    }
                });

	var filterStop = new OpenLayers.Filter.Comparison({
	            type: OpenLayers.Filter.Comparison.EQUAL_TO,
	            property: "statut",
	            value: 1});
    var filterNoGps = new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Comparison.EQUAL_TO,
                property: "statut", // the "foo" feature attribute
                value: 2});
    var filterNoGpsAnt = new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Comparison.EQUAL_TO,
                property: "statut", // the "foo" feature attribute
                value: 3});
    var filterNoGprs = new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Comparison.EQUAL_TO,
                property: "statut", // the "foo" feature attribute
                value: 4});

    style = new OpenLayers.Style(
        // the first argument is a base symbolizer
        // all other symbolizers in rules will extend this one
        {
             // shift graphic up 28 pixels
        label: "${RegNumber}", // label will be foo attribute value
        Text:
        {
        fill: true,
		fillColor: "#00ff00",
		fillOpacity: 0.5
		},
		strokeColor: "#00ff00",
		strokeWidth: 1,
		strokeDashstyle: "dash",
		labelAlign: "cc",
		fontColor: "#000000",
		fontOpacity: 1.0,
		fontFamily: "Arial",
		fontSize: 10,
fontStyle: "{ background-color: #E6D8F8; border: solid 1px cyan; }",
		cursor: "pointer",
		graphicWidth: 16,
        graphicHeight: 16,
        graphicYOffset: -8,
        graphicXOffset: -8,
        labelXOffset: 0,
        labelYOffset: -20,
        rotation: "${direction}"
        },
        // the second argument will include all rules
        {
            rules: [

		new OpenLayers.Rule({
                    filter: filterStop,
                    symbolizer: {externalGraphic: "http://85.130.111.122/aspx/img/stopped.png"}
                }),
                    ruleMove
		          ,
        new OpenLayers.Rule({
                    filter: filterNoGpsAnt,
                    symbolizer: {rotation: "", externalGraphic: "http://85.130.111.122/aspx/img/nogpsant.png"}
                }),
		new OpenLayers.Rule({
                    filter: filterNoGps,
                    symbolizer: {externalGraphic: "http://85.130.111.122/aspx/img/nogps.png"}
                }),
		new OpenLayers.Rule({
                    filter: filterNoGprs,
                    symbolizer: {externalGraphic: "http://85.130.111.122/aspx/img/nogprs.png"}
                })

//                new OpenLayers.Rule({
//                   // apply this rule if no others apply
//                   elseFilter: true,
 //                   symbolizer: {
//                        externalGraphic: "../img/north-mini.png"
//                    }
//                })
            ]
        }
    );


    	olLayer = new OpenLayers.Layer.Vector("Vectors", {
            projection: new OpenLayers.Projection("EPSG:4326"),
            strategies: [new OpenLayers.Strategy.BBOX(), new OpenLayers.Strategy.Refresh({interval: 10000, force: true})],
            protocol: new OpenLayers.Protocol.Script({
                url: "http://85.130.111.122/aspx/service/sledaonline.asmx/GetOnlineStatus",
               params: {
                    databaseServer: conn["server_name"],
                    databaseName: conn["server_dbnm"],
                    databasePort: conn["server_port"],
                    databaseUID: conn["server_user"],
                    databaseUPass: conn["server_pass"],
                    programUID: conn["program_usr"],
                    programPass: conn["program_psw"],
                    groupFilter: groupFilter
                },
               format: new OpenLayers.Format.JSON({'internalProjection': new OpenLayers.Projection("EPSG:900913"),'externalProjection': new OpenLayers.Projection("EPSG:4326")})}),styleMap: new OpenLayers.StyleMap(style)});

                olLayer.styleMap.styles['default'].defaultStyle.rotation = "";

        map.addLayer(olLayer);


        var smallSt = new OpenLayers.Filter.Comparison({
	            type: OpenLayers.Filter.Comparison.EQUAL_TO,
	            property: "type",
	            value: 1});
	    var middleSt = new OpenLayers.Filter.Comparison({
	            type: OpenLayers.Filter.Comparison.EQUAL_TO,
	            property: "type",
	            value: 2});
	    var bigSt = new OpenLayers.Filter.Comparison({
	            type: OpenLayers.Filter.Comparison.EQUAL_TO,
	            property: "type",
	            value: 3});

        styleHistory = new OpenLayers.Style(
        {
        graphicWidth: 16,
        graphicHeight: 16,
        graphicYOffset: -8,
        graphicXOffset: -8
        },
        {
            rules: [

		new OpenLayers.Rule({filter: smallSt,symbolizer: {cursor: "pointer",externalGraphic: "http://85.130.111.122/aspx/stops/green.png"}}),
        new OpenLayers.Rule({filter: middleSt,symbolizer: {cursor: "pointer",externalGraphic: "http://85.130.111.122/aspx/stops/yellow.png"}}),
        new OpenLayers.Rule({filter: bigSt,symbolizer: {cursor: "pointer",externalGraphic: "http://85.130.111.122/aspx/stops/red.png"}})
            ]
        }
    );

        hLayer = new OpenLayers.Layer.Vector("History", {
            projection: new OpenLayers.Projection("EPSG:4326"),styleMap: new OpenLayers.StyleMap(styleHistory)});
        map.addLayer(hLayer);


var hoverAndClickControl = new OpenLayers.Control.SelectFeature(
                [olLayer,hLayer] // this is the array of layers you're keeping in memory
                ,{
                    callbacks:
                    {
                          click: onFeatureSelect
                    }
                }
            );

map.addControl(hoverAndClickControl);
hoverAndClickControl.activate();

//olLayer.styleMap.styles['default'].defaultStyle.label = '';
olLayer.redraw();

var pr1 = new OpenLayers.Projection("EPSG:4326");
var pr2 = map.getProjectionObject();
var lineStyle = new OpenLayers.Style( {strokeWidth: 5, strokeDashstyle: 'longdash', strokeColor: 'red', strokeOpacity: 0.7} );
var llineStyle = new OpenLayers.Style( {strokeWidth: 2, strokeDashstyle: 'dot', strokeColor: 'blue', strokeOpacity: 0.7} );

var start_point = new OpenLayers.Geometry.Point(23.320379, 42.701330).transform(pr1, pr2);
var end_point = new OpenLayers.Geometry.Point(23.219063, 42.789102).transform(pr1, pr2);

var lines = new OpenLayers.Layer.Vector("Servers", {styleMap: new OpenLayers.StyleMap(lineStyle)});
lines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(24.793468, 43.422567).transform(pr1, pr2);
lines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(27.977873, 43.554644).transform(pr1, pr2);
lines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(22.818192, 43.964280).transform(pr1, pr2);
lines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(25.501535, 41.885538).transform(pr1, pr2);
lines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);

var llines = new OpenLayers.Layer.Vector("Routers", {styleMap: new OpenLayers.StyleMap(llineStyle)});
start_point = new OpenLayers.Geometry.Point(23.219063, 42.789102).transform(pr1, pr2);
end_point = new OpenLayers.Geometry.Point(23.227817, 42.794141).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(23.221981, 42.778771).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(23.233139, 42.785827).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(23.208076, 42.784315).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(23.209793, 42.796030).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);

start_point = new OpenLayers.Geometry.Point(24.793468, 43.422567).transform(pr1, pr2);
end_point = new OpenLayers.Geometry.Point(24.793026, 43.432852).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(24.808132, 43.426993).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(24.805729, 43.415398).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(24.787361, 43.413527).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(24.779808, 43.425622).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);

start_point = new OpenLayers.Geometry.Point(27.977873, 43.554644).transform(pr1, pr2);
end_point = new OpenLayers.Geometry.Point(27.973396, 43.565840).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(27.991592, 43.562606).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(27.991936, 43.550414).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(27.975799, 43.546060).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(27.965500, 43.555266).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);

start_point = new OpenLayers.Geometry.Point(22.818192, 43.964280).transform(pr1, pr2);
end_point = new OpenLayers.Geometry.Point(22.819092, 43.974410).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(22.830250, 43.970704).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(22.830250, 43.960573).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(22.817203, 43.956866).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(22.804500, 43.966380).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);

start_point = new OpenLayers.Geometry.Point(25.501535, 41.885538).transform(pr1, pr2);
end_point = new OpenLayers.Geometry.Point(25.508510, 41.893716).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(25.515034, 41.885410).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(25.507652, 41.877741).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(25.491859, 41.880681).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);
end_point = new OpenLayers.Geometry.Point(25.489799, 41.892566).transform(pr1, pr2);
llines.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([start_point, end_point]))]);

map.addLayers([lines,llines]);

//new OpenLayers.LonLat(15.2, 45.9).transform(
//            new OpenLayers.Projection("EPSG:4326"),
//            map.getProjectionObject()
                        //, clickout: onFeatureUnselect
                        //, over:  onFeatureHover
                        //, out: onFeatureUnhover

        }

function onFeatureSelect(p_feature)
{
  // hey, feature you want is the parameter.  do whatever you need to do
    // A popup with some information about our location
    if (p_feature.layer.name == "History")
    {
        var type;
        if (p_feature.data.type == 3)
            type = "big";
        else if(p_feature.data.type == 2)
            type = "middle";
        else if(p_feature.data.type == 1)
            type = "small";
        var content = '<div><h2>Vehicle <strong>' + p_feature.data.RegNumber + '</strong></h2>' +
            'Stop start at: ' + p_feature.data.DateTime + '</br>' +
            'Type: ' + type + '</br>' +
            'Duration: ' + p_feature.data.duration + '</br>' +
            'Latitude: ' + p_feature.data.latitude + '</br>' +
            'Longitude: ' + p_feature.data.longitude + '</br>' +
            'Altitude: ' + p_feature.data.elevation + ' meters</br>' +
            'Location: </br><p id="address"></p></div>';
            GetAddress(p_feature.data.latitude, p_feature.data.longitude);

            popup = new OpenLayers.Popup.FramedCloud("Popup",
            p_feature.geometry.getBounds().getCenterLonLat(), null,
            null, null,
            true // <-- true if we want a close (X) button, false otherwise
            );
        popup.contentHTML = content
        popup.autoSize = true;
        popup.closeOnMove = false;
        map.addPopup(popup, true);
        popup.show();
        return;
    }


    var gpsStat,gprsStat,regNmuber;
    gpsStat = "GPS OK";
    gprsStat = "GPRS OK";
    switch (p_feature.data.statut)
    {
        case 2:
            gpsStat = "No GPS signal";
            break;
        case 3:
            gpsStat = "No GPS antenna";
            break;
        case 4:
            gprsStat = "No GPRS";
            gpsStat = "N/A";
            break;
    }

    var content = '<div><h2>Details for <strong>' + p_feature.data.RegNumber + '</strong></h2>' +
        'Last data time: ' + p_feature.data.DateTime + '</br>' +
        'GPS status: ' + gpsStat + '</br>' +
        'GPRS status: ' + gprsStat + '</br>' +
        'Location: </br><p id="address"></p>' +
        '<p class="getMoreDetails" value="' + p_feature.fid + '">More details...</p>' +
        '<p class="zoom" value="' + p_feature.fid + '">Zoom item...</p></div>';
        GetAddress(p_feature.data.latitude, p_feature.data.longitude);

        popup = new OpenLayers.Popup.FramedCloud("Popup",
        p_feature.geometry.getBounds().getCenterLonLat(), null,
        null, null,
        true // <-- true if we want a close (X) button, false otherwise
        );
popup.contentHTML = content
popup.autoSize = true;
popup.closeOnMove = false;
map.addPopup(popup, true);
popup.show();

regNumber = p_feature.data.RegNumber;
if ($("#moreDetailDivContainer").css('display') != 'none')
{
    LoadMoreDetails(p_feature.fid, p_feature.attributes.RegNumber, p_feature.attributes.name,p_feature.attributes.latitude,p_feature.attributes.longitude, p_feature.attributes.elevation, p_feature.attributes.loc);
}
else
{
$('.getMoreDetails').bind('click', function () {
            LoadMoreDetails(p_feature.fid, p_feature.attributes.RegNumber, p_feature.attributes.name,p_feature.attributes.latitude,p_feature.attributes.longitude, p_feature.attributes.elevation, p_feature.attributes.loc);
    });
}

$('.zoom').bind('click', function () {
        var point = new OpenLayers.LonLat(p_feature.attributes.longitude, p_feature.attributes.latitude);
        InitSmallMap(p_feature.fid, point, p_feature.attributes.loc);
 });

 $(".fuel").bind('click', function () {

        var name = p_feature.attributes.name;
        var time = displayTime();
        var url = "http://85.130.111.122/aspx/service/sledaonline.asmx/GetFuelByHoursJsonp?" +
                        "&databaseServer=" + conn["server_name"] +
                        "&databaseName=" + conn["server_dbnm"] +
                        "&databasePort=" + conn["server_port"] +
                        "&databaseUID=" + conn["server_user"] +
                        "&databaseUPass=" + conn["server_pass"] +
                        "&programUID=" + conn["program_usr"] +
                        "&programPass=" + conn["program_psw"] +
                        "&deviceId=" + name +
                        "&dateFr=" + time +
                        "&hours=" + $(this).attr('value') + "&callback=?";
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'jsonp',
            beforeSend: function () {$('#load, .centered').css('display','block');},
            error: function(xhr, status, error) {
                $('#load, .centered').css('display','none');
                alert('Missing data');
            },
            success: function(data) {
                $('#fuelHistory').html('<span class="fuelRegNumber">' + p_feature.attributes.RegNumber + '</span><div id="fuelClose" class="olPopupCloseBox"></div><div id="fuelLegend"></div><div id="chart_container"><div id="y_axis"></div><div id="chart"></div></div><div id="legend_container"><div id="smoother" title="Smoothing"></div></div><div id="fuelSlider"></div>').draggable({opacity:'0.3', containment:'window'});
                var graph = new Rickshaw.Graph( {
                element: document.getElementById("chart"),
                width: 500,
                height: 200,
                renderer: 'area',
                series: data
                });
                var x_axis = new Rickshaw.Graph.Axis.Time( { graph: graph } );

                var y_axis = new Rickshaw.Graph.Axis.Y( {
                graph: graph,
                orientation: 'left',
                tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
                element: document.getElementById('y_axis'),
                });

                var legend = new Rickshaw.Graph.Legend({
                graph: graph,
                element: document.querySelector('#fuelLegend')
                });

                graph.renderer.unstack = true;
                graph.render();

                var hoverDetail = new Rickshaw.Graph.HoverDetail( {
                graph: graph,
                formatter: function(series, x, y) {
                    var date = '<span class="date">' + new Date(x * 1000).toLocaleString() + '</span>';
                    var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + '"></span>';
                    var content = swatch + series.name + ": " + parseInt(y) + ' lt<br>' + date;
                    return content;
                }
                });
                $('#load, .centered').css('display','none');
                $('#fuelHistory').css('display','block');

                var sl = document.querySelector('#fuelSlider');
                var slider = new Rickshaw.Graph.RangeSlider({
                graph: graph,
                element: sl
                });
                $('#fuelClose').bind('click',function(){$('#fuelHistory').css('display','none')});
            }
        });
 });

 $('.history').bind('click', function () {
        var name = p_feature.attributes.name;
        var time = displayTime();
            var url = "http://85.130.111.122/aspx/service/sledaonline.asmx/GetEncodedPolylineByHours?" +
                    "&databaseServer=" + conn["server_name"] +
                    "&databaseName=" + conn["server_dbnm"] +
                    "&databasePort=" + conn["server_port"] +
                    "&databaseUID=" + conn["server_user"] +
                    "&databaseUPass=" + conn["server_pass"] +
                    "&programUID=" + conn["program_usr"] +
                    "&programPass=" + conn["program_psw"] +
                    "&deviceId=" + name +
                    "&dateFr=" + time +
                    "&hours=" + $(this).attr('value');
$.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            beforeSend: function () {$('#load, .centered').css('display','block');},
            error: function(xhr, status, error) {
                $('#load, .centered').css('display','none');
                alert('Missing data');
            },
            success: function(json) {
                $('#load, .centered').css('display','none');
                var parts = json.split("DELIMETER");
                hLayer.destroyFeatures();
                //console.log(parts[0]);
                //console.log(parts[1]);
        features22 = new OpenLayers.Format.EncodedPolyline().read(parts[0]);
		features22.geometry.transform(new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject());
		var green = OpenLayers.Util.applyDefaults(green, OpenLayers.Feature.Vector.style['default']);
		green.fill = false;
		green.strokeColor = '#ff0000';
		green.fillOpacity = 0.3;
		green.strokeWidth = 3;
		features22.style = green;
		hLayer.addFeatures(features22);
		var stops = new OpenLayers.Format.GeoJSON({
                'internalProjection': new OpenLayers.Projection("EPSG:900913"),
                'externalProjection': new OpenLayers.Projection("EPSG:4326")
            }).read(parts[1]);
        hLayer.addFeatures(stops);
        hLayer.redraw();
        map.zoomToExtent(hLayer.getDataExtent());
 		//popup.destroy();
            }
        });
 });
}

function displayTime() {
    var str = "";

    var currentTime = new Date()

    var year = currentTime.getFullYear();
    var day = currentTime.getDate();
    var month = currentTime.getMonth() + 1;

    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()

    if (minutes < 10) {
        minutes = "0" + minutes
    }
    if (seconds < 10) {
        seconds = "0" + seconds
    }
    str += year + "-" + month + "-" + day + "%20" +hours + ":" + minutes + ":" + seconds;
    return str;
}

function fillList()
{
    var list = '';
    $("[name=vcls]").each(function(){
        list += '<option value="' + $(this).text() + '">';
    });
    $('#searchlist').html(list);
}

var date;
var timmer = function() {
   var temp = parseFloat(date.main.temp + Math.random() / 2).toFixed(1);
   $('#temp').text('Temperature: ' + temp + ' C');
   var hum = date.main.humidity + (Math.floor(Math.random() * 3) + 1);
   if (parseInt(hum) > 100) {
       hum = 99;
   }
   $('#hum').text('Humidity: ' + hum + ' %');
   var ill = (15 + Math.random() / 3).toFixed(1);
   $('#ill').text('Illuminance: ' + ill + ' klx');
   var wspeed = parseFloat(date.wind.speed + Math.random()).toFixed(2);
   $('#wspeed').text('Wind speed: ' + wspeed + ' m/s');
   var wdir = parseInt(date.wind.deg + (Math.random() * 10 +1));
   $('#wdir').text('Wind direction: ' + wdir + ' degrees');
   var press = parseFloat(date.main.pressure + Math.random()).toFixed(2);
   $('#press').text('Pressure: ' + press + ' mm');
}

var timmer1 = function(loc) {
   var temp = parseFloat(temps1[loc].temp + Math.random() / 2).toFixed(1);
   $('#temp').text('Temperature: ' + temp + ' C');
   var hum = temps1[loc].humidity + (Math.floor(Math.random() * 3) + 1);
   if (parseInt(hum) > 100) {
       hum = 99;
   }
   $('#hum').text('Humidity: ' + hum + ' %');
   var ill = (15 + Math.random() / 3).toFixed(1);
   $('#ill').text('Illuminance: ' + ill + ' klx');
   var wspeed = parseFloat(temps1[loc].wind.speed + Math.random()).toFixed(2);
   $('#wspeed').text('Wind speed: ' + wspeed + ' m/s');
   var wdir = parseInt(temps1[loc].wind.deg + (Math.random() * 10 +1));
   $('#wdir').text('Wind direction: ' + wdir + ' degrees');
   var press = parseFloat(temps1[loc].pressure + Math.random()).toFixed(2);
   $('#press').text('Pressure: ' + press + ' mm');
}

var handle;

var temps = {kostinbrod: 9.2, pleven: 10.1, dobrich: 11.2, haskovo: 15.1, vidin: 6.6};
var temps1 = {};
temps1.kostinbrod = {};
temps1.kostinbrod.weather = ' ';
temps1.kostinbrod.temp = 9.2;
temps1.kostinbrod.humidity = 87;
temps1.kostinbrod.wind = {};
temps1.kostinbrod.wind.speed = 1.75;
temps1.kostinbrod.wind.deg = 154;
temps1.kostinbrod.pressure = 900.67;
temps1.kostinbrod.ill = 16.8;

temps1.pleven = {};
temps1.pleven.weather = ' ';
temps1.pleven.temp = 12.7;
temps1.pleven.humidity = 87;
temps1.pleven.wind = {};
temps1.pleven.wind.speed = 1.66;
temps1.pleven.wind.deg = 121;
temps1.pleven.pressure = 982.78;
temps1.pleven.ill = 14.8;

temps1.dobrich = {};
temps1.dobrich.weather = ' ';
temps1.dobrich.temp = 17.1;
temps1.dobrich.humidity = 72;
temps1.dobrich.wind = {};
temps1.dobrich.wind.speed = 3.75;
temps1.dobrich.wind.deg = 250;
temps1.dobrich.pressure = 1003.2;
temps1.dobrich.ill = 15.4;

temps1.haskovo = {};
temps1.haskovo.weather = '';
temps1.haskovo.temp = 12.9;
temps1.haskovo.humidity = 87;
temps1.haskovo.wind = {};
temps1.haskovo.wind.speed = 7.11;
temps1.haskovo.wind.deg = 203;
temps1.haskovo.pressure = 973.67;
temps1.haskovo.ill = 16.8;

temps1.vidin = {};
temps1.vidin.weather = ' ';
temps1.vidin.temp = 8.49;
temps1.vidin.humidity = 99;
temps1.vidin.wind = {};
temps1.vidin.wind.speed = 1.8;
temps1.vidin.wind.deg = 30;
temps1.vidin.pressure = 1000.43;
temps1.vidin.ill = 15.3;

//}, pleven: 10.1, dobrich: 11.2, haskovo: 15.1, vidin: 6.6};

function LoadMoreDetails(futid, regNumber, devNumber, lat, lon, alt, loc)
{
    console.log(loc);
var surl = "http://api.openweathermap.org/data/2.5/weather";
    $.ajax({
    url: surl,
    type: 'GET',
    data: ({
        q: loc,
        units: 'metric',
        lang: 'bg',
    }),
      dataType: "jsonp",
      success: function(data){
          console.log(data);
date = temps1[loc];
//date.main.temp = temps[loc];

          $('#devNum').text('Device number: ' + devNumber);
          $('#details').html('Detailed information for: <strong>' + regNumber + '</strong>');
//parseFloat(data.main.temp).toFixed(1)
          var htmlData;
          /* htmlData = '<p>Weather: ' + data.weather[0].description + '</p>';
          htmlData += '<p id="temp">Temperature: ' + temps[loc]  + ' C</p>';
	  htmlData += '<p id="hum">Humidity: ' + data.main.humidity + ' %</p>';
          htmlData += '<p id="ill">Illuminance: 15 klx</p>';
          htmlData += '<p id="wspeed">Wind speed: ' + data.wind.speed + ' m/s</p>';
	  htmlData += '<p id="wdir">Wind direction: ' + parseInt(data.wind.deg) + ' degrees</p>';
	  htmlData += '<p>Rain: ' + 0 + ' mm</p>';
	  htmlData += '<p id="press">Pressure: ' + data.main.pressure + ' mm</p>';
	  htmlData += '<p>Latitude: ' + lat + '</p>';
          htmlData += '<p>Latitude: ' + lon + '</p>';
          htmlData += '<p>Altitude: ' + alt + '</p>'; */

          htmlData = '<p>Weather: ' + temps1[loc].weather + '</p>';
          htmlData += '<p id="temp">Temperature: ' + temps1[loc].temp  + ' C</p>';
	  htmlData += '<p id="hum">Humidity: ' + temps1[loc].humidity + ' %</p>';
          htmlData += '<p id="ill">Illuminance: ' + temps1[loc].ill + ' klx</p>';
          htmlData += '<p id="wspeed">Wind speed: ' + temps1[loc].wind.speed + ' m/s</p>';
	  htmlData += '<p id="wdir">Wind direction: ' + parseInt(temps1[loc].wind.deg) + ' degrees</p>';
	  htmlData += '<p>Rain: ' + 0 + ' mm</p>';
	  htmlData += '<p id="press">Pressure: ' + temps1[loc].pressure + ' mm</p>';
	  htmlData += '<p>Latitude: ' + lat + '</p>';
          htmlData += '<p>Latitude: ' + lon + '</p>';
          htmlData += '<p>Altitude: ' + alt + '</p>';

          $("#moreDetailDiv").html(htmlData).css(
          {
          'color':'white'
          });
          //300,365

          $('#moreDetailDivContainer').css('display','block').draggable({opacity:'0.3', containment:'window'});
          $('#detailClose').bind('click',function(){$('#moreDetailDivContainer').css('display','none')});
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log(textStatus);
      }
    });

	clearInterval(handle);
	handle = 0;

    //handle = setInterval(timmer, 1000);
handle = setInterval(timmer1, 5000, loc);
}

var maxPos = 0;
var maxId = 0;

function readJson(data){
	var geojson_format = new OpenLayers.Format.GeoJSON({
                'internalProjection': new OpenLayers.Projection("EPSG:900913"),
                'externalProjection': new OpenLayers.Projection("EPSG:4326")
            });
	   var features = geojson_format.read(data);
	   //alert(features.length + " " + olLayer.features.length);
        olLayer.removeAllFeatures();
        //alert(features.length + " " + olLayer.features.length);
	olLayer.addFeatures(features);
	olLayer.redraw();
fillList();
$('select').multiselect('refresh');
var currentdate = new Date();
var datetime = "Last Sync: " + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear() + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
$('#docs').text(datetime);
//.draggable({opacity:'0.3'})
$("[data-name='clickableImage']").die('click');
$("[data-name='smallMapImage']").die('click');

$( "#onlineList" ).load("http://85.130.111.122/aspx/service/sledaonline.asmx/GetOnlineListImems?" +
                    "&databaseServer=" + conn["server_name"] +
                    "&databaseName=" + conn["server_dbnm"] +
                    "&databasePort=" + conn["server_port"] +
                    "&databaseUID=" + conn["server_user"] +
                    "&databaseUPass=" + conn["server_pass"] +
                    "&programUID=" + conn["program_usr"] +
                    "&programPass=" + conn["program_psw"] +
                    "&groupFilter=" + groupFilter);

 $('#onlineListContainer').draggable({containment:'window',opacity:'0.3'})

                  $("[data-name='smallMapImage']").live("click", function()
                  {
                        var selected = olLayer.getFeaturesByAttribute('deviceId',$(this).data('id'));
                        var point = new OpenLayers.LonLat(selected[0].attributes.longitude, selected[0].attributes.latitude);
                        InitSmallMap($(this).data('id'), point, selected[0].attributes.loc);
                    });


                  $("[data-name='clickableImage']").live("click", function()
                  {
                        centerVehicle($(this).data('id'), $(this).data('location'));
                    });

//             var my_field = document.getElementById('search');
//             my_field.addEventListener("keyup", function (event) {
//                  if (event.keyCode == 13) {
//                      event.preventDefault();
//                      if (my_field.value.length != 0) {
//                          var id = $("#onlineList td:contains(" + my_field.value + ")").prev('td').children('img').data('id');
//                          centerVehicle(id);
//                          if ($('#showSmall').attr('checked') == 'checked')
//                          {
//                              var selected = olLayer.getFeaturesByAttribute('deviceId',id);
//                              var point = new OpenLayers.LonLat(selected[0].attributes.longitude, selected[0].attributes.latitude);
//                              InitSmallMap(id, point);
//                          }
//                          // Run my specific process with my_field.value
//                          my_field.value = '';
//                      }
//                  }
//              }, false);

              $('#center').bind('click', function(){
                var value = $('#search').val();
                var id = $("#onlineList td:contains(" + value + ")").prev('td').children('img').data('id');
		var loc = $("#onlineList td:contains(" + value + ")").prev('td').children('img').data('location');
                if (id != ''){
                    centerVehicle(id,loc);
                    if ($('#showSmall').attr('checked') == 'checked')
                    {
                        var selected = olLayer.getFeaturesByAttribute('deviceId',id);
                        var point = new OpenLayers.LonLat(selected[0].attributes.longitude, selected[0].attributes.latitude);
                        InitSmallMap(id, point, selected[0].attributes.loc);
                    }
                }
                $('#search').val('');
              });

	var maxSpeed,curMaxId,movingVhls;
	maxSpeed = 0;
	movingVhcls = 0;
	maxPos = 0;
	for (var i=features.length;i--;) {
          if(features[i].attributes.speed > maxSpeed){
            maxSpeed = features[i].attributes.speed;
            curMaxId = features[i].fid;
            maxPos = i;
          }
          if(features[i].attributes.speed > 0){
            movingVhcls += 1;
          }
     }
     $('#movedcar').text(movingVhcls);

     if (maxId != undefined && curMaxId == maxId)
     {
        if($('#container-' + maxId).size() > 0)
            return;
     }

     maxId = curMaxId;
     $('#maxspeedmom').text(features[maxPos].attributes.RegNumber + ' Speed: ' + features[maxPos].attributes.speed + ' km/h').css({'text-decoration':'underline', 'cursor':'pointer'})
     $('#maxspeedmom').data('id',maxId).bind('click', function(){
        var id = $(this).data('id');
        var selected = olLayer.getFeaturesByAttribute('deviceId',parseInt(id));
        var point = new OpenLayers.LonLat(selected[0].attributes.longitude, selected[0].attributes.latitude);
        InitSmallMap(id, point, selected[0].attributes.loc);
        $(this).css({'text-decoration':'none', 'cursor':'default'}).unbind('click');
     });
}

function centerVehicle(id, loc){
    feature = olLayer.getFeaturesByAttribute('deviceId',id);
    map.setCenter(
    new OpenLayers.LonLat(feature[0].attributes.longitude, feature[0].attributes.latitude).transform(
        new OpenLayers.Projection("EPSG:4326"),
        map.getProjectionObject()), 15);
        onFeatureSelect(feature[0]);
        if ($("#moreDetailDivContainer").css('display') == 'block')
        {
            LoadMoreDetails(id,feature[0].attributes.RegNumber,feature[0].attributes.name,feature[0].attributes.latitude, feature[0].attributes.longitude, feature[0].attributes.elevation, loc);
        }
}


function GetAddress(lat, lon)
{
    var point = new google.maps.LatLng(parseFloat(lat),parseFloat(lon));
    var geocoder = new google.maps.Geocoder;
    myAddress = '';
    geocoder.geocode({ 'latLng': point }, function(results, status)
    {
        if (status == google.maps.GeocoderStatus.OK)
        {
            if (results[0])
            {
                myAddress = results[0].formatted_address;
            }
            else if (results[1])
            {
                myAddress = results[1].formatted_address;
            }
            else if (results[2])
            {
                myAddress = results[2].formatted_address;
            }
            else
            {
                myAddress = '';
            }
        }
        else
        {
            myAddress = status;
        }
        $('#address').text(myAddress);
        popup.setSize(popup.contentSize);
        popup.updateSize();
    });
}

var w,h,groupFilter='empty';

function ResizeOnline()
{
    h = $(window).height();
    w = $(window).width();
    $("#map").css({'height': (h - 30) + 'px','width': w + 'px'});
    var online = $('#onlineListContainer');
    online.css('height',(h - 150) + 'px');
    if ($('#visualsettings').css('display') == 'none'){
        $('#onlineList').css('height',(online.height() - 30) + 'px');
    }else{
        $('#onlineList').css('height',(online.height() - 190) + 'px');
    }
    var morDets = $('#moreDetailDivContainer');
    $('#moreDetailDivContainer').css({ 'left':(w - 335) + 'px','top':(h - 330) + 'px' });
}

$(function() {

    ResizeOnline();

    $(window).resize(function(){
        ResizeOnline();
    });

$( "#vhcButton" ).click(function() {
  $( "#onlineListContainer" ).fadeToggle( "slow", "linear" );
});

    var el = $('.group');
    el.multiselect();

    var url = "http://85.130.111.122/aspx/service/sledaonline.asmx/GetGroupList?" +
                    "&databaseServer=" + conn["server_name"] +
                    "&databaseName=" + conn["server_dbnm"] +
                    "&databasePort=" + conn["server_port"] +
                    "&databaseUID=" + conn["server_user"] +
                    "&databaseUPass=" + conn["server_pass"] +
                    "&programUID=" + conn["program_usr"] +
                    "&programPass=" + conn["program_psw"];
//
    $.get(url, function(my_var)
    {
        // my_var contains whatever that request returned
        var k = $.parseJSON(my_var);
        $.each(k[0], function(key, valuee){
            opt = $('<option />', {
			    value: valuee,
			    text: key
		    });
			opt.attr('selected','selected');
		    opt.appendTo( el );
        });
     });
//
    init();

    $('#groups').bind('click', function(){
        var array_of_checked_values = $("select").multiselect("getChecked").map(function(){
           return this.value;
        }).get();
        if (array_of_checked_values.length > 0)
            groupFilter = '%20AND%20car.devicegroupn%20IN(' + array_of_checked_values.join(',') + ')';
        $.cookie('group',groupFilter);
        var protocol = new OpenLayers.Protocol.Script({
                url: "http://85.130.111.122/aspx/service/sledaonline.asmx/GetOnlineStatus",
               params: {
                    databaseServer: conn["server_name"],
                    databaseName: conn["server_dbnm"],
                    databasePort: conn["server_port"],
                    databaseUID: conn["server_user"],
                    databaseUPass: conn["server_pass"],
                    programUID: conn["program_usr"],
                    programPass: conn["program_psw"],
                    groupFilter: groupFilter
                }});
	     olLayer.protocol = protocol;
	     olLayer.refresh({force: true});
    });

    $('#visual').bind("click", function (){
        var visual = $('#visualsettings');
        visual.toggle();
            if (visual.css('display') == 'none'){
                $(this).attr('src','http://85.130.111.122/aspx/img/arrowdown.gif');
                $('#onlineList').css({'top':'35px', 'height':'461px'});
            }else{
                $(this).attr('src','http://85.130.111.122/aspx/img/arrowup.gif');
                $('#onlineList').css({'top':'195px', 'height':'301px'});
            }
        });
    $("#legend").bind("click", function (){
        $("#legendDiv").css({'top':'0px','left':'0px'}).position({ my: 'left top', at: 'right top+100', of: '#onlineListContainer' }).toggle();
    });

    $("input[name=style]:radio").bind('change', function()
    {
        if ($("input[data-rule = 1]:checked").length == 0)
            return;
        var st = $(this).val();
        if (st != ""){
            olLayer.styleMap.styles['default'].rules[1] = ruleDir;
            olLayer.styleMap.styles['default'].rotation = '\"${' + st + '}\"';
        }
        else
        {
            olLayer.styleMap.styles['default'].rules[1] = ruleMove;
            olLayer.styleMap.styles['default'].rotation = '';
        }
        if ($("input[id=labels]:checked").length > 0)
        {
            olLayer.styleMap.styles['default'].rules[1].symbolizer.label = "${RegNumber}";
        }
        else
        {
            olLayer.styleMap.styles['default'].rules[1].symbolizer.label = '';
        }
        olLayer.redraw();
    });

    $("input[id=labels]:checkbox").bind("click", function()
    {
        var status;
        if (this.checked)
        {
            status = "${RegNumber}";
        }
        else
        {
            status = '';
        }
        $('input[name=view]:checkbox').each(function(){
            if (this.checked)
            {
                olLayer.styleMap.styles['default'].rules[$(this).data('rule')].symbolizer.label = status;
            }
            else
            {
                olLayer.styleMap.styles['default'].rules[$(this).data('rule')].symbolizer.label = '';
            }
        });
        olLayer.redraw();
    });
    $(document).ajaxStart(function(){
    	//$('#load, .centered').css('display','block');
    });
     $(document).ajaxStop(function(){
        //$('#load, .centered').css('display','none');
    });
    $('body').ajaxStop(function(event,xhr,options){
	$("div:first", '.smallMap').each(function(){
                var id = $(this).attr('id');
                if(id != 0){
                   $('img[data\-id="' + id + '"][data\-name="smallMapImage"]').attr('src', 'http://85.130.111.122/aspx/Image/button/but_auto_press.png');
    		}
    	});
    });

    $("input[name=view]:checkbox").bind("click", function()
    {
        if ($("input[id=labels]:checked").length > 0)
        {
            olLayer.styleMap.styles['default'].rules[parseInt($(this).data('rule'))].symbolizer.label = "${RegNumber}";
        }
        else
        {
        olLayer.styleMap.styles['default'].rules[parseInt($(this).data('rule'))].symbolizer.label = '';
        }
        if (this.checked)
        {
            var st = $("input[name=style]:checked").val();
            if (parseInt($(this).data('rule')) == 1)
                if (st == "direction"){
                    olLayer.styleMap.styles['default'].rules[1].symbolizer.externalGraphic = 'http://85.130.111.122/aspx/img/dir.png';
                }
                else
                {
                    olLayer.styleMap.styles['default'].rules[parseInt($(this).data('rule'))].symbolizer.externalGraphic = "${icon}";
                }
            else
            {
                olLayer.styleMap.styles['default'].rules[parseInt($(this).data('rule'))].symbolizer.externalGraphic = 'http://85.130.111.122/aspx/img/' + $(this).data('stat') + '.png';
            }
        }
        else
        {
            olLayer.styleMap.styles['default'].rules[parseInt($(this).data('rule'))].symbolizer.externalGraphic = '';
            olLayer.styleMap.styles['default'].rules[parseInt($(this).data('rule'))].symbolizer.label = '';
        }

        olLayer.redraw();
    });
});





//START SMALL DIV
var Dragger = "var eve=arguments.length?arguments[0]:event;" +
			  "Drag.ox=eve.clientX-this.offsetLeft;" +
			  "Drag.oy=eve.clientY-this.offsetTop;" +
			  "this.fire=Drag.fire;this.fire();false;";
var Drag = {
    ox: 0, oy: 0,
    minx: null, maxx: null, miny: null, maxy: null,
    mode: 0,
    affine: null,
    initer: null,

    init: function(node, mode, minx, miny, maxx, maxy) {
        var retstr = "with(Drag) mode=" + mode + ",minx=" + minx + ",maxx=" + maxx
  			+ ",miny=" + miny + ",maxy=" + maxy + ";Drag.initer=1;" + Dragger;
        node.onmousedown = new Function("e", "return eval(\"" + retstr + "\")");
        return (Drag.initer = retstr);
    },
    add: function(node) { node.out = Drag.out; node.out(null); },
    fire: function() {
        var that = this;
        that.run = Drag.run;
        that.out = Drag.out;
        that.style.position = "absolute";
        that.onmousedown = null;
        that.onmouseup = function(e) { return that.out(e); };
        document.onmouseup = function(e) { return that.out(e); };
        document.onmousemove = function(e) { return that.run(e); };
        document.onmouseout = function(e) {
            var eve = e ? e : event;
            if (!eve.fromElement)
                eve.fromElement = eve.target, eve.toElement = eve.relatedTarget;
            if (!eve.toElement) that.out(e); return false;
        }; return false;
    },
    run: function(e) {
        var eve = e ? e : event;
        var nx = eve.clientX - Drag.ox - 30;
        var ny = eve.clientY - Drag.oy - 50;
        with (Drag) {
            if (minx) if (nx < minx) nx = minx;
            if (maxx) if (nx > maxx) nx = maxx;
            if (miny) if (ny < miny) ny = miny;
            if (maxy) if (ny > maxy) ny = maxy;
        } if (this.parentNode.style.position == "absolute") {
            nx = nx - this.parentNode.offsetLeft;
            ny = ny - this.parentNode.offsetTop;
        }
        if (Drag.mode < 2) this.style.left = nx + "px";
        if (!(Drag.mode % 2)) this.style.top = ny + "px";
        if (Drag.mode == 3 && Drag.affine)
            Drag.affine(this, nx, ny);
        return false;
    },

    out: function(e) {
        var invoker = null;
        document.onmousemove = null;
        document.onmouseup = null;
        document.onmouseout = null;
        this.onmouseup = null;
        with (Drag) { invoker = mode + "," + minx + "," + miny + "," + maxx + "," + maxy; }
        this.onmousedown = new Function("e", "return eval("
  			+ (Drag.initer ? "Drag.init(this," + invoker + ")" : "Dragger") + ")");
        with (Drag) { mode = 0, minx = null, maxx = null, miny = null, maxy = null; initer = null }
        return false;
    }
};

//new drag function for google chrom working :(
function Browser() {

    var ua, s, i;

    this.isIE = false;
    this.isNS = false;
    this.version = null;

    ua = navigator.userAgent;

    s = "MSIE";
    if ((i = ua.indexOf(s)) >= 0) {
        this.isIE = true;
        this.version = parseFloat(ua.substr(i + s.length));
        return;
    }

    s = "Netscape6/";
    if ((i = ua.indexOf(s)) >= 0) {
        this.isNS = true;
        this.version = parseFloat(ua.substr(i + s.length));
        return;
    }

    // Treat any other "Gecko" browser as NS 6.1.

    s = "Gecko";
    if ((i = ua.indexOf(s)) >= 0) {
        this.isNS = true;
        this.version = 6.1;
        return;
    }
}

var browser = new Browser();

// Global object to hold drag information.

var dragObj = new Object();
dragObj.zIndex = 0;

function dragStart(event, id) {

    var el;
    var x, y;

    // If an element id was given, find it. Otherwise use the element being
    // clicked on.

    if (id)
        dragObj.elNode = document.getElementById(id);
    else {
        if (browser.isIE)
            dragObj.elNode = window.event.srcElement;
        if (browser.isNS)
            dragObj.elNode = event.target;

        // If this is a text node, use its parent element.

        if (dragObj.elNode.nodeType == 3)
            dragObj.elNode = dragObj.elNode.parentNode;
    }

    // Get cursor position with respect to the page.

    if (browser.isIE) {
        x = window.event.clientX + document.documentElement.scrollLeft
        + document.body.scrollLeft;
        y = window.event.clientY + document.documentElement.scrollTop
        + document.body.scrollTop;
    }
    if (browser.isNS) {
        x = event.clientX + window.scrollX;
        y = event.clientY + window.scrollY;
    }
    // Save starting positions of cursor and element.

    dragObj.cursorStartX = x;
    dragObj.cursorStartY = y;
    dragObj.elStartLeft = parseInt(dragObj.elNode.style.left, 10);
    dragObj.elStartTop = parseInt(dragObj.elNode.style.top, 10);

    if (isNaN(dragObj.elStartLeft)) dragObj.elStartLeft = 0;
    if (isNaN(dragObj.elStartTop)) dragObj.elStartTop = 0;

    // Update element's z-index.

    dragObj.elNode.style.zIndex += dragObj.zIndex;

    // Capture mousemove and mouseup events on the page.

    if (browser.isIE) {
        document.attachEvent("onmousemove", dragGo);
        document.attachEvent("onmouseup", dragStop);
        window.event.cancelBubble = true;
        window.event.returnValue = false;
    }
    if (browser.isNS) {
        document.addEventListener("mousemove", dragGo, true);
        document.addEventListener("mouseup", dragStop, true);
        event.preventDefault();
    }
}

function dragGo(event) {

    var x, y;

    // Get cursor position with respect to the page.

    if (browser.isIE) {
        x = window.event.clientX + document.documentElement.scrollLeft
        + document.body.scrollLeft;
        y = window.event.clientY + document.documentElement.scrollTop
        + document.body.scrollTop;
    }
    if (browser.isNS) {
        x = event.clientX + window.scrollX;
        y = event.clientY + window.scrollY;
    }

    // Move drag element by the same amount the cursor has moved.

    dragObj.elNode.style.left = (dragObj.elStartLeft + x - dragObj.cursorStartX) + "px";
    dragObj.elNode.style.top = (dragObj.elStartTop + y - dragObj.cursorStartY) + "px";

    if (browser.isIE) {
        window.event.cancelBubble = true;
        window.event.returnValue = false;
    }
    if (browser.isNS)
        event.preventDefault();
}

function dragStop(event) {

    // Stop capturing mousemove and mouseup events.

    if (browser.isIE) {
        document.detachEvent("onmousemove", dragGo);
        document.detachEvent("onmouseup", dragStop);
    }
    if (browser.isNS) {
        document.removeEventListener("mousemove", dragGo, true);
        document.removeEventListener("mouseup", dragStop, true);
    }
}

//End of drag script for chrom :(




////Drag declaration


var smallX, smallY;
smallX = 340;
smallY = 0;


var ids = {};


function InitSmallMap(id, point, locc) {
console.log(locc);
ids[id] = locc;
    if (vehicles[id] != undefined) {
        $('#container-' + id).remove();
        $('img[data\-id="' + id + '"][data\-name="smallMapImage"]').attr('src', 'http://85.130.111.122/aspx/Image/button/but_max.png');
        vehicles[id].destroy();
        vehicles[id] = undefined;
        return;
    }

    cloneDiv(id);

    vehicles[id] = new OpenLayers.Map({ div: '$index'.replace('$index', id),
        eventListeners: {
            featureclick: function(e) {
                LoadMoreDetails(e.feature.fid,e.feature.attributes.RegNumber, e.feature.attributes.name, e.feature.attributes.latitude, e.feature.attributes.longitude, e.feature.attributes.elevation, e.feature.attributes.loc);
            }
        }
    });
    var osm = new OpenLayers.Layer.OSM();
    var gmaps = new OpenLayers.Layer.Google(
                "Google Streets", // the default
                {numZoomLevels: 20 }
            );
    var gmaph = new OpenLayers.Layer.Google(
                "Google Hybrid",
                { type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20 }
            );

                //new OpenLayers.LonLat(15.2, 45.9)
    vehicles[id].addLayers([osm, gmaps, gmaph]);


    vehicles[id].setCenter(
        point.transform(
            new OpenLayers.Projection("EPSG:4326"),
            vehicles[id].getProjectionObject()
        ),
        15
    );

    var bouds = vehicles[id].getExtent().transform(new OpenLayers.Projection("EPSG:900913"), vehicles[id].projection);

    var curl = 'http://85.130.111.122/aspx/service/sledaonline.asmx/GetVehiclePositionInBox?' +
                    'databaseName=' + conn["server_dbnm"] +
                    '&databaseServer=' + conn["server_name"] +
                    '&databasePort=' + conn["server_port"] +
                    '&databaseUID=' + conn["server_user"] +
                    '&databaseUPass=' + conn["server_pass"] +
                    '&programUID=' + conn["program_usr"] +
                    '&programPass=' + conn["program_psw"] + '&id=' + id + '&left=' + bouds.left + '&right=' + bouds.right + '&bottom=' + bouds.bottom + '&top=' + bouds.top + '&groupFilter=' + groupFilter;

    var filterMove = new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.EQUAL_TO,
        property: "statut",
        value: 0
    });
    ruleMove = new OpenLayers.Rule({
        filter: filterMove,
        symbolizer: {
                    externalGraphic: "${icon}",
                    graphicWidth: 32,
                    graphicHeight: 32,
                    graphicYOffset: -16,
                    graphicXOffset: -16,
                    labelXOffset: 0,
                    labelYOffset: -30
        }
    });

    var filterStop = new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.EQUAL_TO,
        property: "statut",
        value: 1
    });
    var filterNoGps = new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.EQUAL_TO,
        property: "statut", // the "foo" feature attribute
        value: 2
    });
    var filterNoGpsAnt = new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.EQUAL_TO,
        property: "statut", // the "foo" feature attribute
        value: 3
    });
    var filterNoGprs = new OpenLayers.Filter.Comparison({
        type: OpenLayers.Filter.Comparison.EQUAL_TO,
        property: "statut", // the "foo" feature attribute
        value: 4
    });



    //////Add Remove labels !!!!!!!!!!!!!!!!!!!!!!!!
    ////olLayer.styleMap.styles.default.defaultStyle.label = '${RegNumber}';
    ////olLayer.redraw();



    var smallStyle = new OpenLayers.Style(
    // the first argument is a base symbolizer
    // all other symbolizers in rules will extend this one
        {
        // shift graphic up 28 pixels
        label: "${RegNumber}", // label will be foo attribute value
        fill: "true",
        fillColor: "#000000",
        fillOpacity: 0.9,
        strokeColor: "#000000",
        strokeWidth: 1,
        strokeDashstyle: "dash",
        labelAlign: "cc",
        fontColor: "#000000",
        fontOpacity: 0.9,
        fontFamily: "Arial",
        fontSize: 10,
        cursor: "pointer",
        graphicWidth: 16,
        graphicHeight: 16,
        graphicYOffset: -8,
        graphicXOffset: -8,
        labelXOffset: 0,
        labelYOffset: -20
    },
    // the second argument will include all rules
        {
        rules: [

		new OpenLayers.Rule({
		    filter: filterStop,
		    symbolizer: { externalGraphic: "http://85.130.111.122/aspx/img/stopped.png" }
		}),
                    ruleMove
		          ,
        new OpenLayers.Rule({
            filter: filterNoGpsAnt,
            symbolizer: { rotation: "", externalGraphic: "http://85.130.111.122/aspx/img/nogpsant.png" }
        }),
		new OpenLayers.Rule({
		    filter: filterNoGps,
		    symbolizer: { externalGraphic: "http://85.130.111.122/aspx/img/nogps.png" }
		}),
		new OpenLayers.Rule({
		    filter: filterNoGprs,
		    symbolizer: { externalGraphic: "http://85.130.111.122/aspx/img/nogprs.png" }
		})

        //                new OpenLayers.Rule({
        //                   // apply this rule if no others apply
        //                   elseFilter: true,
        //                   symbolizer: {
        //                        externalGraphic: "../img/north-mini.png"
        //                    }
        //                })
            ]
    }
    );

    var olLayerSmall = new OpenLayers.Layer.Vector("Vectors", {
            projection: new OpenLayers.Projection("EPSG:4326"),
            strategies: [new OpenLayers.Strategy.BBOX(), new OpenLayers.Strategy.Refresh({interval: 5000, force: true})],
            protocol: new OpenLayers.Protocol.Script({
                url: curl,
                format: new OpenLayers.Format.JSON({
                'internalProjection': new OpenLayers.Projection("EPSG:900913"),
                'externalProjection': new OpenLayers.Projection("EPSG:4326")
                })
            }),
            styleMap: new OpenLayers.StyleMap(smallStyle)
	    });


	    vehicles[id].addLayers([olLayerSmall]);

	    vehicles[id].events.register("moveend", vehicles[id], function() {
	 var bouds = vehicles[id].getExtent().transform(new OpenLayers.Projection("EPSG:900913"), vehicles[id].projection);
    var curl = 'http://85.130.111.122/aspx/service/sledaonline.asmx/GetVehiclePositionInBox?' +
                    'databaseName=' + conn["server_dbnm"] +
                    '&databaseServer=' + conn["server_name"] +
                    '&databasePort=' + conn["server_port"] +
                    '&databaseUID=' + conn["server_user"] +
                    '&databaseUPass=' + conn["server_pass"] +
                    '&programUID=' + conn["program_usr"] +
                    '&programPass=' + conn["program_psw"] + '&id=' + id + '&left=' + bouds.left + '&right=' + bouds.right + '&bottom=' + bouds.bottom + '&top=' + bouds.top + '&groupFilter=' + groupFilter;
	        var protocol = new OpenLayers.Protocol.Script({url: curl});

	        vehicles[id].layers[3].protocol = protocol;
	        vehicles[id].layers[3].refresh();
	    });

	    vehicles[id].addControl(new OpenLayers.Control.LayerSwitcher());
};

var k;
function readSmallJson(id, data) {
    $('#smallMapDetails', '#container-' + id).html('');
var geojson_format = new OpenLayers.Format.GeoJSON({
        'internalProjection': new OpenLayers.Projection("EPSG:900913"),
        'externalProjection': new OpenLayers.Projection("EPSG:4326")
    });
    var features = geojson_format.read(data);
    vehicles[id].layers[3].removeAllFeatures();
    vehicles[id].layers[3].addFeatures(features);
    var feature = vehicles[id].layers[3].getFeaturesByAttribute('deviceId', id);
    vehicles[id].setCenter
    (
     new OpenLayers.LonLat(feature[0].attributes.longitude, feature[0].attributes.latitude).transform(
                            new OpenLayers.Projection("EPSG:4326"),
                            vehicles[id].getProjectionObject()), vehicles[id].getZoom()
     );


    var url = 'http://85.130.111.122/aspx/service/sledaonline.asmx/GetVehicleInBoxDetails?' +
                    'databaseName=' + conn["server_dbnm"] +
                    '&databaseServer=' + conn["server_name"] +
                    '&databasePort=' + conn["server_port"] +
                    '&databaseUID=' + conn["server_user"] +
                    '&databaseUPass=' + conn["server_pass"] +
                    '&programUID=' + conn["program_usr"] +
                    '&programPass=' + conn["program_psw"] + '&id=' + id;

    $.get(url, function(my_var) {
        // my_var contains whatever that request returned
        k = $.parseJSON(my_var);
        $('p', '#container-' + id).text(k[0].reg + ": " + k[0].model + '(' + k[0].Number_Device + ')');

        var speed, intP, extP, alt;
        if (k[0].Speed == undefined) {
            speed = 0;
        }
        else {
            speed = k[0].Speed;
        }
        //k[0].max_speed
        if (speed > k[0].max_speed) {
            if ($('.overSpeed', '#container-' + id).size() == 0) {
               // $('#container-' + id).append('<p class="overSpeed"></p>');
            }
            $('.overSpeed', '#container-' + id).text(speed).css({ 'color': 'black', 'font-size': '25px', 'z-index': id + 1 }).position({ my: 'left bottom', at: 'left+10 bottom-10', of: '#' + id });
        }
        else {
            if ($('.overSpeed', '#container-' + id).size() > 0) {
                //$('.overSpeed', '#container-' + id).remove();
            }
        }

        if (k[0].rezerv2 == undefined) {
            intP = 0;
        }
        else {
            intP = k[0].rezerv2;
        }
        if (k[0].rezerv3 == undefined) {
            extP = 0;
        }
        else {
            extP = k[0].rezerv3;
        }
        if (k[0].C_Z == undefined) {
            alt = 0;
        }
        else {
            alt = k[0].C_Z;
        }

var surl = "http://api.openweathermap.org/data/2.5/weather";
    $.ajax({
    url: surl,
    type: 'GET',
    data: ({
        q: ids[id],
        units: 'metric',
        lang: 'bg',
    }),
      dataType: "jsonp",
      success: function(data){
          console.log(data);
          var htmlData;

             var hum = temps1[ids[id]].humidity + (Math.floor(Math.random() * 3) + 1);
   if (parseInt(hum) > 100) {
       hum = 99;
   }

          htmlData = '<p>Weather: ' + temps1[ids[id]].weather + '</p>';
          htmlData += '<p id="temp">Temperature: ' + parseFloat(temps1[ids[id]].temp + Math.random() / 2).toFixed(1)  + ' C</p>';
	  htmlData += '<p id="hum">Humidity: ' + hum + ' %</p>';
          //htmlData += '<p id="ill">Illuminance: 15 klx</p>';
          htmlData += '<p id="wspeed">Wind speed: ' + parseFloat(temps1[ids[id]].wind.speed + Math.random()).toFixed(2) + ' m/s</p>';
	  //htmlData += '<p id="wdir">Wind direction: ' + parseInt(data.wind.deg) + ' degrees</p>';
	  //htmlData += '<p>Rain: ' + 0 + ' mm</p>';
	  //htmlData += '<p id="press">Pressure: ' + data.main.pressure + ' mm</p>';
	  //htmlData += '<p>Latitude: ' + lat + '</p>';
          //htmlData += '<p>Latitude: ' + lon + '</p>';
          //htmlData += '<p>Altitude: ' + alt + '</p>';

$('#smallMapDetails', '#container-' + id).html(htmlData);

      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log(textStatus);
      }
    });


        $('table', '#container-' + id).position({ my: 'left bottom', at: 'left+1 bottom-1', of: '#container-' + id });
        var inputs = "";
        for (var name in k[0]) {
            if (name.indexOf('I_') >= 0) {
                inputs = inputs + '<span class="smallInput" style="color: #00008B; font-weight: bold;">' + name + ": " + k[0][name] + "</span>";
            }
        }
        if (inputs != '') {
            if ($('#smallInputContainer-' + id, '#container-' + id).size() == 0) {
                $('#container-' + id).append('<span class="smallInputContainer" id="smallInputContainer-' + id + '"></span>');
                $('#smallInputContainer-' + id, '#container-' + id).css({ 'z-index': id + 2 }).position({ my: 'left top', at: 'right top+11', of: '#' + id });

                $('#container-' + id).append('<span id="inp' + id + '" class="hideinputs">hide<br>INPUTS</span>');
                $('#inp' + id).css({ 'font-size': '10px', 'position': 'absolute', 'z-index': id + 5 }).position({ my: 'right-5 top', at: 'right top+17', of: '#container-' + id });
                $('#inp' + id).bind('click', function() {
                    $('#smallInputContainer-' + id).fadeToggle("slow", "linear");
                    $('#inp' + id).toggleClass("showinputs");
                    if ($('#inp' + id).html() == 'show<br>INPUTS')
                    {
                        $('#inp' + id).html('hide<br>INPUTS')
                    }
                    else
                    {
                        $('#inp' + id).html('show<br>INPUTS')
                    }
                });
            }
            $('#smallInputContainer-' + id, '#container-' + id).html(inputs);
        }
    });
};


function cloneDiv(id) {
    var clon = $("#container").clone();
    clon.attr('id', 'container-' + id);
    $("div:first", clon).attr({ 'id': id, 'z-index': id });
    clon.css('display', 'block');

    clon.insertBefore('#map');

    if ($.browser.opera)
    {
        clon.draggable({ opacity: 0.7 });
    }
    else
    {
        clon.mousedown(function(event) {
                dragStart(event, 'container-' + id);
        });
    }



    var offset = 'left+' + smallX + ' top+' + smallY;
    $("#container-" + id).position({ my: 'left top', at: offset, of: "#map" });
    $('span:first', clon).bind('click', function() {
        $('#container-' + id).remove();
        $('img[data\-id="' + id + '"][data\-name="smallMapImage"]').attr('src', 'http://85.130.111.122/aspx/Image/button/but_max.png');
        vehicles[id].destroy();
        vehicles[id] = undefined;
    });
    $('span:first', clon).position({ my: 'right top', at: 'right-1 top', of: '#container-' + id });
    smallX += 20;
    smallY += 20;

    if (smallX > 540)
        smallX = 340;
    if (smallY > 200)
        smallY = 0;
}

