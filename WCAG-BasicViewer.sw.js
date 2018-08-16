/*
 Copyright 2014 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// This polyfill provides Cache.add(), Cache.addAll(), and CacheStorage.match(),
// which are not implemented in Chrome 40.
importScripts('./serviceworker-cache-polyfill.js');

// While overkill for this specific sample in which there is only one cache,
// this is one best practice that can be followed in general to keep track of
// multiple caches used by a given service worker, and keep them all versioned.
// It maps a shorthand identifier for a cache to a specific, versioned cache name.

// Note that since global state is discarded in between service worker restarts, these
// variables will be reinitialized each time the service worker handles an event, and you
// should not attempt to change their values inside an event handler. (Treat them as constants.)

// If at any point you want to force pages that use this service worker to start using a fresh
// cache, then increment the CACHE_VERSION value. It will kick off the service worker update
// flow and the old cache(s) will be purged as part of the activate event handler when the
// updated service worker is activated.
var CACHE_VERSION = 1;
var CURRENT_CACHES = {
    prefetch: 'WCAG-BasicViewer-cache-v' + CACHE_VERSION
    // offline: 'WCAG-BasicViewer-offline-v' + CACHE_VERSION
};

self.addEventListener('install', function(event) {
    var now = Date.now();

    var urlsToPrefetch = [
        './index.html',
        './js/LayerManager/Templates/LayerManager.html',
        './js/NavToolBar/Templates/NavToolBar.html',
        './js/PopupInfo/Templates/PopupInfo.html',
        './js/FeatureList/Templates/FeatureList.html',
        './js/FeatureList/FeatureListItem.js',
        './js/ImageToggleButton/Templates/ImageToggleButton.html',
        './js/FeatureList/Templates/FeatureListTemplate.html',
        './js/GeoCoding/Templates/GeoCodingHeader.html',
        './js/TableOfContents/Templates/TableOfContents.html',
        './js/GeoCoding/Templates/GeoCoding.html',
        './js/GeoCoding/Templates/GeoAddressTooltip.html',
        './js/Filters/Templates/Filters.html',
        './js/Filters/Templates/FilterTab.html',
        './js/Filters/Templates/FilterItem.html',
        './js/Filters/Templates/FilterString.html',
        './js/Filters/Templates/FilterDate.html',
        './js/Filters/Templates/FilterNumber.html',
        './js/LanguageSelect/Templates/LanguageSelect.html',
        './js/LanguageSelect/Templates/LanguageSelectDDB.html',
        './js/ContactUs/Templates/ContactUs.html',
        './js/PopupInfo/Templates/PopupInfoHeader.html',
        './js/DirectionsWidget/Templates/DirectionsHeader.html',
        './js/dijit/templates/ShareDialog.html',
        './js/dijit/templates/instructions.html',
        './js/dijit/templates/instructions.french.html',

        './js/main.js',
        './js/template.js',
        './js/ShareDialog.js',
        './js/utils.js',
        './js/toolbar.js',
        './js/has-config.js',
        './js/LayerManager/LayerManager.js',
        './js/SuperNavigator/SuperNavigator.js',
        './js/NavToolBar/NavToolBar.js',
        './js/PopupInfo/PopupInfo.js',
        './js/GeoCoding/GeoCoding.js',
        './js/GeoCoding/GeoAddressTooltip.js',
        './js/ImageToggleButton/ImageToggleButton.js',
        './js/FeatureList/FeatureList.js',
        './js/Filters/Filters.js',
        './js/Filters/FilterTab.js',
        './js/Filters/FilterItem.js',
        './js/Filters/FilterString.js',
        './js/Filters/FilterDate.js',
        './js/Filters/FilterNumber.js',
        './js/TableOfContents/TableOfContents.js',
        './js/DirectionsWidget/DirectionsWidget.js',
        './js/DirectionsWidget/DirectionsHeader.js',
        './js/LanguageSelect/LanguageSelect.js',
        './js/LanguageSelect/LanguageSelectDDB.js',
        './js/ContactUs/ContactUs.js',
        './js/ShowFeatureTable/ShowFeatureTable.js',
        './js/ShowBasemapGallery/ShowBasemapGallery.js',
        './js/PopupInfo/PopupInfoHeader.js',
        './js/GeoCoding/GeoCodingHeader.js',

        './config/defaults.js',
        './config/templateConfig.js',

        './js/nls/resources.js',
        './js/nls/BaseMapLabels.js',
        './js/nls/LayerManager.js',
        './js/nls/NavToolBar.js',
        './js/nls/PopupInfo.js',
        './js/nls/FeatureList.js',
        './js/nls/ShareDialog.js',
        './js/nls/TableOfContents.js',
        './js/nls/DirectionsWidget.js',
        './js/nls/ShowFeatureTable.js',
        './js/nls/FilterDialog.js',
        './js/nls/LanguageSelect.js',

        './js/nls/fr/resources.js',
        './js/nls/fr/BaseMapLabels.js',
        './js/nls/fr/LayerManager.js',
        './js/nls/fr/NavToolBar.js',
        './js/nls/fr/PopupInfo.js',
        './js/nls/fr/FeatureList.js',
        './js/nls/fr/ShareDialog.js',
        './js/nls/fr/TableOfContents.js',
        './js/nls/fr/DirectionsWidget.js',
        './js/nls/fr/ShowFeatureTable.js',
        './js/nls/fr/FilterDialog.js',
        './js/nls/fr/LanguageSelect.js',

        './css/styles.css',
        './css/styles1.css',
        './css/filters.css',
        './css/tabs.css',
        './js/LanguageSelect/Templates/LanguageSelect.css',
        './js/LayerManager/Templates/Slider.css',
        './js/LayerManager/Templates/LayerManager.css',
        './js/ImageToggleButton/Templates/ImageToggleButton.css',
        './js/ShowBasemapGallery/Templates/ShowBasemapGallery.css',
        './js/ShowFeatureTable/Templates/ShowFeatureTable.css',
        './js/DirectionsWidget/Templates/DirectionWidget.css',
        './js/PopupInfo/Templates/popupInfo.css',
        './js/GeoCoding/Templates/geoCoding.css',
        './js/FeatureList/Templates/FeatureList.css',
        './js/TableOfContents/Templates/TableOfContents.css',

        './images/reload1.gif',
        './images/reload3.gif',
        './images/flag.ca.22.png',
        './images/flag.qc.22.png',
        './images/flag.uk.22.png',
        './images/logo.png',
        './images/downArrow.png',
        './images/searchClear.png',
        './images/searchZoom.png',
        './images/Table.png',
        './images/followTheMapMode.png',
        './images/featureSelected.png',
        './images/someFilters.png',
        './images/area_measure.png',
        './images/dist_measure.png',
        './images/dist_point.png',
        './images/upDown.18.png',
        './images/genericThumbMap.png',
        './images/error.png',
        './images/Flag/Azure.48.png',
        './images/Flag/Pink.48.png',
        './images/ripple-dot1.gif',

        './images/icons_white/infoPanel.png',
        './images/icons_white/directions.png',
        './images/icons_white/overview.png',
        './images/icons_white/details.png',
        './images/icons_white/left.png',
        './images/icons_white/plus.png',
        './images/icons_white/minus.png',
        './images/icons_white/home.png',
        './images/icons_white/down.png',
        './images/icons_white/up.png',
        './images/icons_white/right.png',
        './images/icons_white/prev.png',
        './images/icons_white/locate.png',
        './images/icons_white/next.png',
        './images/icons_white/ZoomPlus.png',
        './images/icons_white/ZoomMinus.png',
        './images/icons_white/layerManager.png',
        './images/icons_white/Reverse.png',
        './images/icons_white/Barriere.png',
        './images/icons_white/AddStop.png',
        './images/icons_white/optimize1.png',
        './images/icons_white/print.png',
        './images/icons_white/searchClear.png',
        './images/icons_white/downArrow.png',
        './images/icons_white/ToMap.png',
        './images/icons_white/geoCoding.png',
        './images/icons_white/geoCoding.png',
        './images/icons_white/TooltipBtn1.png',
        './images/icons_white/filter.png',
        './images/icons_white/measure.png',
        './images/icons_white/features.png',
        './images/icons_white/share.png',
        './images/icons_white/bookmarks.png',
        './images/icons_white/up.png',
        './images/icons_white/down.png',
        './images/icons_white/searchClear.png',
        './images/icons_white/carret-down.32.png',
        './images/icons_white/downArrow.png',
        './images/icons_white/edit.png',
        './images/icons_white/ByRectangle.36.png',
        './images/icons_white/ByPolygon.36.png',
        './images/icons_white/ByView.36.png',
        './images/icons_white/layers.png',
        './images/icons_white/legend.png',
        './images/icons_white/basemap.png',

        './images/icons_black/infoPanel.png',
        './images/icons_black/directions.png',
        './images/icons_black/overview.png',
        './images/icons_black/details.png',
        './images/icons_black/left.png',
        './images/icons_black/plus.png',
        './images/icons_black/minus.png',
        './images/icons_black/home.png',
        './images/icons_black/down.png',
        './images/icons_black/up.png',
        './images/icons_black/right.png',
        './images/icons_black/prev.png',
        './images/icons_black/locate.png',
        './images/icons_black/next.png',
        './images/icons_black/ZoomPlus.png',
        './images/icons_black/ZoomMinus.png',
        './images/icons_black/layerManager.png',
        './images/icons_black/Reverse.png',
        './images/icons_black/Barriere.png',
        './images/icons_black/AddStop.png',
        './images/icons_black/optimize1.png',
        './images/icons_black/print.png',
        './images/icons_black/searchClear.png',
        './images/icons_black/downArrow.png',
        './images/icons_black/ToMap.png',
        './images/icons_black/geoCoding.png',
        './images/icons_black/geoCoding.png',
        './images/icons_black/TooltipBtn1.png',
        './images/icons_black/filter.png',
        './images/icons_black/measure.png',
        './images/icons_black/features.png',
        './images/icons_black/share.png',
        './images/icons_black/bookmarks.png',
        './images/icons_black/Table.png',
        './images/icons_black/TableClose.Red.png',
        './images/icons_black/up.png',
        './images/icons_black/down.png',
        './images/icons_black/searchClear.png',
        './images/icons_black/carret-down.32.png',
        './images/icons_black/downArrow.png',
        './images/icons_black/edit.png',
        './images/icons_black/ByRectangle.36.png',
        './images/icons_black/ByPolygon.36.png',
        './images/icons_black/ByView.36.png',
        './images/icons_black/Columns.32.png',
        './images/icons_black/layers.png',
        './images/icons_black/legend.png',
        './images/icons_black/basemap.png',

        './images/grayCircle.png',
        './images/grayCircleDrag.png',
        './images/greenPoint.png',
        './images/greenPointDrag.png',
        './images/bluePoint.png',
        './images/bluePointDrag.png',
        './images/redPoint.png',
        './images/redPointDrag.png',

        './images//share-link.png',
        './images//share-facebook.png',
        './images//share-twitter.png',
        './images//share-gplus.png',
        './images//share-email.png',

    ];

    // All of these logging statements should be visible via the "Inspect" interface
    // for the relevant SW accessed via chrome://serviceworker-internals
    // console.log('Handling install event. Resources to prefetch:', urlsToPrefetch);

    event.waitUntil(
        caches.open(CURRENT_CACHES.prefetch).then(function(cache) {
            var cachePromises = urlsToPrefetch.map(function(urlToPrefetch) {
                // This constructs a new URL object using the service worker's script location as the base
                // for relative URLs.
                var url = new URL(urlToPrefetch, location.href);
                // Append a cache-bust=TIMESTAMP URL parameter to each URL's query string.
                // This is particularly important when precaching resources that are later used in the
                // fetch handler as responses directly, without consulting the network (i.e. cache-first).
                // If we were to get back a response from the HTTP browser cache for this precaching request
                // then that stale response would be used indefinitely, or at least until the next time
                // the service worker script changes triggering the install flow.
                url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;

                // It's very important to use {mode: 'no-cors'} if there is any chance that
                // the resources being fetched are served off of a server that doesn't support
                // CORS (http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).
                // In this example, www.chromium.org doesn't support CORS, and the fetch()
                // would fail if the default mode of 'cors' was used for the fetch() request.
                // The drawback of hardcoding {mode: 'no-cors'} is that the response from all
                // cross-origin hosts will always be opaque
                // (https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#cross-origin-resources)
                // and it is not possible to determine whether an opaque response represents a success or failure
                // (https://github.com/whatwg/fetch/issues/14).
                var request = new Request(url, {
                    mode: 'no-cors'
                });
                return fetch(request).then(function(response) {
                    if (response.status >= 400) {
                        throw new Error('request for ' + urlToPrefetch +
                            ' failed with status ' + response.statusText);
                    }

                    // Use the original URL without the cache-busting parameter as the key for cache.put().
                    return cache.put(urlToPrefetch, response);
                }).catch(function(error) {
                    console.error('Not caching ' + urlToPrefetch + ' due to ' + error);
                });
            });

            return Promise.all(cachePromises).then(function() {
                console.log('Pre-fetching complete.');
            });
        }).catch(function(error) {
            console.error('Pre-fetching failed:', error);
        })
    );
});

self.addEventListener('activate', function(event) {
    // Delete all caches that aren't named in CURRENT_CACHES.
    // While there is only one cache in this example, the same logic will handle the case where
    // there are multiple versioned caches.
    var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function(key) {
        return CURRENT_CACHES[key];
    });

    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (expectedCacheNames.indexOf(cacheName) === -1) {
                        // If this cache name isn't present in the array of "expected" cache names, then delete it.
                        console.log('Deleting out of date cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    // console.log('Handling fetch event for', event.request.url);

    event.respondWith(
        // caches.match() will look for a cache entry in all of the caches available to the service worker.
        // It's an alternative to first opening a specific named cache and then matching on that.
        caches.match(event.request).then(function(response) {
            if (response) {
                // console.log('Found response in cache:', response);

                return response;
            }

            // console.log('No response found in cache. About to fetch from network...');

            // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't
            // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.
            const newRequest = new Request((event.request.url.startsWith('http:') && location.protocol==='https:') ? event.request.url.replace(/http:/, 'https:') : event.request);
            // console.log('newRequest', newRequest.url, newRequest)
            return fetch(newRequest).then(function(response) {
                if (response.type !== 'opaque' && response.type !== 'cors') {
                    console.log('Response from network is:', response.type, response);
                }

                return response;
            }).catch(function(error) {
                // This catch() will handle exceptions thrown from the fetch() operation.
                // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
                // It will return a normal response object that has the appropriate error code set.
                console.error('Fetching failed:', error, event.request);

                throw error;
            });
        })
    );
});