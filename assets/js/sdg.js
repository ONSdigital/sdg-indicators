if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sdg-indicators/service-worker.js');
    });
}
/**
 * This function returns a javascript object containing autotrack.js properties.
 *
 * These properties can be added to an element with jQuery: $(element).attr(props)
 *
 * See _includes/autotrack.html for parameter descriptions.
 */
opensdg.autotrack = function(preset, category, action, label) {
  var presets = {};var params = {
    category: category,
    action: action,
    label: label
  };
  if (presets[preset]) {
    params = presets[preset];
  }
  var obj = {
    'data-on': 'click'
  };
  if (params.category) {
    obj['data-event-category'] = params.category;
  }
  if (params.action) {
    obj['data-event-action'] = params.action;
  }
  if (params.label) {
    obj['data-event-label'] = params.label;
  }

  return obj;
};
/**
 * TODO:
 * Integrate with high-contrast switcher.
 */
(function($) {

  if (typeof L === 'undefined') {
    return;
  }

  // Create the defaults once
  var defaults = {

    // Options for using tile imagery with leaflet.
    tileURL: '[replace me]',
    tileOptions: {
      id: '[relace me]',
      accessToken: '[replace me]',
      attribution: '[replace me]',
    },
    // Zoom limits.
    minZoom: 5,
    maxZoom: 10,
    // Visual/choropleth considerations.
    colorRange: chroma.brewer.BuGn,
    noValueColor: '#f0f0f0',
    styleNormal: {
      weight: 1,
      opacity: 1,
      color: '#888888',
      fillOpacity: 0.7
    },
    styleHighlighted: {
      weight: 1,
      opacity: 1,
      color: '#111111',
      fillOpacity: 0.7
    },
    styleStatic: {
      weight: 2,
      opacity: 1,
      fillOpacity: 0,
      color: '#172d44',
      dashArray: '5,5',
    },
  };

  // Defaults for each map layer.
  var mapLayerDefaults = {
    min_zoom: 0,
    max_zoom: 10,
    subfolder: 'regions',
    label: 'indicator.map',
    staticBorders: false,
  };

  function Plugin(element, options) {

    this.element = element;

    // Support colorRange map option in string format.
    if (typeof options.mapOptions.colorRange === 'string') {
      var colorRangeParts = options.mapOptions.colorRange.split('.'),
          colorRange = window,
          overrideColorRange = true;
      for (var i = 0; i < colorRangeParts.length; i++) {
        var colorRangePart = colorRangeParts[i];
        if (typeof colorRange[colorRangePart] !== 'undefined') {
          colorRange = colorRange[colorRangePart];
        }
        else {
          overrideColorRange = false;
          break;
        }
      }
      if (overrideColorRange && typeof colorRange === 'function') {
        var indicatorId = options.indicatorId.replace('indicator_', ''),
            indicatorIdParts = indicatorId.split('-'),
            goalId = (indicatorIdParts.length > 0) ? indicatorIdParts[0] : null,
            indicatorIdDots = indicatorIdParts.join('.');
        colorRange = colorRange(indicatorIdDots, goalId);
      }
      options.mapOptions.colorRange = (overrideColorRange) ? colorRange : defaults.colorRange;
    }

    this.options = $.extend(true, {}, defaults, options.mapOptions);
    this.mapLayers = [];
    this.indicatorId = options.indicatorId;
    this._precision = options.precision;
    this.precisionItems = options.precisionItems;
    this._decimalSeparator = options.decimalSeparator;
    this.currentDisaggregation = 0;
    this.dataSchema = options.dataSchema;
    this.viewHelpers = options.viewHelpers;
    this.modelHelpers = options.modelHelpers;
    this.chartTitles = options.chartTitles;
    this.proxy = options.proxy;
    this.proxySerieses = options.proxySerieses;
    this.startValues = options.startValues;

    // Require at least one geoLayer.
    if (!options.mapLayers || !options.mapLayers.length) {
      console.log('Map disabled - please add "map_layers" in site configuration.');
      return;
    }

    // Apply geoLayer defaults.
    for (var i = 0; i < options.mapLayers.length; i++) {
      this.mapLayers[i] = $.extend(true, {}, mapLayerDefaults, options.mapLayers[i]);
    }

    // Sort the map layers according to zoom levels.
    this.mapLayers.sort(function(a, b) {
      if (a.min_zoom === b.min_zoom) {
        return a.max_zoom - b.max_zoom;
      }
      return a.min_zoom - b.min_zoom;
    });

    this._defaults = defaults;
    this._name = 'sdgMap';

    this.init();
  }

  Plugin.prototype = {

    // Update title.
    updateTitle: function() {
      if (!this.modelHelpers) {
        return;
      }
      var currentSeries = this.disaggregationControls.getCurrentSeries(),
          currentUnit = this.disaggregationControls.getCurrentUnit(),
          newTitle = null;
      if (this.modelHelpers.GRAPH_TITLE_FROM_SERIES) {
        newTitle = currentSeries;
      }
      else {
        var currentTitle = $('#map-heading').text();
        newTitle = this.modelHelpers.getChartTitle(currentTitle, this.chartTitles, currentUnit, currentSeries);
      }
      if (newTitle) {
        if (this.proxy === 'proxy' || this.proxySerieses.includes(currentSeries)) {
            newTitle += ' ' + this.viewHelpers.PROXY_PILL;
        }
        $('#map-heading').html(newTitle);
      }
    },

    // Update footer fields.
    updateFooterFields: function() {
      if (!this.viewHelpers) {
        return;
      }
      var currentSeries = this.disaggregationControls.getCurrentSeries(),
          currentUnit = this.disaggregationControls.getCurrentUnit();
      this.viewHelpers.updateSeriesAndUnitElements(currentSeries, currentUnit);
      this.viewHelpers.updateUnitElements(currentUnit);
    },

    // Update precision.
    updatePrecision: function() {
      if (!this.modelHelpers) {
        return;
      }
      var currentSeries = this.disaggregationControls.getCurrentSeries(),
          currentUnit = this.disaggregationControls.getCurrentUnit();
      this._precision = this.modelHelpers.getPrecision(this.precisionItems, currentUnit, currentSeries);
    },

    // Zoom to a feature.
    zoomToFeature: function(layer) {
      this.map.fitBounds(layer.getBounds());
    },

    // Build content for a tooltip.
    getTooltipContent: function(feature) {
      var tooltipContent = feature.properties.name;
      var tooltipData = this.getData(feature.properties);
      if (typeof tooltipData === 'number') {
        tooltipContent += ': ' + this.alterData(tooltipData);
      }
      return tooltipContent;
    },

    // Update a tooltip.
    updateTooltip: function(layer) {
      if (layer.getTooltip()) {
        var tooltipContent = this.getTooltipContent(layer.feature);
        layer.setTooltipContent(tooltipContent);
      }
    },

    // Create tooltip.
    createTooltip: function(layer) {
      if (!layer.getTooltip()) {
        var tooltipContent = this.getTooltipContent(layer.feature);
        layer.bindTooltip(tooltipContent, {
          permanent: true,
        }).addTo(this.map);
      }
    },

    // Select a feature.
    highlightFeature: function(layer) {
      // Abort if the layer is not on the map.
      if (!this.map.hasLayer(layer)) {
        return;
      }
      // Update the style.
      layer.setStyle(this.options.styleHighlighted);
      // Add a tooltip if not already there.
      this.createTooltip(layer);
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
      this.updateStaticLayers();
    },

    // Unselect a feature.
    unhighlightFeature: function(layer) {

      // Reset the feature's style.
      layer.setStyle(this.options.styleNormal);

      // Remove the tooltip if necessary.
      if (layer.getTooltip()) {
        layer.unbindTooltip();
      }

      // Make sure other selections are still highlighted.
      var plugin = this;
      this.selectionLegend.selections.forEach(function(selection) {
        plugin.highlightFeature(selection);
      });
    },

    // Get all of the GeoJSON layers.
    getAllLayers: function() {
      return L.featureGroup(this.dynamicLayers.layers);
    },

    // Get only the visible GeoJSON layers.
    getVisibleLayers: function() {
      // Unfortunately relies on an internal of the ZoomShowHide library.
      return this.dynamicLayers._layerGroup;
    },

    updateStaticLayers: function() {
      // Make sure the static borders are always visible.
      this.staticLayers._layerGroup.eachLayer(function(layer) {
        layer.bringToFront();
      });
    },

    // Update the colors of the Features on the map.
    updateColors: function() {
      var plugin = this;
      this.getAllLayers().eachLayer(function(layer) {
        layer.setStyle(function(feature) {
          return {
            fillColor: plugin.getColor(feature.properties),
          }
        });
      });
    },

    // Update the tooltips of the selected Features on the map.
    updateTooltips: function() {
      var plugin = this;
      this.selectionLegend.selections.forEach(function(selection) {
        plugin.updateTooltip(selection);
      });
    },

    // Alter data before displaying it.
    alterData: function(value) {
      opensdg.dataDisplayAlterations.forEach(function(callback) {
        value = callback(value);
      });
      if (typeof value !== 'number') {
        if (this._precision || this._precision === 0) {
          value = Number.parseFloat(value).toFixed(this._precision);
        }
        if (this._decimalSeparator) {
          value = value.toString().replace('.', this._decimalSeparator);
        }
      }
      else {
        var localeOpts = {};
        if (this._precision || this._precision === 0) {
            localeOpts.minimumFractionDigits = this._precision;
            localeOpts.maximumFractionDigits = this._precision;
        }
        value = value.toLocaleString(opensdg.language, localeOpts);
      }
      return value;
    },

    // Get the data from a feature's properties, according to the current year.
    getData: function(props) {
      var ret = false;
      if (props.values && props.values.length && this.currentDisaggregation < props.values.length) {
        var value = props.values[this.currentDisaggregation][this.currentYear];
        if (typeof value === 'number') {
          ret = opensdg.dataRounding(value, { indicatorId: this.indicatorId });
        }
      }
      return ret;
    },

    // Choose a color for a GeoJSON feature.
    getColor: function(props) {
      var data = this.getData(props);
      if (data) {
        return this.colorScale(data).hex();
      }
      else {
        return this.options.noValueColor;
      }
    },

    // Set (or re-set) the choropleth color scale.
    setColorScale: function() {
      this.colorScale = chroma.scale(this.options.colorRange)
        .domain(this.valueRanges[this.currentDisaggregation])
        .classes(this.options.colorRange.length);
    },

    // Get the (long) URL of a geojson file, given a particular subfolder.
    getGeoJsonUrl: function(subfolder) {
      var fileName = this.indicatorId + '.geojson';
      return [opensdg.remoteDataBaseUrl, 'geojson', subfolder, fileName].join('/');
    },

    getYearSlider: function() {
      var plugin = this,
          years = plugin.years[plugin.currentDisaggregation];
      return L.Control.yearSlider({
        years: years,
        yearChangeCallback: function(e) {
          plugin.currentYear = years[e.target._currentTimeIndex];
          plugin.updateColors();
          plugin.updateTooltips();
          plugin.selectionLegend.update();
        }
      });
    },

    replaceYearSlider: function() {
      var newSlider = this.getYearSlider();
      var oldSlider = this.yearSlider;
      this.map.addControl(newSlider);
      this.map.removeControl(oldSlider);
      this.yearSlider = newSlider;
      $(this.yearSlider.getContainer()).insertAfter($(this.disaggregationControls.getContainer()));
      this.yearSlider._timeDimension.setCurrentTimeIndex(this.yearSlider._timeDimension.getCurrentTimeIndex());
    },

    // Initialize the map itself.
    init: function() {

      // Create the map.
      this.map = L.map(this.element, {
        minZoom: this.options.minZoom,
        maxZoom: this.options.maxZoom,
        zoomControl: false,
      });
      this.map.setView([0, 0], 0);
      this.dynamicLayers = new ZoomShowHide();
      this.dynamicLayers.addTo(this.map);
      this.staticLayers = new ZoomShowHide();
      this.staticLayers.addTo(this.map);

      // Add scale.
      this.map.addControl(L.control.scale({position: 'bottomright'}));

      // Add tile imagery.
      if (this.options.tileURL && this.options.tileURL !== 'undefined' && this.options.tileURL != '') {
        L.tileLayer(this.options.tileURL, this.options.tileOptions).addTo(this.map);
      }

      // Because after this point, "this" rarely works.
      var plugin = this;

      // Below we'll be figuring out the min/max values and available years.
      var minimumValues = [],
          maximumValues = [],
          availableYears = [];

      // At this point we need to load the GeoJSON layer/s.
      var geoURLs = this.mapLayers.map(function(item) {
        return $.getJSON(plugin.getGeoJsonUrl(item.subfolder));
      });
      $.when.apply($, geoURLs).done(function() {

        // Apparently "arguments" can either be an array of responses, or if
        // there was only one response, the response itself. This behavior is
        // odd and should be investigated. In the meantime, a workaround is a
        // blunt check to see if it is a single response.
        var geoJsons = arguments;
        // In a response, the second element is a string (like 'success') so
        // check for that here to identify whether it is a response.
        if (arguments.length > 1 && typeof arguments[1] === 'string') {
          // If so, put it into an array, to match the behavior when there are
          // multiple responses.
          geoJsons = [geoJsons];
        }

        // Do a quick loop through to see which layers actually have data.
        for (var i = 0; i < geoJsons.length; i++) {
          var layerHasData = true;
          if (typeof geoJsons[i][0].features === 'undefined') {
            layerHasData = false;
          }
          else if (!plugin.featuresShouldDisplay(geoJsons[i][0].features)) {
            layerHasData = false;
          }
          if (layerHasData === false) {
            // If a layer has no data, we'll be skipping it.
            plugin.mapLayers[i].skipLayer = true;
            // We also need to alter a sibling layer's min_zoom or max_zoom.
            var hasLayerBefore = i > 0;
            var hasLayerAfter = i < (geoJsons.length - 1);
            if (hasLayerBefore) {
              plugin.mapLayers[i - 1].max_zoom = plugin.mapLayers[i].max_zoom;
            }
            else if (hasLayerAfter) {
              plugin.mapLayers[i + 1].min_zoom = plugin.mapLayers[i].min_zoom;
            }
          }
          else {
            plugin.mapLayers[i].skipLayer = false;
          }
        }

        for (var i = 0; i < geoJsons.length; i++) {
          if (plugin.mapLayers[i].skipLayer) {
            continue;
          }
          // First add the geoJson as static (non-interactive) borders.
          if (plugin.mapLayers[i].staticBorders) {
            var staticLayer = L.geoJson(geoJsons[i][0], {
              style: plugin.options.styleStatic,
              interactive: false,
            });
            // Static layers should start appear when zooming past their dynamic
            // layer, and stay visible after that.
            staticLayer.min_zoom = plugin.mapLayers[i].max_zoom + 1;
            staticLayer.max_zoom = plugin.options.maxZoom;
            plugin.staticLayers.addLayer(staticLayer);
          }
          // Now go on to add the geoJson again as choropleth dynamic regions.
          var geoJson = geoJsons[i][0]
          var layer = L.geoJson(geoJson, {
            style: plugin.options.styleNormal,
            onEachFeature: onEachFeature,
          });
          // Set the "boundaries" for when this layer should be zoomed out of.
          layer.min_zoom = plugin.mapLayers[i].min_zoom;
          layer.max_zoom = plugin.mapLayers[i].max_zoom;
          // Listen for when this layer gets zoomed in or out of.
          layer.on('remove', zoomOutHandler);
          layer.on('add', zoomInHandler);
          // Save the GeoJSON object for direct access (download) later.
          layer.geoJsonObject = geoJson;
          // Add the layer to the ZoomShowHide group.
          plugin.dynamicLayers.addLayer(layer);

          // Add a download button below the map.
          var downloadLabel = translations.t(plugin.mapLayers[i].label)
          var downloadButton = $('<a></a>')
            .attr('href', plugin.getGeoJsonUrl(plugin.mapLayers[i].subfolder))
            .attr('download', '')
            .attr('class', 'btn btn-primary btn-download')
            .attr('title', translations.indicator.download_geojson_title + ' - ' + downloadLabel)
            .attr('aria-label', translations.indicator.download_geojson_title + ' - ' + downloadLabel)
            .text(translations.indicator.download_geojson + ' - ' + downloadLabel);
          $(plugin.element).parent().append(downloadButton);

          // Keep track of the minimums and maximums.
          _.each(geoJson.features, function(feature) {
            if (feature.properties.values && feature.properties.values.length > 0) {
              for (var valueIndex = 0; valueIndex < feature.properties.values.length; valueIndex++) {
                var validEntries = _.reject(Object.entries(feature.properties.values[valueIndex]), function(entry) {
                  return isMapValueInvalid(entry[1]);
                });
                var validKeys = validEntries.map(function(entry) {
                  return entry[0];
                });
                var validValues = validEntries.map(function(entry) {
                  return entry[1];
                });
                if (availableYears.length <= valueIndex) {
                  availableYears.push([]);
                }
                availableYears[valueIndex] = availableYears[valueIndex].concat(validKeys);
                if (minimumValues.length <= valueIndex) {
                  minimumValues.push([]);
                  maximumValues.push([]);
                }
                minimumValues[valueIndex].push(_.min(validValues));
                maximumValues[valueIndex].push(_.max(validValues));
              }
            }
          });
        }

        // Calculate the ranges of values, years and colors.
        function isMapValueInvalid(val) {
          return _.isNaN(val) || val === '';
        }

        plugin.valueRanges = [];
        for (var valueIndex = 0; valueIndex < minimumValues.length; valueIndex++) {
          minimumValues[valueIndex] = _.reject(minimumValues[valueIndex], isMapValueInvalid);
          maximumValues[valueIndex] = _.reject(maximumValues[valueIndex], isMapValueInvalid);
          plugin.valueRanges[valueIndex] = [_.min(minimumValues[valueIndex]), _.max(maximumValues[valueIndex])];
        }
        plugin.setColorScale();

        plugin.years = availableYears.map(function(yearsForIndex) {
          return _.uniq(yearsForIndex).sort();
        });
        //Start the map with the most recent year
        plugin.currentYear = plugin.years[plugin.currentDisaggregation].slice(-1)[0];
        plugin.currentYear = plugin.years.slice(-1)[0];

        // And we can now update the colors.
        plugin.updateColors();

        // Add zoom control.
        plugin.zoomHome = L.Control.zoomHome({
          zoomInTitle: translations.indicator.map_zoom_in,
          zoomOutTitle: translations.indicator.map_zoom_out,
          zoomHomeTitle: translations.indicator.map_zoom_home,
        });
        plugin.map.addControl(plugin.zoomHome);

        // Add full-screen functionality.
        plugin.map.addControl(new L.Control.FullscreenAccessible({
          title: {
              'false': translations.indicator.map_fullscreen,
              'true': translations.indicator.map_fullscreen_exit,
          },
        }));

        // Add the year slider.
        plugin.yearSlider = plugin.getYearSlider();
        plugin.map.addControl(plugin.yearSlider);

        // Add the selection legend.
        plugin.selectionLegend = L.Control.selectionLegend(plugin);
        plugin.map.addControl(plugin.selectionLegend);

        // Add the disaggregation controls.
        plugin.disaggregationControls = L.Control.disaggregationControls(plugin);
        plugin.map.addControl(plugin.disaggregationControls);
        if (plugin.disaggregationControls.needsMapUpdate) {
          plugin.disaggregationControls.updateMap();
        }
        else {
          plugin.updateTitle();
          plugin.updateFooterFields();
          plugin.updatePrecision();
        }

        // Add the search feature.
        plugin.searchControl = new L.Control.SearchAccessible({
          textPlaceholder: 'Search map',
          autoCollapseTime: 7000,
          layer: plugin.getAllLayers(),
          propertyName: 'name',
          marker: false,
          moveToLocation: function(latlng) {
            plugin.zoomToFeature(latlng.layer);
            if (!plugin.selectionLegend.isSelected(latlng.layer)) {
              plugin.highlightFeature(latlng.layer);
              plugin.selectionLegend.addSelection(latlng.layer);
            }
          },
        });
        plugin.map.addControl(plugin.searchControl);
        // The search plugin messes up zoomShowHide, so we have to reset that
        // with this hacky method. Is there a better way?
        var zoom = plugin.map.getZoom();
        plugin.map.setZoom(plugin.options.maxZoom);
        plugin.map.setZoom(zoom);

        // Hide the loading image.
        $('.map-loading-image').hide();
        // Make the map unfocusable.
        $('#map').removeAttr('tabindex');

        // The list of handlers to apply to each feature on a GeoJson layer.
        function onEachFeature(feature, layer) {
          if (plugin.featureShouldDisplay(feature)) {
            layer.on('click', clickHandler);
            layer.on('mouseover', mouseoverHandler);
            layer.on('mouseout', mouseoutHandler);
          }
        }
        // Event handler for click/touch.
        function clickHandler(e) {
          var layer = e.target;
          if (plugin.selectionLegend.isSelected(layer)) {
            plugin.selectionLegend.removeSelection(layer);
            plugin.unhighlightFeature(layer);
          }
          else {
            plugin.selectionLegend.addSelection(layer);
            plugin.highlightFeature(layer);
            plugin.zoomToFeature(layer);
          }
        }
        // Event handler for mouseover.
        function mouseoverHandler(e) {
          var layer = e.target;
          if (!plugin.selectionLegend.isSelected(layer)) {
            plugin.highlightFeature(layer);
          }
        }
        // Event handler for mouseout.
        function mouseoutHandler(e) {
          var layer = e.target;
          if (!plugin.selectionLegend.isSelected(layer)) {
            plugin.unhighlightFeature(layer);
          }
        }
        // Event handler for when a geoJson layer is zoomed out of.
        function zoomOutHandler(e) {
          var geoJsonLayer = e.target;
          // For desktop, we have to make sure that no features remain
          // highlighted, as they might have been highlighted on mouseover.
          geoJsonLayer.eachLayer(function(layer) {
            if (!plugin.selectionLegend.isSelected(layer)) {
              plugin.unhighlightFeature(layer);
            }
          });
          plugin.updateStaticLayers();
          if (plugin.disaggregationControls) {
            plugin.disaggregationControls.update();
          }
        }
        // Event handler for when a geoJson layer is zoomed into.
        function zoomInHandler(e) {
          plugin.updateStaticLayers();
          if (plugin.disaggregationControls) {
            plugin.disaggregationControls.update();
          }
        }
      });

      // Certain things cannot be done until the map is visible. Because our
      // map is in a tab which might not be visible, we have to postpone those
      // things until it becomes visible.
      if ($('#map').is(':visible')) {
        finalMapPreparation();
      }
      else {
        $('#tab-mapview').parent().click(finalMapPreparation);
      }
      function finalMapPreparation() {
        // Update the series/unit stuff in case it changed
        // while on the chart/table.
        plugin.updateTitle();
        plugin.updateFooterFields();
        plugin.updatePrecision();
        // The year slider does not seem to be correct unless we refresh it here.
        plugin.yearSlider._timeDimension.setCurrentTimeIndex(plugin.yearSlider._timeDimension.getCurrentTimeIndex());
        // Delay other things to give time for browser to do stuff.
        setTimeout(function() {
          $('#map #loader-container').hide();
          // Leaflet needs "invalidateSize()" if it was originally rendered in a
          // hidden element. So we need to do that when the tab is clicked.
          plugin.map.invalidateSize();
          // Also zoom in/out as needed.
          plugin.map.fitBounds(plugin.getVisibleLayers().getBounds());
          // Set the home button to return to that zoom.
          plugin.zoomHome.setHomeBounds(plugin.getVisibleLayers().getBounds());
          // Limit the panning to what we care about.
          plugin.map.setMaxBounds(plugin.getVisibleLayers().getBounds());
          // Make sure the info pane is not too wide for the map.
          var $legendPane = $('.selection-legend.leaflet-control');
          var widthPadding = 20;
          var maxWidth = $('#map').width() - widthPadding;
          if ($legendPane.width() > maxWidth) {
            $legendPane.width(maxWidth);
          }
          // Make sure the map is not too high.
          var heightPadding = 75;
          var minHeight = 400;
          var maxHeight = $(window).height() - heightPadding;
          if (maxHeight < minHeight) {
            maxHeight = minHeight;
          }
          if ($('#map').height() > maxHeight) {
            $('#map').height(maxHeight);
          }
        }, 500);
      };
    },

    featureShouldDisplay: function(feature) {
      var display = true;
      display = display && typeof feature.properties.name !== 'undefined';
      display = display && typeof feature.properties.geocode !== 'undefined';
      display = display && typeof feature.properties.values !== 'undefined';
      display = display && typeof feature.properties.disaggregations !== 'undefined';
      return display;
    },

    featuresShouldDisplay: function(features) {
      for (var i = 0; i < features.length; i++) {
        if (this.featureShouldDisplay(features[i])) {
          return true;
        }
      }
      return false;
    }
  };

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn['sdgMap'] = function(options) {
    return this.each(function() {
      if (!$.data(this, 'plugin_sdgMap')) {
        $.data(this, 'plugin_sdgMap', new Plugin(this, options));
      }
    });
  };
})(jQuery);
// This "crops" the charts so that empty years are not displayed
// at the beginning or end of each dataset. This ensures that the
// chart will fill all the available space.
Chart.register({
  id: 'rescaler',
  beforeInit: function (chart, options) {
    chart.config.data.allLabels = chart.config.data.labels.slice(0);
  },
  afterDatasetsUpdate: function (chart) {
    _.each(chart.data.datasets, function (ds) {
      if (!ds.initialised) {
        ds.initialised = true;
        ds.allData = ds.data.slice(0);
      }
    });
  },
  afterUpdate: function (chart) {

    // Ensure this only runs once.
    if (chart.isScaleUpdate) {
      chart.isScaleUpdate = false;
      return;
    }

    // For each dataset, create an object showing the
    // index of the minimum value and the index of the
    // maximum value (not counting empty/null values).
    var ranges = _.chain(chart.data.datasets).map('allData').map(function (data) {
      return {
        min: _.findIndex(data, function(val) { return val !== null }),
        max: _.findLastIndex(data, function(val) { return val !== null })
      };
    }).value();

    // Figure out the overal minimum and maximum
    // considering all of the datasets.
    var dataRange = ranges.length ? {
      min: _.chain(ranges).map('min').min().value(),
      max: _.chain(ranges).map('max').max().value()
    } : undefined;

    if (dataRange) {
      // "Crop" the labels according to the min/max.
      chart.data.labels = chart.data.allLabels.slice(dataRange.min, dataRange.max + 1);

      // "Crop" the data of each dataset according to the min/max.
      chart.data.datasets.forEach(function (dataset) {
        dataset.data = dataset.allData.slice(dataRange.min, dataRange.max + 1);
      });

      chart.isScaleUpdate = true;
      chart.update();
    }
  }
});
function getTextLinesOnCanvas(ctx, text, maxWidth) {
  var words = text.split(" ");
  var lines = [];
  var currentLine = words[0];

  for (var i = 1; i < words.length; i++) {
      var word = words[i];
      var width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
          currentLine += " " + word;
      } else {
          lines.push(currentLine);
          currentLine = word;
      }
  }
  lines.push(currentLine);
  return lines;
}

function isHighContrast(contrast) {
  if (contrast) {
      return contrast === 'high';
  }
  else {
      return $('body').hasClass('contrast-high');
  }
}

// This plugin displays a message to the user whenever a chart has no data.
Chart.register({
  id: 'open-sdg-no-data-message',
  afterDraw: function(chart) {
    if (chart.data.datasets.length === 0) {

      var ctx = chart.ctx;
      var width = chart.width;
      var height = chart.height;

      chart.clear();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "normal 40px 'Open Sans', Helvetica, Arial, sans-serif";
      ctx.fillStyle = (isHighContrast()) ? 'white' : 'black';
      var lines = getTextLinesOnCanvas(ctx, translations.indicator.data_not_available, width);
      var numLines = lines.length;
      var lineHeight = 50;
      var xLine = width / 2;
      var yLine = (height / 2) - ((lineHeight / 2) * numLines);
      for (var i = 0; i < numLines; i++) {
        ctx.fillText(lines[i], xLine, yLine);
        yLine += lineHeight;
      }
      ctx.restore();

      $('#selectionsChart').addClass('chart-has-no-data');
    }
    else {
      $('#selectionsChart').removeClass('chart-has-no-data');
    }
  }
});
// This plugin allows users to cycle through tooltips by keyboard.
Chart.register({
    id: 'open-sdg-accessible-charts',
    afterInit: function(chart) {
        var plugin = this;
        plugin.chart = chart;
        plugin.selectedIndex = -1;
        plugin.currentDataset = 0;
        plugin.setMeta();

        if (!$(chart.canvas).data('keyboardNavInitialized')) {
            $(chart.canvas).data('keyboardNavInitialized', true);
            plugin.initElements();
            chart.canvas.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowRight') {
                    plugin.activateNext();
                    e.preventDefault();
                }
                else if (e.key === 'ArrowLeft') {
                    plugin.activatePrev();
                    e.preventDefault();
                }
            });
            chart.canvas.addEventListener('focus', function() {
                if (plugin.selectedIndex === -1) {
                    plugin.activateNext();
                } else {
                    plugin.activate();
                }
            });
        }
    },
    afterUpdate: function(chart) {
        this.setMeta();
    },
    setMeta: function() {
        this.meta = this.chart.getDatasetMeta(this.currentDataset);
    },
    initElements: function() {
        $('<span/>')
            .addClass('sr-only')
            .attr('id', 'chart-tooltip-status')
            .attr('role', 'status')
            .appendTo('#chart');
        if (window.innerWidth <= 768) {
            var mobileInstructions = translations.indicator.chart + '. ' + translations.indicator.data_tabular_alternative;
            $(this.chart.canvas).html('<span class="hide-during-image-download">' + mobileInstructions + '</span>');
        }
        else {
            var keyboardInstructions = translations.indicator.data_keyboard_navigation;
            $('<span/>')
                .css('display', 'none')
                .attr('id', 'chart-keyboard')
                .text(', ' + keyboardInstructions)
                .appendTo('#chart');
            var describedBy = $('#chart canvas').attr('aria-describedby');
            $(this.chart.canvas)
                .attr('role', 'application')
                .attr('aria-describedby', 'chart-keyboard ' + describedBy)
                .html('<span class="hide-during-image-download">Chart. ' + keyboardInstructions + '</span>')
        }
    },
    activate: function() {
        var activeElements = [];
        if (this.chart.config.type === 'line') {
            // For line charts, we combined all datasets into a single tooltip.
            var numDatasets = this.chart.data.datasets.length;
            for (var i = 0; i < numDatasets; i++) {
                activeElements.push({datasetIndex: i, index: this.selectedIndex});
            }
        }
        else {
            activeElements.push({datasetIndex: this.currentDataset, index: this.selectedIndex});
        }
        this.chart.tooltip.setActiveElements(activeElements);
        this.chart.render();
        this.announceTooltips()
    },
    isSelectedIndexEmpty: function() {
        var isEmpty = true;
        if (this.chart.config.type === 'line') {
            var numDatasets = this.chart.data.datasets.length;
            for (var i = 0; i < numDatasets; i++) {
                var dataset = this.chart.data.datasets[i],
                    value = dataset.data[this.selectedIndex];
                if (typeof value !== 'undefined') {
                    isEmpty = false;
                }
            }
        }
        else {
            var dataset = this.chart.data.datasets[this.currentDataset],
                value = dataset.data[this.selectedIndex];
            if (typeof value !== 'undefined') {
                isEmpty = false;
            }
        }
        return isEmpty;
    },
    activateNext: function() {
        // Abort early if no data.
        if (this.chart.data.datasets.length === 0) {
            return;
        }
        this.selectedIndex += 1;
        if (this.selectedIndex >= this.meta.data.length) {
            this.selectedIndex = 0;
            if (this.chart.config.type !== 'line') {
                this.nextDataset();
            }
        }
        while (this.isSelectedIndexEmpty()) {
            // Skip any empty years.
            this.activateNext();
            return;
        }
        this.activate();
    },
    activatePrev: function() {
        // Abort early if no data.
        if (this.chart.data.datasets.length === 0) {
            return;
        }
        this.selectedIndex -= 1;
        if (this.selectedIndex < 0) {
            if (this.chart.config.type !== 'line') {
                this.prevDataset();
            }
            this.selectedIndex = this.meta.data.length - 1;
        }
        while (this.isSelectedIndexEmpty()) {
            // Skip any empty years.
            this.activatePrev();
            return;
        }
        this.activate();
    },
    nextDataset: function() {
        var numDatasets = this.chart.data.datasets.length;
        this.currentDataset += 1;
        if (this.currentDataset >= numDatasets) {
            this.currentDataset = 0;
        }
        this.setMeta();
    },
    prevDataset: function() {
        var numDatasets = this.chart.data.datasets.length;
        this.currentDataset -= 1;
        if (this.currentDataset < 0) {
            this.currentDataset = numDatasets - 1;
        }
        this.setMeta();
    },
    announceTooltips: function() {
        var tooltips = this.chart.tooltip.getActiveElements();
        if (tooltips.length > 0) {
            var labels = {};
            for (var i = 0; i < tooltips.length; i++) {
                var datasetIndex = tooltips[i].datasetIndex,
                    pointIndex = tooltips[i].index,
                    year = this.chart.data.labels[pointIndex],
                    dataset = this.chart.data.datasets[datasetIndex],
                    label = dataset.label,
                    value = dataset.data[pointIndex];
                if (typeof labels[year] === 'undefined') {
                    labels[year] = [];
                }
                labels[year].push(label + ': ' + value);
            }
            var announcement = '';
            Object.keys(labels).forEach(function(year) {
                announcement += year + ' ';
                labels[year].forEach(function(label) {
                    announcement += label + ', ';
                });
            });
            var currentAnnouncement = $('#chart-tooltip-status').text();
            if (currentAnnouncement != announcement) {
                $('#chart-tooltip-status').text(announcement);
            }
        }
    }
});
function event(sender) {
  this._sender = sender;
  this._listeners = [];
}

event.prototype = {
  attach: function (listener) {
    this._listeners.push(listener);
  },
  notify: function (args) {
    var index;

    for (index = 0; index < this._listeners.length; index += 1) {
      this._listeners[index](this._sender, args);
    }
  }
};
var accessibilitySwitcher = function () {

    function getActiveContrast() {
        return $('body').hasClass('contrast-high') ? 'high' : 'default';
    }

    function setHighContrast() {
        $('body')
            .removeClass('contrast-default')
            .addClass('contrast-high');
        var title = translations.header.disable_high_contrast;
        var gaAttributes = opensdg.autotrack('switch_contrast', 'Accessibility', 'Change contrast setting', 'default');
        $('[data-contrast-switch-to]')
            .attr('data-contrast-switch-to', 'default')
            .attr('title', title)
            .attr('aria-label', title)
            .attr(gaAttributes);

        imageFix('high');
        createCookie('contrast', 'high', 365);
    }

    function setDefaultContrast() {
        $('body')
            .removeClass('contrast-high')
            .addClass('contrast-default');
        var title = translations.header.enable_high_contrast;
        var gaAttributes = opensdg.autotrack('switch_contrast', 'Accessibility', 'Change contrast setting', 'high');
        $('[data-contrast-switch-to]')
            .attr('data-contrast-switch-to', 'high')
            .attr('title', title)
            .attr('aria-label', title)
            .attr(gaAttributes);

        imageFix('default');
        createCookie('contrast', 'default', 365);

    }

    $('[data-contrast-switch-to]').click(function () {
        var newContrast = $(this).attr('data-contrast-switch-to');
        var oldContrast = getActiveContrast();
        if (newContrast === oldContrast) {
            return;
        }
        if (newContrast === 'high') {
            setHighContrast();
            broadcastContrastChange('high', this);
        }
        else {
            setDefaultContrast();
            broadcastContrastChange('default', this);
        }

    });

    function createCookie(name, value, days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    function readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function imageFix(contrast) {
        var doNotSwitchTheseSuffixes = ['.svg'];
        if (contrast == 'high') {
            _.each($('img:not([src*=high-contrast])'), function (image) {
                var src = $(image).attr('src').toLowerCase();
                var switchThisImage = true;
                for (var i = 0; i < doNotSwitchTheseSuffixes.length; i++) {
                    var suffix = doNotSwitchTheseSuffixes[i];
                    if (src.slice(0 - suffix.length) === suffix) {
                        switchThisImage = false;
                    }
                }
                if (switchThisImage) {
                    $(image).attr('src', $(image).attr('src').replace('img/', 'img/high-contrast/'));
                }
            });
        } else {
            // Remove high-contrast
            _.each($('img[src*=high-contrast]'), function (goalImage) {
                $(goalImage).attr('src', $(goalImage).attr('src').replace('high-contrast/', ''));
            })
        }
    };

    function broadcastContrastChange(contrast, elem) {
        var event = new CustomEvent('contrastChange', {
            bubbles: true,
            detail: contrast
        });
        elem.dispatchEvent(event);
    }

    window.onunload = function (e) {
        var contrast = getActiveContrast();
        createCookie('contrast', contrast, 365);
    }

    var cookie = readCookie('contrast');
    var contrast = cookie ? cookie : 'default';
    if (contrast === 'high') {
        setHighContrast();
    }
    else {
        setDefaultContrast();
    }

};

// Dynamic aria labels on navbar toggle.
$(document).ready(function() {
    $('#navbarSupportedContent').on('shown.bs.collapse', function() {
        $('.navbar-toggler').attr('aria-label', translations.header.hide_menu);
    });
    $('#navbarSupportedContent').on('hidden.bs.collapse', function() {
        $('.navbar-toggler').attr('aria-label', translations.header.show_menu);
    });
});
opensdg.chartColors = function(indicatorId) {
  var colorSet = "accessible";
  var numberOfColors = 0;
  var customColorList = [];

  this.goalNumber = parseInt(indicatorId.slice(indicatorId.indexOf('_')+1,indicatorId.indexOf('-')));
  this.goalColors = [['e5243b', '891523', 'ef7b89', '2d070b', 'f4a7b0', 'b71c2f', 'ea4f62', '5b0e17', 'fce9eb'],
                ['e5b735', '896d1f', 'efd385', '2d240a', 'f4e2ae', 'b7922a', 'eac55d', '5b4915', 'f9f0d6'],
                ['4c9f38', '2d5f21', '93c587', '0f1f0b', 'c9e2c3', '3c7f2c', '6fb25f', '1e3f16', 'a7d899'],
                ['c5192d', '760f1b', 'dc7581', '270509', 'f3d1d5', '9d1424', 'd04656', '4e0a12', 'e7a3ab'],
                ['ff3a21', 'b22817', 'ff7563', '330b06', 'ffd7d2', 'cc2e1a', 'ff614d', '7f1d10', 'ff9c90'],
                ['26bde2', '167187', '7cd7ed', '07252d', 'd3f1f9', '1e97b4', '51cae7', '0f4b5a', 'a8e4f3'],
                ['fcc30b', '977506', 'fddb6c', '322702', 'fef3ce', 'c99c08', 'fccf3b', '644e04', 'fde79d'],
                ['a21942', '610f27', 'c7758d', '610F28', 'ecd1d9', '811434', 'b44667', '400a1a', 'd9a3b3'],
                ['fd6925', '973f16', 'fda57c', '321507', 'fee1d3', 'ca541d', 'fd8750', '652a0e', 'fec3a7'],
                ['dd1367', '840b3d', 'ea71a3', '2c0314', 'f8cfe0', 'b00f52', 'd5358b', '580729', 'f1a0c2'],
                ['fd9d24', '653e0e', 'fed7a7', 'b16d19', 'fdba65', 'b14a1e', 'fd976b', '000000', 'fed2bf'],
                ['c9992d', '785b1b', 'dec181', '281e09', 'f4ead5', 'a07a24', 'd3ad56', '503d12', 'e9d6ab'],
                ['3f7e44', '254b28', '8bb18e', '0c190d', 'd8e5d9', '326436', '659769', '19321b', 'b2cbb4'],
                ['0a97d9', '065a82', '6cc0e8', '021e2b', 'ceeaf7', '0878ad', '3aabe0', '043c56', '9dd5ef'],
                ['56c02b', '337319', '99d97f', '112608', 'ddf2d4', '449922', '77cc55', '224c11', 'bbe5aa'],
                ['00689d', '00293e', '99c2d7', '00486d', '4c95ba', '126b80', 'cce0eb', '5a9fb0', 'a1c8d2'],
                ['19486a', '0a1c2a', '8ca3b4', '16377c', 'd1dae1', '11324a', '466c87', '5b73a3', '0f2656']];
  this.colorSets = {'classic':['7e984f', '8d73ca', 'aaa533', 'c65b8a', '4aac8d', 'c95f44'],
                  'sdg':['e5243b', 'dda63a', '4c9f38', 'c5192d', 'ff3a21', '26bde2', 'fcc30b', 'a21942', 'fd6925', 'dd1367','fd9d24','bf8b2e','3f7e44','0a97d9','56c02b','00689d','19486a'],
                  'goal': this.goalColors[this.goalNumber-1],
                  'custom': customColorList,
                  'accessible': ['cd7a00', '339966', '9966cc', '8d4d57', 'A33600', '054ce6']};
  if(Object.keys(this.colorSets).indexOf(colorSet) == -1 || (colorSet=='custom' && customColorList == null)){
    return this.colorSets['accessible'];
  }
  this.numberOfColors = (numberOfColors>this.colorSets[colorSet].length || numberOfColors == null || numberOfColors == 0) ? this.colorSets[colorSet].length : numberOfColors;
  this.colors = this.colorSets[colorSet].slice(0,this.numberOfColors);

  return this.colors;

};
var indicatorModel = function (options) {

  var helpers = 
(function() {

  /**
 * Constants to be used in indicatorModel.js and helper functions.
 */
var UNIT_COLUMN = 'Units';
var SERIES_COLUMN = 'Series';
var GEOCODE_COLUMN = 'GeoCode';
var YEAR_COLUMN = 'Year';
var VALUE_COLUMN = 'Value';
// Note this headline color is overridden in indicatorView.js.
var HEADLINE_COLOR = '#777777';
var GRAPH_TITLE_FROM_SERIES = true;

  /**
 * Model helper functions with general utility.
 */

/**
 * @param {string} prop Property to get unique values from
 * @param {Array} rows
 */
function getUniqueValuesByProperty(prop, rows) {
  var uniques = new Set();
  rows.forEach(function(row) {
    if (row[prop] != null) {
      uniques.add(row[prop])
    }
  });
  return Array.from(uniques);
}

// Use as a callback to Array.prototype.filter to get unique elements
function isElementUniqueInArray(element, index, arr) {
  return arr.indexOf(element) === index;
}

/**
 * @param {Array} columns
 * @return {boolean}
 */
function dataHasGeoCodes(columns) {
  return columns.includes(GEOCODE_COLUMN);
}

/**
 * @param {Array} rows
 * @return {Array} Columns from first row
 */
function getColumnsFromData(rows) {
  return Object.keys(rows.reduce(function(result, obj) {
    return Object.assign(result, obj);
  }, {}));
}

/**
 * @param {Array} columns
 * @return {Array} Columns without non-fields
 */
function getFieldColumnsFromData(columns) {
  var omitColumns = nonFieldColumns();
  return columns.filter(function(col) {
    return !omitColumns.includes(col);
  });
}

/**
 * @return {Array} Data columns that have a special purpose
 *
 * All other data columns can be considered "field columns".
 */
function nonFieldColumns() {
  var columns = [
    YEAR_COLUMN,
    VALUE_COLUMN,
    UNIT_COLUMN,
    GEOCODE_COLUMN,
    'Observation status',
    'Unit multiplier',
    'Unit measure',
  ];
  var timeSeriesAttributes = [{"field":"COMMENT_TS","label":"indicator.footnote"},{"field":"DATA_LAST_UPDATE","label":"metadata_fields.national_data_update_url"}];
  timeSeriesAttributes.forEach(function(tsAttribute) {
    columns.push(tsAttribute.field);
  });
  columns.push(SERIES_COLUMN);
  return columns;
}

/**
 * @param {Array} items Objects optionally containing 'unit' and/or 'series'
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {object|false} The first match given the selected unit/series, or false
 */
function getMatchByUnitSeries(items, selectedUnit, selectedSeries) {
  var matches = getMatchesByUnitSeries(items, selectedUnit, selectedSeries);
  return (matches.length > 0) ? matches[0] : false;
}

/**
 * @param {Array} items Objects optionally containing 'unit' and/or 'series'
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {Array} All matches given the selected unit/series, if any.
 */
function getMatchesByUnitSeries(items, selectedUnit, selectedSeries) {
  if (!items || items.length === 0) {
    return [];
  }
  if (!selectedUnit && !selectedSeries) {
    return items;
  }
  // First pass to find any exact matches.
  var matches = items.filter(function(item) {
    var seriesMatch = item.series === selectedSeries,
        unitMatch = item.unit === selectedUnit;
    if (selectedUnit && selectedSeries) {
      return seriesMatch && unitMatch;
    }
    else if (selectedUnit) {
      return unitMatch;
    }
    else if (selectedSeries) {
      return seriesMatch;
    }
  });
  // Second pass to find any partial matches with unspecified unit/series.
  if (matches.length === 0) {
    matches = items.filter(function(item) {
      var seriesMatch = item.series === selectedSeries && item.series && !item.unit,
          unitMatch = item.unit === selectedUnit && item.unit && !item.series;
      if (selectedUnit && selectedSeries) {
        return seriesMatch || unitMatch;
      }
      else if (selectedUnit) {
        return unitMatch;
      }
      else if (selectedSeries) {
        return seriesMatch;
      }
    });
  }
  // Third pass to catch cases where nothing at all was specified.
  if (matches.length === 0) {
    matches = items.filter(function(item) {
      var nothingSpecified = !item.unit && !item.series;
      return nothingSpecified;
    });
  }
  return matches;
}

  /**
 * Model helper functions related to units.
 */

/**
 * @param {Array} rows
 * @return {boolean}
 */
function dataHasUnits(columns) {
  return columns.includes(UNIT_COLUMN);
}

/**
 * @param {Array} fieldsUsedByUnit Field names
 * @return {boolean}
 */
function dataHasUnitSpecificFields(fieldsUsedByUnit) {
  return !_.every(_.map(fieldsUsedByUnit, 'fields'), function(fields) {
    return _.isEqual(_.sortBy(_.map(fieldsUsedByUnit, 'fields')[0]), _.sortBy(fields));
  });
}

/**
 * @param {Array} units
 * @param {Array} rows
 * @return {Array} Field names
 */
function fieldsUsedByUnit(units, rows, columns) {
  var fields = getFieldColumnsFromData(columns);
  return units.map(function(unit) {
    return {
      unit: unit,
      fields: fields.filter(function(field) {
        return fieldIsUsedInDataWithUnit(field, unit, rows);
      }, this),
    }
  }, this);
}

/**
 * @param {string} field
 * @param {string} unit
 * @param {Array} rows
 */
function fieldIsUsedInDataWithUnit(field, unit, rows) {
  return rows.some(function(row) {
    return row[field] && row[UNIT_COLUMN] === unit;
  }, this);
}

/**
 * @param {Array} rows
 * @param {string} unit
 * @return {Array} Rows
 */
function getDataByUnit(rows, unit) {
  return rows.filter(function(row) {
    return row[UNIT_COLUMN] === unit;
  }, this);
}

/**
 * @param {Array} rows
 * @return {string}
 */
function getFirstUnitInData(rows) {
  return rows.find(function(row) {
    return row[UNIT_COLUMN];
  }, this)[UNIT_COLUMN];
}

/**
 * @param {Array} startValues Objects containing 'field' and 'value'
 * @return {string|boolean} Unit, or false if none were found
 */
function getUnitFromStartValues(startValues) {
  var match = startValues.find(function(startValue) {
    return startValue.field === UNIT_COLUMN;
  }, this);
  return (match) ? match.value : false;
}

  /**
 * Model helper functions related to serieses.
 */

/**
 * @param {Array} columns
 * @return {boolean}
 */
function dataHasSerieses(columns) {
  return columns.includes(SERIES_COLUMN);
}

/**
 * @param {Array} fieldsUsedBySeries Field names
 * @return {boolean}
 */
function dataHasSeriesSpecificFields(fieldsUsedBySeries) {
  return !_.every(_.map(fieldsUsedBySeries, 'fields'), function(fields) {
    return _.isEqual(_.sortBy(_.map(fieldsUsedBySeries, 'fields')[0]), _.sortBy(fields));
  });
}

/**
 * @param {Array} serieses
 * @param {Array} rows
 * @return {Array} Field names
 */
function fieldsUsedBySeries(serieses, rows, columns) {
  var fields = getFieldColumnsFromData(columns);
  return serieses.map(function(series) {
    return {
      series: series,
      fields: fields.filter(function(field) {
        return fieldIsUsedInDataWithSeries(field, series, rows);
      }, this),
    }
  }, this);
}

/**
 * @param {string} field
 * @param {string} series
 * @param {Array} rows
 */
function fieldIsUsedInDataWithSeries(field, series, rows) {
  return rows.some(function(row) {
    return row[field] && row[SERIES_COLUMN] === series;
  }, this);
}

/**
 * @param {Array} rows
 * @param {string} series
 * @return {Array} Rows
 */
function getDataBySeries(rows, series) {
  return rows.filter(function(row) {
    return row[SERIES_COLUMN] === series;
  }, this);
}

/**
 * @param {Array} rows
 * @return {string}
 */
function getFirstSeriesInData(rows) {
  return rows.find(function(row) {
    return row[SERIES_COLUMN];
  }, this)[SERIES_COLUMN];
}

/**
 * @param {Array} startValues Objects containing 'field' and 'value'
 * @return {string|boolean} Series, or false if none were found
 */
function getSeriesFromStartValues(startValues) {
  var match = startValues.find(function(startValue) {
    return startValue.field === SERIES_COLUMN;
  }, this);
  return (match) ? match.value : false;
}

  /**
 * Model helper functions related to fields and data.
 */

/**
 * @param {Array} rows
 * @param {Array} edges
 * @return {Array} Field item states
 */

function getInitialFieldItemStates(rows, edges, columns, dataSchema) {
  var fields = getFieldColumnsFromData(columns);
  sortFieldNames(fields, dataSchema);
  var initial = fields.map(function(field) {
    var values = getUniqueValuesByProperty(field, rows);
    sortFieldValueNames(field, values, dataSchema);
    return {
      field: field,
      hasData: true,
      values: values.map(function(value) {
        return {
          value: value,
          state: 'default',
          checked: false,
          hasData: true
        };
      }, this),
    };
  }, this);

  return sortFieldItemStates(initial, edges, dataSchema);
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} edges
 * return {Array} Sorted field item states
 */
function sortFieldItemStates(fieldItemStates, edges, dataSchema) {
  if (edges.length > 0) {
    var froms = getUniqueValuesByProperty('From', edges).sort();
    var tos = getUniqueValuesByProperty('To', edges).sort();
    var orderedEdges = froms.concat(tos);
    var fieldsNotInEdges = fieldItemStates
      .map(function(fis) { return fis.field; })
      .filter(function(field) { return !orderedEdges.includes(field); });
    var customOrder = orderedEdges.concat(fieldsNotInEdges);
    sortFieldNames(customOrder, dataSchema);

    return _.sortBy(fieldItemStates, function(item) {
      return customOrder.indexOf(item.field);
    });
  }
  return fieldItemStates;
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} edges
 * @param {Array} selectedFields Field items
 * @param {Object} validParentsByChild Arrays of parents keyed to children
 * @return {Array} Field item states
 */
function getUpdatedFieldItemStates(fieldItemStates, edges, selectedFields, validParentsByChild) {
  var selectedFieldNames = getFieldNames(selectedFields);
  getParentFieldNames(edges).forEach(function(parentFieldName) {
    if (selectedFieldNames.includes(parentFieldName)) {
      var childFieldNames = getChildFieldNamesByParent(edges, parentFieldName);
      var selectedParent = selectedFields.find(function(selectedField) {
        return selectedField.field === parentFieldName;
      }, this);
      fieldItemStates.forEach(function(fieldItem) {
        if (childFieldNames.includes(fieldItem.field)) {
          var fieldHasData = false;
          fieldItem.values.forEach(function(childValue) {
            var valueHasData = false;
            selectedParent.values.forEach(function(parentValue) {
              if (validParentsByChild[fieldItem.field][childValue.value].includes(parentValue)) {
                valueHasData = true;
                fieldHasData = true;
              }
            }, this);
            childValue.hasData = valueHasData;
          }, this);
          fieldItem.hasData = fieldHasData;
        }
      }, this);
    }
  }, this);
  return fieldItemStates;
}

/**
 * @param {Array} fieldItems
 * @return {Array} Field names
 */
function getFieldNames(fieldItems) {
  return fieldItems.map(function(item) { return item.field; });
}

/**
 * @param {Array} edges
 * @return {Array} Names of parent fields
 */
function getParentFieldNames(edges) {
  return edges.map(function(edge) { return edge.From; });
}

/**
 * @param {Array} edges
 * @param {string} parent
 * @return {Array} Children of parent
 */
function getChildFieldNamesByParent(edges, parent) {
  var children = edges.filter(function(edge) {
    return edge.From === parent;
  });
  return getChildFieldNames(children);
}

/**
 * @param {Array} edges
 * @return {Array} Names of child fields
 */
function getChildFieldNames(edges) {
  return edges.map(function(edge) { return edge.To; });
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} fieldsByUnit Objects containing 'unit' and 'fields'
 * @param {string} selectedUnit
 * @param {boolean} dataHasUnitSpecificFields
 * @param {Array} fieldsBySeries Objects containing 'series' and 'fields'
 * @param {string} selectedSeries
 * @param {boolean} dataHasSeriesSpecificFields
 * @param {Array} selectedFields Field items
 * @param {Array} edges
 * @param {string} compositeBreakdownLabel Alternate label for COMPOSITE_BREAKDOWN fields
 * @return {Array} Field item states (with additional "label" properties)
 */
function fieldItemStatesForView(fieldItemStates, fieldsByUnit, selectedUnit, dataHasUnitSpecificFields, fieldsBySeries, selectedSeries, dataHasSeriesSpecificFields, selectedFields, edges, compositeBreakdownLabel) {
  var states = fieldItemStates.map(function(item) { return item; });
  if (dataHasUnitSpecificFields && dataHasSeriesSpecificFields) {
    states = fieldItemStatesForSeries(fieldItemStates, fieldsBySeries, selectedSeries);
    states = fieldItemStatesForUnit(states, fieldsByUnit, selectedUnit);
  }
  else if (dataHasSeriesSpecificFields) {
    states = fieldItemStatesForSeries(fieldItemStates, fieldsBySeries, selectedSeries);
  }
  else if (dataHasUnitSpecificFields) {
    states = fieldItemStatesForUnit(fieldItemStates, fieldsByUnit, selectedUnit);
  }

  if (selectedFields && selectedFields.length > 0) {
    states.forEach(function(fieldItem) {
      var selectedField = selectedFields.find(function(selectedItem) {
        return selectedItem.field === fieldItem.field;
      });
      if (selectedField) {
        selectedField.values.forEach(function(selectedValue) {
          var fieldItemValue = fieldItem.values.find(function(valueItem) {
            return valueItem.value === selectedValue;
          });
          if (fieldItemValue) {
            fieldItemValue.checked = true;
          }
        })
      }
    });
  }
  sortFieldsForView(states, edges);
  return states.map(function(item) {
    item.label = item.field;
    if (item.field === 'COMPOSITE_BREAKDOWN' && compositeBreakdownLabel !== '') {
      item.label = compositeBreakdownLabel;
    }
    return item;
  });
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} edges
 */
function sortFieldsForView(fieldItemStates, edges) {
  if (edges.length > 0 && fieldItemStates.length > 0) {

    var parents = edges.map(function(edge) { return edge.From; });
    var children = edges.map(function(edge) { return edge.To; });
    var topLevelParents = [];
    parents.forEach(function(parent) {
      if (!(children.includes(parent)) && !(topLevelParents.includes(parent))) {
        topLevelParents.push(parent);
      }
    });

    var topLevelParentsByChild = {};
    children.forEach(function(child) {
      var currentParent = edges.find(function(edge) { return edge.To === child; }),
          currentChild = child;
      while (currentParent) {
        currentParent = edges.find(function(edge) { return edge.To === currentChild; });
        if (currentParent) {
          currentChild = currentParent.From;
          topLevelParentsByChild[child] = currentParent.From;
        }
      }
    });
    fieldItemStates.forEach(function(fieldItem) {
      if (topLevelParents.includes(fieldItem.field) || typeof topLevelParentsByChild[fieldItem.field] === 'undefined') {
        fieldItem.topLevelParent = '';
      }
      else {
        fieldItem.topLevelParent = topLevelParentsByChild[fieldItem.field];
      }
    });

    // As an intermediary step, create a hierarchical structure grouped
    // by the top-level parent.
    var tempHierarchy = [];
    var tempHierarchyHash = {};
    fieldItemStates.forEach(function(fieldItem) {
      if (fieldItem.topLevelParent === '') {
        fieldItem.children = [];
        tempHierarchyHash[fieldItem.field] = fieldItem;
        tempHierarchy.push(fieldItem);
      }
    });
    fieldItemStates.forEach(function(fieldItem) {
      if (fieldItem.topLevelParent !== '') {
        tempHierarchyHash[fieldItem.topLevelParent].children.push(fieldItem);
      }
    });

    // Now we clear out the field items and add them back as a flat list.
    fieldItemStates.length = 0;
    tempHierarchy.forEach(function(fieldItem) {
      fieldItemStates.push(fieldItem);
      fieldItem.children.forEach(function(child) {
        fieldItemStates.push(child);
      });
    });
  }
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} fieldsByUnit Objects containing 'unit' and 'fields'
 * @param {string} selectedUnit
 * @return {Array} Field item states
 */
function fieldItemStatesForUnit(fieldItemStates, fieldsByUnit, selectedUnit) {
  var fieldsBySelectedUnit = fieldsByUnit.filter(function(fieldByUnit) {
    return fieldByUnit.unit === selectedUnit;
  })[0];
  return fieldItemStates.filter(function(fis) {
    return fieldsBySelectedUnit.fields.includes(fis.field);
  });
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} fieldsBySeries Objects containing 'series' and 'fields'
 * @param {string} selectedSeries
 * @return {Array} Field item states
 */
function fieldItemStatesForSeries(fieldItemStates, fieldsBySeries, selectedSeries) {
  var fieldsBySelectedSeries = fieldsBySeries.filter(function(fieldBySeries) {
    return fieldBySeries.series === selectedSeries;
  })[0];
  return fieldItemStates.filter(function(fis) {
    return fieldsBySelectedSeries.fields.includes(fis.field);
  });
}

/**
 * @param {Array} fieldItems
 * @return {Array} Objects representing disaggregation combinations
 */
function getCombinationData(fieldItems) {

  // First get a list of all the single field/value pairs.
  var fieldValuePairs = [];
  fieldItems.forEach(function(fieldItem) {
    fieldItem.values.forEach(function(value) {
      var pair = {};
      pair[fieldItem.field] = value;
      fieldValuePairs.push(pair);
    });
  });

  // Generate all possible subsets of these key/value pairs.
  var powerset = [];
  // Start off with an empty item.
  powerset.push([]);
  for (var i = 0; i < fieldValuePairs.length; i++) {
    for (var j = 0, len = powerset.length; j < len; j++) {
      var candidate = powerset[j].concat(fieldValuePairs[i]);
      if (!hasDuplicateField(candidate)) {
        powerset.push(candidate);
      }
    }
  }

  function hasDuplicateField(pairs) {
    var fields = [], i;
    for (i = 0; i < pairs.length; i++) {
      var field = Object.keys(pairs[i])[0]
      if (fields.includes(field)) {
        return true;
      }
      else {
        fields.push(field);
      }
    }
    return false;
  }

  // Remove the empty item.
  powerset.shift();

  return powerset.map(function(combinations) {
    // We want to merge these into a single object.
    var combinedSubset = {};
    combinations.forEach(function(keyValue) {
      Object.assign(combinedSubset, keyValue);
    });
    return combinedSubset;
  });
}

/**
 * @param {Array} startValues Objects containing 'field' and 'value'
 * @param {Array} selectableFieldNames
 * @return {Array} Field items
 */
function selectFieldsFromStartValues(startValues, selectableFieldNames) {
  if (!startValues) {
    return [];
  }
  var allowedStartValues = startValues.filter(function(startValue) {
    var normalField = !nonFieldColumns().includes(startValue.field);
    var allowedField = selectableFieldNames.includes(startValue.field)
    return normalField && allowedField;
  });
  var valuesByField = {};
  allowedStartValues.forEach(function(startValue) {
    if (!(startValue.field in valuesByField)) {
      valuesByField[startValue.field] = [];
    }
    valuesByField[startValue.field].push(startValue.value);
  });
  return Object.keys(valuesByField).map(function(field) {
    return {
      field: field,
      values: _.uniq(valuesByField[field]),
    };
  });
}

/**
 * @param {Array} rows
 * @param {Array} selectableFieldNames Field names
 * @param {string} selectedUnit
 * @return {Array} Field items
 */
function selectMinimumStartingFields(rows, selectableFieldNames, selectedUnit) {
  var filteredData = rows;
  if (selectedUnit) {
    filteredData = filteredData.filter(function(row) {
      return row[UNIT_COLUMN] === selectedUnit;
    });
  }
  filteredData = filteredData.filter(function(row) {
    return selectableFieldNames.some(function(fieldName) {
      return row[fieldName];
    });
  });
  // Sort the data by each field. We go in reverse order so that the
  // first field will be highest "priority" in the sort.
  selectableFieldNames.reverse().forEach(function(fieldName) {
    filteredData = _.sortBy(filteredData, fieldName);
  });
  // But actually we want the top-priority sort to be the "size" of the
  // rows. In other words we want the row with the fewest number of fields.
  filteredData = _.sortBy(filteredData, function(row) { return Object.keys(row).length; });

  if (filteredData.length === 0) {
    return [];
  }

  // Convert to an array of objects with 'field' and 'values' keys, omitting
  // any non-field columns.
  return Object.keys(filteredData[0]).filter(function(key) {
    return !nonFieldColumns().includes(key);
  }).map(function(field) {
    return {
      field: field,
      values: [filteredData[0][field]]
    };
  });
}

/**
 * @param {Array} edges
 * @param {Array} fieldItemStates
 * @param {Array} rows
 * @return {Object} Arrays of parents keyed to children
 *
 * @TODO: This function can be a bottleneck in large datasets with a lot of
 * disaggregation values. Can this be further optimized?
 */
function validParentsByChild(edges, fieldItemStates, rows) {
  var parentFields = getParentFieldNames(edges);
  var childFields = getChildFieldNames(edges);
  var validParentsByChild = {};
  childFields.forEach(function(childField, fieldIndex) {
    var fieldItemState = fieldItemStates.find(function(fis) {
      return fis.field === childField;
    });
    var childValues = fieldItemState.values.map(function(value) {
      return value.value;
    });
    var parentField = parentFields[fieldIndex];
    var childRows = rows.filter(function(row) {
      var childNotEmpty = row[childField];
      var parentNotEmpty = row[parentField];
      return childNotEmpty && parentNotEmpty;
    })
    validParentsByChild[childField] = {};
    childValues.forEach(function(childValue) {
      var rowsWithParentValues = childRows.filter(function(row) {
        return row[childField] == childValue;
      });
      validParentsByChild[childField][childValue] = getUniqueValuesByProperty(parentField, rowsWithParentValues);
    });
  });
  return validParentsByChild;
}

/**
 * @param {Array} selectableFields Field names
 * @param {Array} edges
 * @param {Array} selectedFields Field items
 * @return {Array} Field names
 */
function getAllowedFieldsWithChildren(selectableFields, edges, selectedFields) {
  var allowedFields = getInitialAllowedFields(selectableFields, edges);
  var selectedFieldNames = getFieldNames(selectedFields);
  getParentFieldNames(edges).forEach(function(parentFieldName) {
    if (selectedFieldNames.includes(parentFieldName)) {
      var childFieldNames = getChildFieldNamesByParent(edges, parentFieldName);
      allowedFields = allowedFields.concat(childFieldNames);
    }
  }, this);
  return allowedFields.filter(isElementUniqueInArray);
}

/**
 *
 * @param {Array} fieldNames
 * @param {Array} edges
 * @return {Array} Field names
 */
function getInitialAllowedFields(fieldNames, edges) {
  var children = getChildFieldNames(edges);
  return fieldNames.filter(function(field) { return !children.includes(field); });
}

/**
 * @param {Array} selectedFields Field names
 * @param {Array} edges
 * @return {Array} Selected fields without orphans
 */
function removeOrphanSelections(selectedFields, edges) {
  var selectedFieldNames = selectedFields.map(function(selectedField) {
    return selectedField.field;
  });
  edges.forEach(function(edge) {
    if (!selectedFieldNames.includes(edge.From)) {
      selectedFields = selectedFields.filter(function(selectedField) {
        return selectedField.field !== edge.From;
      });
    }
  });
  return selectedFields;
}

/**
 * @param {Array} rows
 * @param {Array} selectedFields Field items
 * @return {Array} Rows
 */
function getDataBySelectedFields(rows, selectedFields) {
  return rows.filter(function(row) {
    return selectedFields.some(function(field) {
      return field.values.includes(row[field.field]);
    });
  });
}

/**
 * @param {Array} fieldNames
 * @param {Object} dataSchema
 */
function sortFieldNames(fieldNames, dataSchema) {
  if (dataSchema && dataSchema.fields) {
    var schemaFieldNames = dataSchema.fields.map(function(field) { return field.name; });
    // If field names have been translated, we may need to use titles.
    if (schemaFieldNames.length > 0 && !(fieldNames.includes(schemaFieldNames[0]))) {
      schemaFieldNames = dataSchema.fields.map(function(field) { return field.title; });
    }
    fieldNames.sort(function(a, b) {
      return schemaFieldNames.indexOf(a) - schemaFieldNames.indexOf(b);
    });
  }
  else {
    fieldNames.sort();
  }
}

/**
 * @param {string} fieldName
 * @param {Array} fieldValues
 * @param {Object} dataSchema
 */
function sortFieldValueNames(fieldName, fieldValues, dataSchema) {
  if (dataSchema && dataSchema.fields) {
    var fieldSchema = dataSchema.fields.find(function(x) { return x.name == fieldName; });
    // If field names have been translated, we may need to use titles.
    if (!fieldSchema) {
      fieldSchema = dataSchema.fields.find(function(x) { return x.title == fieldName; });
    }
    if (fieldSchema && fieldSchema.constraints && fieldSchema.constraints.enum) {
      fieldValues.sort(function(a, b) {
        return fieldSchema.constraints.enum.indexOf(a) - fieldSchema.constraints.enum.indexOf(b);
      });
    }
    else {
      fieldValues.sort();
    }
  }
  else {
    fieldValues.sort();
  }
}

  /**
 * Model helper functions related to charts and datasets.
 */

/**
 * @param {string} currentTitle
 * @param {Array} allTitles Objects containing 'unit' and 'title'
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {String} Updated title
 */
function getChartTitle(currentTitle, allTitles, selectedUnit, selectedSeries) {
  var match = getMatchByUnitSeries(allTitles, selectedUnit, selectedSeries);
  return (match) ? match.title : currentTitle;
}

/**
 * @param {string} currentType
 * @param {Array} allTypes Objects containing 'unit', 'series', and 'type'
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {String} Updated type
 */
function getChartType(currentType, allTypes, selectedUnit, selectedSeries) {
  if (!currentType) {
    currentType = 'line';
  }
  var match = getMatchByUnitSeries(allTypes, selectedUnit, selectedSeries);
  return (match) ? match.type : currentType;
}

/**
 * @param {Array} graphLimits Objects containing 'unit' and 'title'
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {Object|false} Graph limit object, if any
 */
function getGraphLimits(graphLimits, selectedUnit, selectedSeries) {
  return getMatchByUnitSeries(graphLimits, selectedUnit, selectedSeries);
}

/**
 * @param {Array} graphAnnotations Objects containing 'unit' or 'series' or more
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {Array} Graph annotations objects, if any
 */
function getGraphAnnotations(graphAnnotations, selectedUnit, selectedSeries, graphTargetLines, graphSeriesBreaks) {
  var annotations = getMatchesByUnitSeries(graphAnnotations, selectedUnit, selectedSeries);
  if (graphTargetLines) {
    annotations = annotations.concat(getGraphTargetLines(graphTargetLines, selectedUnit, selectedSeries));
  }
  if (graphSeriesBreaks) {
    annotations = annotations.concat(getGraphSeriesBreaks(graphSeriesBreaks, selectedUnit, selectedSeries));
  }
  return annotations;
}

/**
 * @param {Array} graphTargetLines Objects containing 'unit' or 'series' or more
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {Array} Graph annotations objects, if any
 */
function getGraphTargetLines(graphTargetLines, selectedUnit, selectedSeries) {
  return getMatchesByUnitSeries(graphTargetLines, selectedUnit, selectedSeries).map(function(targetLine) {
    targetLine.preset = 'target_line';
    targetLine.label = { content: targetLine.label_content };
    return targetLine;
  });

}

/**
 * @param {Array} graphSeriesBreaks Objects containing 'unit' or 'series' or more
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {Array} Graph annotations objects, if any
 */
function getGraphSeriesBreaks(graphSeriesBreaks, selectedUnit, selectedSeries) {
  return getMatchesByUnitSeries(graphSeriesBreaks, selectedUnit, selectedSeries).map(function(seriesBreak) {
    seriesBreak.preset = 'series_break';
    seriesBreak.label = { content: seriesBreak.label_content };
    return seriesBreak;
  });
}

/**
 * @param {Array} headline Rows
 * @param {Array} rows
 * @param {Array} combinations Objects representing disaggregation combinations
 * @param {Array} years
 * @param {string} defaultLabel
 * @param {Array} colors
 * @param {Array} selectableFields Field names
 * @param {Array} colorAssignments Color/striping assignments for disaggregation combinations
 * @return {Array} Datasets suitable for Chart.js
 */
function getDatasets(headline, data, combinations, years, defaultLabel, colors, selectableFields, colorAssignments) {
  var datasets = [], index = 0, dataset, colorIndex, color, background, border, striped, excess, combinationKey, colorAssignment;
  var numColors = colors.length,
      maxColorAssignments = numColors * 2;

  prepareColorAssignments(colorAssignments, maxColorAssignments);
  setAllColorAssignmentsReadyForEviction(colorAssignments);

  combinations.forEach(function(combination) {
    var filteredData = getDataMatchingCombination(data, combination, selectableFields);
    if (filteredData.length > 0) {
      excess = (index >= maxColorAssignments);
      if (excess) {
        // This doesn't really matter: excess datasets won't be displayed.
        color = getHeadlineColor();
        striped = false;
      }
      else {
        combinationKey = JSON.stringify(combination);
        colorAssignment = getColorAssignmentByCombination(colorAssignments, combinationKey);
        if (colorAssignment !== undefined) {
          colorIndex = colorAssignment.colorIndex;
          striped = colorAssignment.striped;
          colorAssignment.readyForEviction = false;
        }
        else {
          if (colorAssignmentsAreFull(colorAssignments)) {
            evictColorAssignment(colorAssignments);
          }
          var openColorInfo = getOpenColorInfo(colorAssignments, colors);
          colorIndex = openColorInfo.colorIndex;
          striped = openColorInfo.striped;
          colorAssignment = getAvailableColorAssignment(colorAssignments);
          assignColor(colorAssignment, combinationKey, colorIndex, striped);
        }
      }

      color = getColor(colorIndex, colors);
      background = getBackground(color, striped);
      border = getBorderDash(striped);

      dataset = makeDataset(years, filteredData, combination, defaultLabel, color, background, border, excess);
      datasets.push(dataset);
      index++;
    }
  }, this);

  if (headline.length > 0) {
    dataset = makeHeadlineDataset(years, headline, defaultLabel);
    datasets.unshift(dataset);
  }
  return datasets;
}

/**
 * @param {Array} colorAssignments
 * @param {int} maxColorAssignments
 */
function prepareColorAssignments(colorAssignments, maxColorAssignments) {
  while (colorAssignments.length < maxColorAssignments) {
    colorAssignments.push({
      combination: null,
      colorIndex: null,
      striped: false,
      readyForEviction: false,
    });
  }
}

/**
 * @param {Array} colorAssignments
 */
function setAllColorAssignmentsReadyForEviction(colorAssignments) {
  for (var i = 0; i < colorAssignments.length; i++) {
    colorAssignments[i].readyForEviction = true;
  }
}

/**
 * @param {Array} rows
 * @param {Object} combination Key/value representation of a field combo
 * @param {Array} selectableFields Field names
 * @return {Array} Matching rows
 */
function getDataMatchingCombination(data, combination, selectableFields) {
  return data.filter(function(row) {
    return selectableFields.every(function(field) {
      return row[field] === combination[field];
    });
  });
}

/**
 * @param {Array} colorAssignments
 * @param {string} combination
 * @return {Object|undefined} Color assignment object if found.
 */
function getColorAssignmentByCombination(colorAssignments, combination) {
  return colorAssignments.find(function(assignment) {
    return assignment.combination === combination;
  });
}

/**
 * @param {Array} colorAssignments
 * @return {boolean}
 */
function colorAssignmentsAreFull(colorAssignments) {
  for (var i = 0; i < colorAssignments.length; i++) {
    if (colorAssignments[i].combination === null) {
      return false;
    }
  }
  return true;
}

/**
 * @param {Array} colorAssignments
 */
function evictColorAssignment(colorAssignments) {
  for (var i = 0; i < colorAssignments.length; i++) {
    if (colorAssignments[i].readyForEviction) {
      colorAssignments[i].combination = null;
      colorAssignments[i].colorIndex = null;
      colorAssignments[i].striped = false;
      colorAssignments[i].readyForEviction = false;
      return;
    }
  }
  throw 'Could not evict color assignment';
}

/**
 * @param {Array} colorAssignments
 * @param {Array} colors
 * @return {Object} Object with 'colorIndex' and 'striped' properties.
 */
function getOpenColorInfo(colorAssignments, colors) {
  // First look for normal colors, then striped.
  var stripedStates = [false, true];
  for (var i = 0; i < stripedStates.length; i++) {
    var stripedState = stripedStates[i];
    var assignedColors = colorAssignments.filter(function(colorAssignment) {
      return colorAssignment.striped === stripedState && colorAssignment.colorIndex !== null;
    }).map(function(colorAssignment) {
      return colorAssignment.colorIndex;
    });
    if (assignedColors.length < colors.length) {
      for (var colorIndex = 0; colorIndex < colors.length; colorIndex++) {
        if (!(assignedColors.includes(colorIndex))) {
          return {
            colorIndex: colorIndex,
            striped: stripedState,
          }
        }
      }
    }
  }
  throw 'Could not find open color';
}

/**
 * @param {Array} colorAssignments
 * @return {Object|undefined} Color assignment object if found.
 */
function getAvailableColorAssignment(colorAssignments) {
  return colorAssignments.find(function(assignment) {
    return assignment.combination === null;
  });
}

/**
 * @param {Object} colorAssignment
 * @param {string} combination
 * @param {int} colorIndex
 * @param {boolean} striped
 */
function assignColor(colorAssignment, combination, colorIndex, striped) {
  colorAssignment.combination = combination;
  colorAssignment.colorIndex = colorIndex;
  colorAssignment.striped = striped;
  colorAssignment.readyForEviction = false;
}

/**
 * @param {int} colorIndex
 * @param {Array} colors
 * @return Color from a list
 */
function getColor(colorIndex, colors) {
  return '#' + colors[colorIndex];
}

/**
 * @param {string} color
 * @param {boolean} striped
 * @return Background color or pattern
 */
function getBackground(color, striped) {
  return striped ? getStripes(color) : color;
}

/**
 * @param {string} color
 * @return Canvas pattern from color
 */
function getStripes(color) {
  if (window.pattern && typeof window.pattern.draw === 'function') {
    return window.pattern.draw('diagonal', color);
  }
  return color;
}

/**
 * @param {boolean} striped
 * @return {Array|undefined} An array produces dashed lines on the chart
 */
function getBorderDash(striped) {
  return striped ? [5, 5] : undefined;
}

/**
 * @param {Array} years
 * @param {Array} rows
 * @param {Object} combination
 * @param {string} labelFallback
 * @param {string} color
 * @param {string} background
 * @param {Array} border
 * @return {Object} Dataset object for Chart.js
 */
function makeDataset(years, rows, combination, labelFallback, color, background, border, excess) {
  var dataset = getBaseDataset();
  return Object.assign(dataset, {
    label: getCombinationDescription(combination, labelFallback),
    disaggregation: combination,
    borderColor: color,
    backgroundColor: background,
    pointBorderColor: color,
    pointBackgroundColor: background,
    borderDash: border,
    borderWidth: 2,
    headline: false,
    pointStyle: 'circle',
    data: prepareDataForDataset(years, rows),
    excess: excess,
  });
}

/**
 * @return {Object} Starting point for a Chart.js dataset
 */
function getBaseDataset() {
  return Object.assign({}, {
    fill: false,
    pointHoverRadius: 5,
    pointHoverBorderWidth: 1,
    tension: 0,
    spanGaps: true,
    maxBarThickness: 150,
  });
}

/**
 * @param {Object} combination Key/value representation of a field combo
 * @param {string} fallback
 * @return {string} Human-readable description of combo
 */
function getCombinationDescription(combination, fallback) {
  var keys = Object.keys(combination);
  if (keys.length === 0) {
    return fallback;
  }
  return keys.map(function(key) {
    return translations.t(combination[key]);
  }).join(', ');
}

/**
 * @param {Array} years
 * @param {Array} rows
 * @return {Array} Prepared rows
 */
function prepareDataForDataset(years, rows) {
  return years.map(function(year) {
    var found = rows.find(function (row) {
      return row[YEAR_COLUMN] === year;
    });
    return found ? found[VALUE_COLUMN] : null;
  });
}

/**
 * @return {string} Hex number of headline color
 *
 * TODO: Make this dynamic to support high-contrast.
 */
function getHeadlineColor() {
  return HEADLINE_COLOR;
}

/**
 * @param {Array} years
 * @param {Array} rows
 * @param {string} label
 * @return {Object} Dataset object for Chart.js
 */
function makeHeadlineDataset(years, rows, label) {
  var dataset = getBaseDataset();
  return Object.assign(dataset, {
    label: label,
    borderColor: getHeadlineColor(),
    backgroundColor: getHeadlineColor(),
    pointBorderColor: getHeadlineColor(),
    pointBackgroundColor: getHeadlineColor(),
    borderWidth: 4,
    headline: true,
    pointStyle: 'rect',
    data: prepareDataForDataset(years, rows),
  });
}

  /**
 * Model helper functions related to tables.
 */

/**
 * @param {Array} datasets
 * @param {Array} years
 * @return {Object} Object containing 'headings' and 'data'
 */
function tableDataFromDatasets(datasets, years) {
  return {
    headings: [YEAR_COLUMN].concat(datasets.map(function(ds) { return ds.label; })),
    data: years.map(function(year, index) {
      return [year].concat(datasets.map(function(ds) { return ds.data[index]; }));
    }),
  };
}

/**
 * @param {Array} rows
 * @param {string} selectedUnit
 * @return {Object} Object containing 'title', 'headings', and 'data'
 */
function getHeadlineTable(rows, selectedUnit) {
  return {
    title: 'Headline data',
    headings: selectedUnit ? [YEAR_COLUMN, UNIT_COLUMN, VALUE_COLUMN] : [YEAR_COLUMN, VALUE_COLUMN],
    data: rows.map(function (row) {
      return selectedUnit ? [row[YEAR_COLUMN], row[UNIT_COLUMN], row[VALUE_COLUMN]] : [row[YEAR_COLUMN], row[VALUE_COLUMN]];
    }),
  };
}

  /**
 * Model helper functions related to data and conversion.
 */

/**
 * @param {Object} data Object imported from JSON file
 * @param {Array} dropKeys Array of keys to drop from the rows
 * @return {Array} Rows
 */
function convertJsonFormatToRows(data, dropKeys) {
  var keys = Object.keys(data);
  if (keys.length === 0) {
    return [];
  }

  if (dropKeys && dropKeys.length > 0) {
    keys = keys.filter(function(key) {
      return !(dropKeys.includes(key));
    });
  }

  return data[keys[0]].map(function(item, index) {
    return _.zipObject(keys, keys.map(function(key) {
      return data[key][index];
    }));
  });
}

/**
 * @param {Array} selectableFields Field names
 * @param {Array} rows
 * @return {Array} Headline rows
 */
function getHeadline(selectableFields, rows) {
  return rows.filter(function (row) {
    return selectableFields.every(function(field) {
      return !row[field];
    });
  }).map(function (row) {
    // Remove null fields in each row.
    return _.pickBy(row, function(val) { return val !== null });
  });
}

/**
 * @param {Array} rows
 * @return {Array} Prepared rows
 */
function prepareData(rows, context) {
  return rows.map(function(item) {

    if (item[VALUE_COLUMN] != 0) {
      // For rounding, use a function that can be set on the global opensdg
      // object, for easier control: opensdg.dataRounding()
      if (typeof opensdg.dataRounding === 'function') {
        item.Value = opensdg.dataRounding(item.Value, context);
      }
    }

    // remove any undefined/null values:
    Object.keys(item).forEach(function(key) {
      if (item[key] === null || typeof item[key] === 'undefined') {
        delete item[key];
      }
    });

    return item;
  }, this);
}

/**
 * @param {Array} rows
 * @param {string} selectedUnit
 * @return {Array} Sorted rows
 */
function sortData(rows, selectedUnit) {
  var column = selectedUnit ? UNIT_COLUMN : YEAR_COLUMN;
  return _.sortBy(rows, column);
}

/**
 * @param {Array} precisions Objects containing 'unit' and 'title'
 * @param {String} selectedUnit
 * @param {String} selectedSeries
 * @return {int|false} number of decimal places, if any
 */
function getPrecision(precisions, selectedUnit, selectedSeries) {
  var match = getMatchByUnitSeries(precisions, selectedUnit, selectedSeries);
  return (match) ? match.decimals : false;
}

/**
 * @param {Object} data Object imported from JSON file
 * @return {Array} Rows
 */
function inputData(data) {
  var dropKeys = [];
  if (opensdg.ignoredDisaggregations && opensdg.ignoredDisaggregations.length > 0) {
    dropKeys = opensdg.ignoredDisaggregations;
  }
  return convertJsonFormatToRows(data, dropKeys);
}

/**
 * @param {Object} edges Object imported from JSON file
 * @return {Array} Rows
 */
function inputEdges(edges) {
  var edgesData = convertJsonFormatToRows(edges);
  if (opensdg.ignoredDisaggregations && opensdg.ignoredDisaggregations.length > 0) {
    var ignoredDisaggregations = opensdg.ignoredDisaggregations;
    edgesData = edgesData.filter(function(edge) {
      if (ignoredDisaggregations.includes(edge.To) || ignoredDisaggregations.includes(edge.From)) {
        return false;
      }
      return true;
    });
  }
  return edgesData;
}

/**
 * @param {Array} rows
 * @return {Array} Objects containing 'field' and 'value', to be placed in the footer.
 */
function getTimeSeriesAttributes(rows) {
  if (rows.length === 0) {
    return [];
  }
  var timeSeriesAttributes = [],
      possibleAttributes = [{"field":"COMMENT_TS","label":"indicator.footnote"},{"field":"DATA_LAST_UPDATE","label":"metadata_fields.national_data_update_url"}],
      firstRow = rows[0],
      firstRowKeys = Object.keys(firstRow);
  possibleAttributes.forEach(function(possibleAttribute) {
    var field = possibleAttribute.field;
    if (firstRowKeys.includes(field) && firstRow[field]) {
      timeSeriesAttributes.push({
        field: field,
        value: firstRow[field],
      });
    }
  });
  return timeSeriesAttributes;
}


  function deprecated(name) {
    return function() {
      console.log('The ' + name + ' function has been removed. Please update any overridden files.');
    }
  }

  return {
    UNIT_COLUMN: UNIT_COLUMN,
    SERIES_COLUMN: SERIES_COLUMN,
    GEOCODE_COLUMN: GEOCODE_COLUMN,
    YEAR_COLUMN: YEAR_COLUMN,
    VALUE_COLUMN: VALUE_COLUMN,
    GRAPH_TITLE_FROM_SERIES: GRAPH_TITLE_FROM_SERIES,
    convertJsonFormatToRows: convertJsonFormatToRows,
    getUniqueValuesByProperty: getUniqueValuesByProperty,
    dataHasUnits: dataHasUnits,
    dataHasGeoCodes: dataHasGeoCodes,
    dataHasSerieses: dataHasSerieses,
    getFirstUnitInData: getFirstUnitInData,
    getFirstSeriesInData: getFirstSeriesInData,
    getDataByUnit: getDataByUnit,
    getDataBySeries: getDataBySeries,
    getDataBySelectedFields: getDataBySelectedFields,
    getUnitFromStartValues: getUnitFromStartValues,
    getSeriesFromStartValues: getSeriesFromStartValues,
    selectFieldsFromStartValues: selectFieldsFromStartValues,
    selectMinimumStartingFields: selectMinimumStartingFields,
    fieldsUsedByUnit: fieldsUsedByUnit,
    fieldsUsedBySeries: fieldsUsedBySeries,
    dataHasUnitSpecificFields: dataHasUnitSpecificFields,
    dataHasSeriesSpecificFields: dataHasSeriesSpecificFields,
    getInitialFieldItemStates: getInitialFieldItemStates,
    validParentsByChild: validParentsByChild,
    getFieldNames: getFieldNames,
    getInitialAllowedFields: getInitialAllowedFields,
    prepareData: prepareData,
    getHeadline: getHeadline,
    sortData: sortData,
    getHeadlineTable: getHeadlineTable,
    removeOrphanSelections: removeOrphanSelections,
    getAllowedFieldsWithChildren: getAllowedFieldsWithChildren,
    getUpdatedFieldItemStates: getUpdatedFieldItemStates,
    fieldItemStatesForView: fieldItemStatesForView,
    getChartTitle: getChartTitle,
    getChartType: getChartType,
    getCombinationData: getCombinationData,
    getDatasets: getDatasets,
    tableDataFromDatasets: tableDataFromDatasets,
    sortFieldNames: typeof sortFieldNames !== 'undefined' ? sortFieldNames : function() {},
    sortFieldValueNames: typeof sortFieldValueNames !== 'undefined' ? sortFieldValueNames : function() {},
    getPrecision: getPrecision,
    getGraphLimits: getGraphLimits,
    getGraphAnnotations: getGraphAnnotations,
    getColumnsFromData: getColumnsFromData,
    inputEdges: inputEdges,
    getTimeSeriesAttributes: getTimeSeriesAttributes,
    inputData: inputData,
  }
})();

  this.helpers = helpers;

  // events:
  this.onDataComplete = new event(this);
  this.onFieldsComplete = new event(this);
  this.onUnitsComplete = new event(this);
  this.onUnitsSelectedChanged = new event(this);
  this.onSeriesesComplete = new event(this);
  this.onSeriesesSelectedChanged = new event(this);
  this.onFieldsStatusUpdated = new event(this);
  this.onFieldsCleared = new event(this);
  this.onSelectionUpdate = new event(this);

  // general members:
  var that = this;
  this.data = helpers.inputData(options.data);
  this.edgesData = helpers.inputEdges(options.edgesData);
  this.hasHeadline = true;
  this.country = options.country;
  this.indicatorId = options.indicatorId;
  this.shortIndicatorId = options.shortIndicatorId;
  this.chartTitle = options.chartTitle,
  this.chartTitles = options.chartTitles;
  this.graphType = options.graphType;
  this.graphTypes = options.graphTypes;
  this.measurementUnit = options.measurementUnit;
  this.xAxisLabel = options.xAxisLabel;
  this.startValues = options.startValues;
  this.showData = options.showData;
  this.selectedFields = [];
  this.allowedFields = [];
  this.selectedUnit = undefined;
  this.fieldsByUnit = undefined;
  this.dataHasUnitSpecificFields = false;
  this.selectedSeries = undefined;
  this.fieldsBySeries = undefined;
  this.dataHasSeriesSpecificFields = false;
  this.fieldValueStatuses = [];
  this.validParentsByChild = {};
  this.hasGeoData = false;
  this.showMap = options.showMap;
  this.graphLimits = options.graphLimits;
  this.stackedDisaggregation = options.stackedDisaggregation;
  this.graphAnnotations = options.graphAnnotations;
  this.graphTargetLines = options.graphTargetLines;
  this.graphSeriesBreaks = options.graphSeriesBreaks;
  this.indicatorDownloads = options.indicatorDownloads;
  this.compositeBreakdownLabel = options.compositeBreakdownLabel;
  this.precision = options.precision;
  this.dataSchema = options.dataSchema;
  this.proxy = options.proxy;
  this.proxySerieses = (this.proxy === 'both') ? options.proxySeries : [];

  this.initialiseUnits = function() {
    if (this.hasUnits) {
      this.units = helpers.getUniqueValuesByProperty(helpers.UNIT_COLUMN, this.data);
      helpers.sortFieldValueNames(helpers.UNIT_COLUMN, this.units, this.dataSchema);
      this.selectedUnit = this.units[0];
      this.fieldsByUnit = helpers.fieldsUsedByUnit(this.units, this.data, this.allColumns);
      this.dataHasUnitSpecificFields = helpers.dataHasUnitSpecificFields(this.fieldsByUnit);
    }
  }

  this.refreshSeries = function() {
    if (this.hasSerieses) {
      if (helpers.GRAPH_TITLE_FROM_SERIES) {
        this.chartTitle = this.selectedSeries;
      }
      this.data = helpers.getDataBySeries(this.allData, this.selectedSeries);
      this.years = helpers.getUniqueValuesByProperty(helpers.YEAR_COLUMN, this.data).sort();
      this.fieldsBySeries = helpers.fieldsUsedBySeries(this.serieses, this.data, this.allColumns);
      this.dataHasSeriesSpecificFields = helpers.dataHasSeriesSpecificFields(this.fieldsBySeries);
    }
  }

  this.initialiseFields = function() {
    this.fieldItemStates = helpers.getInitialFieldItemStates(this.data, this.edgesData, this.allColumns, this.dataSchema);
    this.validParentsByChild = helpers.validParentsByChild(this.edgesData, this.fieldItemStates, this.data);
    this.selectableFields = helpers.getFieldNames(this.fieldItemStates);
    this.allowedFields = helpers.getInitialAllowedFields(this.selectableFields, this.edgesData);
  }

  // Before continuing, we may need to filter by Series, so set up all the Series stuff.
  this.allData = helpers.prepareData(this.data, { indicatorId: this.indicatorId });
  this.allColumns = helpers.getColumnsFromData(this.allData);
  this.hasSerieses = helpers.dataHasSerieses(this.allColumns);
  this.serieses = this.hasSerieses ? helpers.getUniqueValuesByProperty(helpers.SERIES_COLUMN, this.allData) : [];
  this.hasStartValues = Array.isArray(this.startValues) && this.startValues.length > 0;
  if (this.hasSerieses) {
    helpers.sortFieldValueNames(helpers.SERIES_COLUMN, this.serieses, this.dataSchema);
    this.selectedSeries = this.serieses[0];
    if (this.hasStartValues) {
      this.selectedSeries = helpers.getSeriesFromStartValues(this.startValues) || this.selectedSeries;
    }
    this.refreshSeries();
  }
  else {
    this.data = this.allData;
    this.years = helpers.getUniqueValuesByProperty(helpers.YEAR_COLUMN, this.data).sort();
  }

  // calculate some initial values:
  this.hasGeoData = helpers.dataHasGeoCodes(this.allColumns);
  this.hasUnits = helpers.dataHasUnits(this.allColumns);
  this.initialiseUnits();
  this.initialiseFields();
  this.colors = opensdg.chartColors(this.indicatorId);
  this.maxDatasetCount = 2 * this.colors.length;
  this.colorAssignments = [];

  this.clearSelectedFields = function() {
    this.selectedFields = [];
    this.getData();
    this.onFieldsCleared.notify();
  };

  this.updateFieldStates = function(selectedFields) {
    this.selectedFields = helpers.removeOrphanSelections(selectedFields, this.edgesData);
    this.allowedFields = helpers.getAllowedFieldsWithChildren(this.selectableFields, this.edgesData, selectedFields);
    this.fieldItemStates = helpers.getUpdatedFieldItemStates(this.fieldItemStates, this.edgesData, selectedFields, this.validParentsByChild);
    this.onSelectionUpdate.notify({
      selectedFields: this.selectedFields,
      allowedFields: this.allowedFields
    });
  }

  this.updateSelectedFields = function (selectedFields) {
    this.updateFieldStates(selectedFields);
    this.getData();
  };

  this.updateChartTitle = function() {
    this.chartTitle = helpers.getChartTitle(this.chartTitle, this.chartTitles, this.selectedUnit, this.selectedSeries);
  }

  this.updateChartType = function() {
    this.graphType = helpers.getChartType(this.graphType, this.graphTypes, this.selectedUnit, this.selectedSeries);
  }

  this.updateSelectedUnit = function(selectedUnit) {
    this.selectedUnit = selectedUnit;
    this.getData({
      updateFields: this.dataHasUnitSpecificFields
    });
    this.onUnitsSelectedChanged.notify(selectedUnit);
  };

  this.updateSelectedSeries = function(selectedSeries) {
    // Updating the Series is akin to loading a whole new indicator, so
    // here we re-initialise most everything on the page.
    this.selectedSeries = selectedSeries;
    this.refreshSeries();
    this.clearSelectedFields();
    this.initialiseUnits();
    this.initialiseFields();
    this.getData({ updateFields: true, changingSeries: true });
    this.onSeriesesSelectedChanged.notify(selectedSeries);
  };

  this.getData = function(options) {
    options = Object.assign({
      initial: false,
      updateFields: false,
      changingSeries: false,
    }, options);

    var headlineUnfiltered = helpers.getHeadline(this.selectableFields, this.data);
    var headline;
    if (this.hasUnits && !this.hasSerieses) {
      headline = helpers.getDataByUnit(headlineUnfiltered, this.selectedUnit);
    }
    else if (this.hasSerieses && !this.hasUnits) {
      headline = helpers.getDataBySeries(headlineUnfiltered, this.selectedSeries);
    }
    else if (this.hasSerieses && this.hasUnits) {
      headline = helpers.getDataByUnit(headlineUnfiltered, this.selectedUnit);
      headline = helpers.getDataBySeries(headline, this.selectedSeries);
    }
    else {
      headline = headlineUnfiltered;
    }

    // If this is the initial load, check for special cases.
    var selectionUpdateNeeded = false;
    if (options.initial || options.changingSeries) {
      // Decide on a starting unit.
      if (this.hasUnits) {
        var startingUnit = this.selectedUnit;
        if (this.hasStartValues) {
          var unitInStartValues = helpers.getUnitFromStartValues(this.startValues);
          if (unitInStartValues && this.units.includes(unitInStartValues)) {
            startingUnit = unitInStartValues;
          }
        }
        else {
          // If our selected unit causes the headline to be empty, change it
          // to the first one available that would work.
          if (headlineUnfiltered.length > 0 && headline.length === 0) {
            startingUnit = helpers.getFirstUnitInData(headlineUnfiltered);
          }
        }
        // Re-query the headline if needed.
        if (this.selectedUnit !== startingUnit) {
          headline = helpers.getDataByUnit(headlineUnfiltered, startingUnit);
        }
        this.selectedUnit = startingUnit;
      }

      // Decide on a starting series.
      if (this.hasSerieses && !options.changingSeries) {
        var startingSeries = this.selectedSeries;
        if (this.hasStartValues) {
          var seriesInStartValues = helpers.getSeriesFromStartValues(this.startValues);
          if (seriesInStartValues) {
            startingSeries = seriesInStartValues;
          }
        }
        else {
          // If our selected series causes the headline to be empty, change it
          // to the first one available that would work.
          if (headlineUnfiltered.length > 0 && headline.length === 0) {
            startingSeries = helpers.getFirstSeriesInData(headlineUnfiltered);
          }
        }
        // Re-query the headline if needed.
        if (this.selectedSeries !== startingSeries) {
          headline = helpers.getDataBySeries(headlineUnfiltered, startingSeries);
        }
        this.selectedSeries = startingSeries;
      }

      // Decide on starting field values.
      var startingFields = this.selectedFields;
      if (this.hasStartValues) {
        startingFields = helpers.selectFieldsFromStartValues(this.startValues, this.selectableFields);
      }
      else {
        if (headline.length === 0) {
          startingFields = helpers.selectMinimumStartingFields(this.data, this.selectableFields, this.selectedUnit);
        }
      }
      if (startingFields.length > 0) {
        this.selectedFields = startingFields;
        selectionUpdateNeeded = true;
      }

      this.onUnitsComplete.notify({
        units: this.units,
        selectedUnit: this.selectedUnit
      });

      this.onSeriesesComplete.notify({
        serieses: this.serieses,
        selectedSeries: this.selectedSeries,
        proxySerieses: this.proxySerieses,
      });
    }

    if (options.initial || options.updateFields) {
      this.onFieldsComplete.notify({
        fields: helpers.fieldItemStatesForView(
          this.fieldItemStates,
          this.fieldsByUnit,
          this.selectedUnit,
          this.dataHasUnitSpecificFields,
          this.fieldsBySeries,
          this.selectedSeries,
          this.dataHasSeriesSpecificFields,
          this.selectedFields,
          this.edgesData,
          this.compositeBreakdownLabel
        ),
        allowedFields: this.allowedFields,
        edges: this.edgesData,
        hasGeoData: this.hasGeoData,
        startValues: this.startValues,
        indicatorId: this.indicatorId,
        showMap: this.showMap,
        precision: helpers.getPrecision(this.precision, this.selectedUnit, this.selectedSeries),
        precisionItems: this.precision,
        dataSchema: this.dataSchema,
        chartTitles: this.chartTitles,
        proxy: this.proxy,
        proxySerieses: this.proxySerieses,
      });
    }

    if (selectionUpdateNeeded || options.updateFields) {
      this.updateFieldStates(this.selectedFields);
    }

    var filteredData = helpers.getDataBySelectedFields(this.data, this.selectedFields);
    if (this.hasUnits) {
      filteredData = helpers.getDataByUnit(filteredData, this.selectedUnit);
    }

    var timeSeriesAttributes = [];
    if (filteredData.length > 0) {
      timeSeriesAttributes = helpers.getTimeSeriesAttributes(filteredData);
    }
    else if (headline.length > 0) {
      timeSeriesAttributes = helpers.getTimeSeriesAttributes(headline);
    }

    filteredData = helpers.sortData(filteredData, this.selectedUnit);
    if (headline.length > 0) {
      headline = helpers.sortData(headline, this.selectedUnit);
    }

    var combinations = helpers.getCombinationData(this.selectedFields);
    var datasets = helpers.getDatasets(headline, filteredData, combinations, this.years, this.country, this.colors, this.selectableFields, this.colorAssignments);
    var selectionsTable = helpers.tableDataFromDatasets(datasets, this.years);

    var datasetCountExceedsMax = false;
    // restrict count if it exceeds the limit:
    if(datasets.length > this.maxDatasetCount) {
      datasetCountExceedsMax = true;
    }

    this.updateChartTitle();
    this.updateChartType();

    this.onFieldsStatusUpdated.notify({
      data: this.fieldItemStates,
      // TODO: Why is selectionStates not used?
      selectionStates: []
    });

    this.onDataComplete.notify({
      datasetCountExceedsMax: datasetCountExceedsMax,
      datasets: datasets.filter(function(dataset) { return dataset.excess !== true }),
      labels: this.years,
      headlineTable: helpers.getHeadlineTable(headline, this.selectedUnit),
      selectionsTable: selectionsTable,
      indicatorId: this.indicatorId,
      shortIndicatorId: this.shortIndicatorId,
      selectedUnit: this.selectedUnit,
      selectedSeries: this.selectedSeries,
      graphLimits: helpers.getGraphLimits(this.graphLimits, this.selectedUnit, this.selectedSeries),
      stackedDisaggregation: this.stackedDisaggregation,
      graphAnnotations: helpers.getGraphAnnotations(this.graphAnnotations, this.selectedUnit, this.selectedSeries, this.graphTargetLines, this.graphSeriesBreaks),
      chartTitle: this.chartTitle,
      chartType: this.graphType,
      indicatorDownloads: this.indicatorDownloads,
      precision: helpers.getPrecision(this.precision, this.selectedUnit, this.selectedSeries),
      timeSeriesAttributes: timeSeriesAttributes,
      isProxy: this.proxy === 'proxy' || this.proxySerieses.includes(this.selectedSeries),
    });
  };
};

indicatorModel.prototype = {
  initialise: function () {
    this.getData({
      initial: true
    });
  },
  getData: function () {
    this.getData();
  }
};
var mapView = function () {

  "use strict";

  this.initialise = function(indicatorId, precision, precisionItems, decimalSeparator, dataSchema, viewHelpers, modelHelpers, chartTitles, startValues, proxy, proxySerieses) {
    $('.map').show();
    $('#map').sdgMap({
      indicatorId: indicatorId,
      mapOptions: {"disaggregation_controls":false,"minZoom":4,"maxZoom":10,"tileURL":"https://{s}.tile.jawg.io/{id}/{z}/{x}/{y}{r}.png?access-token={accessToken}","tileOptions":{"id":"ed56748f-29f9-465e-9269-c715674ee5ff","accessToken":"yrcGMvxCkRD6zZBF4x3mnAT3OGQJstAj7JvG1iy1UjEdy6JFeDfnzKvXrTK07CxF","attribution":"<a href=\"http://jawg.io\" title=\"Provider of map tiles\" target=\"_blank\">&copy; <b>Jawg</b>Maps</a> &copy; <a href=\"https://www.openstreetmap.org/copyright\" title=\"Provider of map visual data copywrite information\">OpenStreetMap</a> contributors | <a href=\"http://geoportal.statistics.gov.uk/\" title=\"The Open Geography portal from the Office for National Statistics\">ONS</a>"},"colorRange":["#c4e1c6","#b0d1b3","#9bc2a1","#87b28f","#74a37c","#60946b","#4d8559","#3a7747","#276836"],"noValueColor":"#f0f0f0","styleNormal":{"weight":1,"opacity":1,"fillOpacity":0.7,"color":"#888888","dashArray":""},"styleHighlighted":{"weight":1,"opacity":1,"fillOpacity":0.7,"color":"#111111","dashArray":""},"styleStatic":{"weight":2,"opacity":1,"fillOpacity":0,"color":"#172d44","dashArray":"5,5"}},
      mapLayers: [{"subfolder":"country","label":"Country","min_zoom":4,"max_zoom":6,"staticBorders":true},{"subfolder":"regions","label":"Regions","min_zoom":6,"max_zoom":8,"staticBorders":true},{"subfolder":"local_authorities","label":"Local Authorities","min_zoom":9,"max_zoom":12,"staticBorders":true}],
      precision: precision,
      precisionItems: precisionItems,
      decimalSeparator: decimalSeparator,
      dataSchema: dataSchema,
      viewHelpers: viewHelpers,
      modelHelpers: modelHelpers,
      chartTitles: chartTitles,
      proxy: proxy,
      proxySerieses: proxySerieses,
      startValues: startValues,
    });
  };
};
var indicatorView = function (model, options) {

    "use strict";

    var MODEL = model,
        VIEW = this,
        OPTIONS = options;

    var helpers = 
(function() {

  var HIDE_SINGLE_SERIES = true;
var HIDE_SINGLE_UNIT = true;
var PROXY_PILL = '<span aria-describedby="proxy-description" class="proxy-pill">' + translations.t("indicator.proxy") + '</span>';

  /**
 * @param {Object} args
 * @return null
 */
function initialiseFields(args) {
    var fieldsContainValues = args.fields.some(function (field) {
        return field.values.length > 0;
    });
    if (fieldsContainValues) {
        var template = _.template($("#item_template").html());

        if (!$('button#clear').length) {
            $('<button id="clear" disabled="disabled" aria-disabled="true" class="disabled">' + translations.indicator.clear_selections + ' <i class="fa fa-remove"></i></button>').insertBefore('#fields');
        }

        $('#fields').html(template({
            fields: args.fields,
            allowedFields: args.allowedFields,
            childFields: _.uniq(args.edges.map(function (edge) { return edge.To })),
            edges: args.edges
        }));

        $(OPTIONS.rootElement).removeClass('no-fields');

    } else {
        $(OPTIONS.rootElement).addClass('no-fields');
    }
}

/**
 * @return null
 */
function updateWithSelectedFields() {
    MODEL.updateSelectedFields(_.chain(_.map($('#fields input:checked'), function (fieldValue) {
        return {
            value: $(fieldValue).val(),
            field: $(fieldValue).data('field')
        };
    })).groupBy('field').map(function (value, key) {
        return {
            field: key,
            values: _.map(value, 'value')
        };
    }).value());
}

/**
 * @param {Element} fieldGroupElement
 * @return null
 */
function sortFieldGroup(fieldGroupElement) {
    var sortLabels = function (a, b) {
        var aObj = { hasData: $(a).attr('data-has-data'), text: $(a).text() };
        var bObj = { hasData: $(b).attr('data-has-data'), text: $(b).text() };
        if (aObj.hasData == bObj.hasData) {
            return (aObj.text > bObj.text) ? 1 : -1;
        }
        return (aObj.hasData < bObj.hasData) ? 1 : -1;
    };
    fieldGroupElement.find('label')
        .sort(sortLabels)
        .appendTo(fieldGroupElement.find('#indicatorData .variable-options'));
}

/**
 * @param {Array} tsAttributeValues
 *   Array of objects containing 'field' and 'value'.
 * @return null
 */
function updateTimeSeriesAttributes(tsAttributeValues) {
    var timeSeriesAttributes = [{"field":"COMMENT_TS","label":"indicator.footnote"},{"field":"DATA_LAST_UPDATE","label":"metadata_fields.national_data_update_url"}];
    timeSeriesAttributes.forEach(function(tsAttribute) {
        var field = tsAttribute.field,
            valueMatch = tsAttributeValues.find(function(tsAttributeValue) {
                return tsAttributeValue.field === field;
            }),
            value = (valueMatch) ? valueMatch.value : '',
            $labelElement = $('dt[data-ts-attribute="' + field + '"]'),
            $valueElement = $('dd[data-ts-attribute="' + field + '"]');

        if (!value) {
            $labelElement.hide();
            $valueElement.hide();
        }
        else {
            $labelElement.show();
            $valueElement.show().text(translations.t(value));
        }
    });
}

  /**
 * @param {Object} args
 * @return null
 */
function initialiseUnits(args) {
    var template = _.template($('#units_template').html()),
        units = args.units || [],
        selectedUnit = args.selectedUnit || null;

    $('#units').html(template({
        units: units,
        selectedUnit: selectedUnit
    }));

    var noUnits = (units.length < 1);
    if (HIDE_SINGLE_UNIT) {
        noUnits = (units.length < 2);
    }

    if (noUnits) {
        $(OPTIONS.rootElement).addClass('no-units');
    }
    else {
        $(OPTIONS.rootElement).removeClass('no-units');
    }
}

/**
 * @param {String} selectedUnit
 * @return null
 */
 function updateUnitElements(selectedUnit) {
    var hasUnit = typeof selectedUnit !== 'undefined';
    var fallback = MODEL.measurementUnit;
    if (hasUnit || fallback) {
        var unitToDisplay = selectedUnit || fallback;
        $('.data-controlled-footer-field.unit-from-data').show();
        $('dd.data-controlled-footer-field.unit-from-data').text(translations.t(unitToDisplay));
    }
    else {
        $('.data-controlled-footer-field.unit-from-data').hide();
    }
}

  /**
 * @param {Object} args
 * @return null
 */
function initialiseSerieses(args) {
    var activeSeriesInput = $('#serieses').find(document.activeElement),
        seriesWasFocused = (activeSeriesInput.length > 0) ? true : false,
        focusedValue = (seriesWasFocused) ? $(activeSeriesInput).val() : null,
        templateElement = $('#series_template');
    if (templateElement.length > 0) {
        var template = _.template(templateElement.html()),
            serieses = args.serieses || [],
            selectedSeries = args.selectedSeries || null,
            proxySerieses = args.proxySerieses || [];
        $('#serieses').html(template({
            serieses: serieses,
            selectedSeries: selectedSeries,
            proxySerieses: proxySerieses,
            proxyPill: PROXY_PILL,
        }));

        var noSerieses = (serieses.length < 1);
        if (HIDE_SINGLE_SERIES) {
            noSerieses = (serieses.length < 2);
        }

        if (noSerieses) {
            $(OPTIONS.rootElement).addClass('no-serieses');
        }
        else {
            $(OPTIONS.rootElement).removeClass('no-serieses');
        }
    }
    // Return focus if necessary.
    if (seriesWasFocused) {
        $('#serieses :input[value="' + focusedValue + '"]').focus();
    }
}

  /**
 * @param {Object} config
 * @param {Object} info
 * @return null
 */
function alterChartConfig(config, info) {
    opensdg.chartConfigAlterations.forEach(function (callback) {
        callback(config, info);
    });
}

/**
 * @param {String} chartTitle
 * @return null
 */
function updateChartTitle(chartTitle, isProxy) {
    if (typeof chartTitle !== 'undefined') {
        if (isProxy) {
            chartTitle += ' ' + PROXY_PILL;
        }
        $('.chart-title').html(chartTitle);
    }
}

/**
 * @param {Array} oldDatasets
 * @param {Array} newDatasets
 * @return null
 */
function updateIndicatorDataViewStatus(oldDatasets, newDatasets) {
    var status = '',
        hasData = newDatasets.length > 0,
        dataAdded = newDatasets.length > oldDatasets.length,
        dataRemoved = newDatasets.length < oldDatasets.length,
        getDatasetLabel = function (dataset) { return dataset.label; },
        oldLabels = oldDatasets.map(getDatasetLabel),
        newLabels = newDatasets.map(getDatasetLabel);

    if (!hasData) {
        status = translations.indicator.announce_data_not_available;
    }
    else if (dataAdded) {
        status = translations.indicator.announce_data_added;
        var addedLabels = [];
        newLabels.forEach(function (label) {
            if (!oldLabels.includes(label)) {
                addedLabels.push(label);
            }
        });
        status += ' ' + addedLabels.join(', ');
    }
    else if (dataRemoved) {
        status = translations.indicator.announce_data_removed;
        var removedLabels = [];
        oldLabels.forEach(function (label) {
            if (!newLabels.includes(label)) {
                removedLabels.push(label);
            }
        });
        status += ' ' + removedLabels.join(', ');
    }

    var current = $('#indicator-data-view-status').text();
    if (current != status) {
        $('#indicator-data-view-status').text(status);
    }
}

/**
 * @param {String} contrast
 * @param {Object} chartInfo
 * @return null
 */
function updateHeadlineColor(contrast, chartInfo) {
    if (chartInfo.data.datasets.length > 0) {
        var firstDataset = chartInfo.data.datasets[0];
        var isHeadline = (typeof firstDataset.disaggregation === 'undefined');
        if (isHeadline) {
            var newColor = getHeadlineColor(contrast);
            firstDataset.backgroundColor = newColor;
            firstDataset.borderColor = newColor;
            firstDataset.pointBackgroundColor = newColor;
            firstDataset.pointBorderColor = newColor;
        }
    }
}

/**
 * @param {String} contrast
 * @return {String} The headline color in hex form.
 */
function getHeadlineColor(contrast) {
    return isHighContrast(contrast) ? '#55a6e5' : '#004466';
}

/**
 * @param {String} contrast
 * @return {String} The grid color in hex form.
 */
function getGridColor(contrast) {
    return isHighContrast(contrast) ? '#222' : '#ddd';
};

/**
 * @param {String} contrast
 * @return {String} The tick color in hex form.
 */
function getTickColor(contrast) {
    return isHighContrast(contrast) ? '#fff' : '#000';
}

function getChartConfig(chartInfo) {
    var chartType = chartInfo.chartType;
    if (typeof opensdg.chartTypes[chartType] === 'undefined') {
        console.log('Unknown chart type: ' + chartType + '. Falling back to "line".');
        chartType = 'line';
    }
    return opensdg.chartTypes[chartType](chartInfo);
}

function setPlotEvents(chartInfo) {
    window.addEventListener('contrastChange', function (e) {
        var gridColor = getGridColor(e.detail);
        var tickColor = getTickColor(e.detail);
        updateHeadlineColor(e.detail, VIEW._chartInstance);
        updateGraphAnnotationColors(e.detail, VIEW._chartInstance);
        VIEW._chartInstance.options.scales.y.title.color = tickColor;
        VIEW._chartInstance.options.scales.x.title.color = tickColor;
        VIEW._chartInstance.options.scales.y.ticks.color = tickColor;
        VIEW._chartInstance.options.scales.x.ticks.color = tickColor;
        VIEW._chartInstance.options.scales.y.grid.color = function(line) {
            return (line.index === 0) ? tickColor : gridColor;
        };
        VIEW._chartInstance.options.scales.x.grid.color = function(line) {
            return (line.index === 0) ? tickColor : 'transparent';
        };

        VIEW._chartInstance.update();
        $(VIEW._legendElement).html(generateChartLegend(VIEW._chartInstance));
    });

    createDownloadButton(chartInfo.selectionsTable, 'Chart', chartInfo.indicatorId, '#chartSelectionDownload');
    createSourceButton(chartInfo.shortIndicatorId, '#chartSelectionDownload');
    createIndicatorDownloadButtons(chartInfo.indicatorDownloads, chartInfo.shortIndicatorId, '#chartSelectionDownload');

    $("#btnSave").click(function () {
        var filename = chartInfo.indicatorId + '.png',
            element = document.getElementById('chart-canvas'),
            height = element.clientHeight + 50,
            width = element.clientWidth + 50;
        var options = {
            // These options fix the height, width, and position.
            height: height,
            width: width,
            windowHeight: height,
            windowWidth: width,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            scale: 2,
            backgroundColor: isHighContrast() ? '#000000' : '#FFFFFF',
            // Allow a chance to alter the screenshot's HTML.
            onclone: function (clone) {
                // Add a body class so that the screenshot style can be custom.
                clone.body.classList.add('image-download-in-progress');
            },
            // Decide which elements to skip.
            ignoreElements: function (el) {
                // Keep all style, head, and link elements.
                var keepTags = ['STYLE', 'HEAD', 'LINK'];
                if (keepTags.indexOf(el.tagName) !== -1) {
                    return false;
                }
                // Keep all elements contained by (or containing) the screenshot
                // target element.
                if (element.contains(el) || el.contains(element)) {
                    return false;
                }
                // Leave out everything else.
                return true;
            }
        };
        // First convert the target to a canvas.
        html2canvas(element, options).then(function (canvas) {
            // Then download that canvas as a PNG file.
            canvas.toBlob(function (blob) {
                saveAs(blob, filename);
            });
        });
    });
}

/**
 * @param {Object} chartInfo
 * @return null
 */
function createPlot(chartInfo) {

    var chartConfig = getChartConfig(chartInfo);
    alterChartConfig(chartConfig, chartInfo);
    if (isHighContrast()) {
        updateGraphAnnotationColors('high', chartConfig);
        updateHeadlineColor('high', chartConfig);
    }
    else {
        updateHeadlineColor('default', chartConfig);
    }
    refreshChartLineWrapping(chartConfig);

    VIEW._chartInstance = new Chart($(OPTIONS.rootElement).find('canvas'), chartConfig);
    $(VIEW._legendElement).html(generateChartLegend(VIEW._chartInstance));
};

/**
 * @param {Object} chartInfo
 * @return null
 */
 function updatePlot(chartInfo) {
    // If we have changed type, we will need to destroy and recreate the chart.
    // So we can abort here.
    var updatedConfig = getChartConfig(chartInfo);
    if (updatedConfig.type !== VIEW._chartInstance.config.type) {
        VIEW._chartInstance.destroy();
        createPlot(chartInfo);
        return;
    }

    updateIndicatorDataViewStatus(VIEW._chartInstance.data.datasets, updatedConfig.data.datasets);
    updateHeadlineColor(isHighContrast() ? 'high' : 'default', updatedConfig);

    if (chartInfo.selectedUnit) {
        updatedConfig.options.scales.y.title.text = translations.t(chartInfo.selectedUnit);
    }

    alterChartConfig(updatedConfig, chartInfo);
    refreshChartLineWrapping(updatedConfig);
    VIEW._chartInstance.config.type = updatedConfig.type;
    VIEW._chartInstance.data.datasets = updatedConfig.data.datasets;
    VIEW._chartInstance.data.labels = updatedConfig.data.labels;
    VIEW._chartInstance.options = updatedConfig.options;

    // The following is needed in our custom "rescaler" plugin.
    VIEW._chartInstance.data.allLabels = VIEW._chartInstance.data.labels.slice(0);

    VIEW._chartInstance.update();

    $(VIEW._legendElement).html(generateChartLegend(VIEW._chartInstance));
    updateChartDownloadButton(chartInfo.selectionsTable);
};

/**
 * @param {String} contrast
 * @param {Object} chartInfo
 * @return null
 */
function updateGraphAnnotationColors(contrast, chartInfo) {
    if (chartInfo.options.annotation) {
        chartInfo.options.annotation.annotations.forEach(function (annotation) {
            if (contrast === 'default') {
                $.extend(true, annotation, annotation.defaultContrast);
            }
            else if (contrast === 'high') {
                $.extend(true, annotation, annotation.highContrast);
            }
        });
    }
}

/**
 * @param {Object} chart
 * @return {String} The HTML of the chart legend
 */
function generateChartLegend(chart) {
    var text = [];
    text.push('<h5 class="sr-only">' + translations.indicator.plot_legend_description + '</h5>');
    text.push('<ul id="legend" class="legend-for-' + chart.config.type + '-chart">');
    _.each(chart.data.datasets, function (dataset) {
        text.push('<li>');
        text.push('<span class="swatch' + (dataset.borderDash ? ' dashed' : '') + (dataset.headline ? ' headline' : '') + '" style="background-color: ' + dataset.borderColor + '">');
        text.push('<span class="swatch-inner" style="background-color: ' + dataset.borderColor + '"></span>');
        text.push('</span>');
        text.push(translations.t(dataset.label));
        text.push('</li>');
    });
    text.push('</ul>');
    return text.join('');
}

/**
 * @param {Object} chartConfig
 */
function refreshChartLineWrapping(chartConfig) {
    var yAxisLimit = 40,
        wrappedYAxis = strToArray(chartConfig.options.scales.y.title.text, yAxisLimit);
    chartConfig.options.scales.y.title.text = wrappedYAxis;
}

/**
 * @param {String} str
 * @param {Number} limit
 * @returns {Array} The string divided into an array for line wrapping.
 */
function strToArray (str, limit) {
    var words = str.split(' '),
        aux = [],
        concat = [];

    for (var i = 0; i < words.length; i++) {
        concat.push(words[i]);
        var join = concat.join(' ');
        if (join.length > limit) {
            aux.push(join);
            concat = [];
        }
    }

    if (concat.length) {
        aux.push(concat.join(' ').trim());
    }

    return aux;
}

  opensdg.annotationPresets = {
    common: {
        // This "common" preset is applied to all annotations automatically.
        borderColor: '#949494',
        type: 'line',
        borderDash: [10, 5],
        borderWidth: 1,
        label: {
            backgroundColor: 'white',
            color: 'black',
        },
        // This "highContrast" overrides colors when in high-contrast mode.
        highContrast: {
            label: {
                backgroundColor: 'black',
                color: 'white',
            },
        },
        // This callback is used to generate a generic description for screenreaders.
        // This can be overridden to be a more specific string, eg:
        //
        //     description: 'Chart annotation showing a 2030 target of 15%'
        //
        description: function() {
            var descriptionParts = [translations.indicator.chart_annotation];
            if (this.label && this.label.content) {
                descriptionParts.push(translations.t(this.label.content));
            }
            else {
                // If there is no label, just specify whether it is a box or line.
                if (this.type == 'line') {
                    descriptionParts.push(this.mode + ' line');
                }
                if (this.type == 'box') {
                    descriptionParts.push('box');
                }
            }
            if (typeof this.value !== 'undefined') {
                descriptionParts.push(this.value);
            }
            return descriptionParts.join(': ');
        },
    },
    target_line: {
        mode: 'horizontal',
        borderWidth: 2,
        borderDash: [15, 10],
        borderColor: '#757575',
        label: {
            position: 'end',
            content: translations.indicator.annotation_2030_target,
        },
    },
    series_break: {
        mode: 'vertical',
        borderDash: [2, 2],
        label: {
            position: 'top',
            content: translations.indicator.annotation_series_break,
        },
    },
};

opensdg.chartTypes = opensdg.chartTypes || {};
opensdg.chartTypes.base = function(info) {

    var gridColor = getGridColor();
    var tickColor = getTickColor();

    var config = {
        type: null,
        data: {
            datasets: info.datasets,
            labels: info.labels,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            spanGaps: true,
            scrollX: true,
            scrollCollapse: true,
            sScrollXInner: '150%',
            scales: {
                x: {
                    grid: {
                        color: function(line) {
                            return (line.index === 0) ? tickColor : 'transparent';
                        },
                    },
                    ticks: {
                        color: tickColor,
                    },
                    title: {
                        display: MODEL.xAxisLabel ? true : false,
                        text: MODEL.xAxisLabel,
                        color: tickColor,
                        font: {
                            size: 14,
                            family: "'Open Sans', Helvetica, Arial, sans-serif",
                        },
                    },
                },
                y: {
                    grid: {
                        color: function(line) {
                            return (line.index === 0) ? tickColor : gridColor;
                        },
                        drawBorder: false,
                    },
                    suggestedMin: 0,
                    ticks: {
                        color: tickColor,
                        callback: function (value) {
                            return alterDataDisplay(value, undefined, 'chart y-axis tick');
                        },
                    },
                    title: {
                        display: MODEL.selectedUnit ? translations.t(MODEL.selectedUnit) : MODEL.measurementUnit,
                        text: MODEL.selectedUnit ? translations.t(MODEL.selectedUnit) : MODEL.measurementUnit,
                        color: tickColor,
                        font: {
                            size: 14,
                            family: "'Open Sans', Helvetica, Arial, sans-serif",
                        },
                    }
                }
            },
            plugins: {
                scaler: {},
                title: {
                    display: false
                },
                legend: {
                    display: false,
                },
                tooltip: {
                    usePointStyle: true,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    callbacks: {
                        label: function (tooltipItem) {
                            return translations.t(tooltipItem.dataset.label) + ': ' + alterDataDisplay(tooltipItem.raw, tooltipItem.dataset, 'chart tooltip');
                        },
                        afterBody: function () {
                            var unit = MODEL.selectedUnit ? translations.t(MODEL.selectedUnit) : MODEL.measurementUnit;
                            if (typeof unit !== 'undefined' && unit !== '') {
                                return '\n' + translations.indicator.unit + ': ' + unit;
                            }
                        },
                    },
                },
            },
        }
    };

    if (info.graphLimits && Object.keys(info.graphLimits).length > 0) {
        var overrides = {
            options: {
                scales: {
                    y: {
                        min: info.graphLimits.minimum,
                        max: info.graphLimits.maximum,
                    }
                }
            }
        }
        // Add these overrides onto the normal config.
        _.merge(config, overrides);
    }
    else {
        // Otherwise remove any min/max that may be there.
        try {
            delete config.options.scales.y.min;
            delete config.options.scales.y.max;
        }
        catch (e) { }
    }

    if (info.graphAnnotations && info.graphAnnotations.length > 0) {
        // Apply some helpers/fixes to the annotations.
        var annotations = info.graphAnnotations.map(function(annotationOverrides) {
            var annotation = {};
            // Apply the "common" preset.
            if (opensdg.annotationPresets.common) {
                $.extend(true, annotation, opensdg.annotationPresets.common);
            }
            // Apply any specified presets.
            if (annotationOverrides.preset) {
                var preset = annotationOverrides.preset;
                if (opensdg.annotationPresets[preset]) {
                    $.extend(true, annotation, opensdg.annotationPresets[preset]);
                }
            }
            // Now add any more annotation config.
            $.extend(true, annotation, annotationOverrides);
            // Default to horizontal lines.
            if (!annotation.mode && annotation.type === 'line') {
                annotation.mode = 'horizontal';
            }
            // Provide the obscure scaleID properties on user's behalf.
            if (!annotation.scaleID && annotation.type === 'line') {
                if (annotation.mode === 'horizontal') {
                    annotation.scaleID = 'y';
                }
                if (annotation.mode === 'vertical') {
                    annotation.scaleID = 'x';
                }
            }
            if (!annotation.xScaleID && annotation.type === 'box') {
                annotation.xScaleID = 'x';
            }
            if (!annotation.yScaleID && annotation.type === 'box') {
                annotation.yScaleID = 'y';
            }
            // Provide the "enabled" label property on the user's behalf.
            if (annotation.label && annotation.label.content) {
                annotation.label.enabled = true;
            }
            // Translate any label content.
            if (annotation.label && annotation.label.content) {
                annotation.label.content = translations.t(annotation.label.content);
            }
            // Save some original values for later used when contrast mode is switched.
            if (typeof annotation.defaultContrast === 'undefined') {
                annotation.defaultContrast = {};
                if (annotation.borderColor) {
                    annotation.defaultContrast.borderColor = annotation.borderColor;
                }
                if (annotation.backgroundColor) {
                    annotation.defaultContrast.backgroundColor = annotation.backgroundColor;
                }
                if (annotation.label) {
                    annotation.defaultContrast.label = {};
                    if (annotation.label.fontColor) {
                        annotation.defaultContrast.label.fontColor = annotation.label.fontColor;
                    }
                    if (annotation.label.backgroundColor) {
                        annotation.defaultContrast.label.backgroundColor = annotation.label.backgroundColor;
                    }
                }
            }
            return annotation;
        });
        if (annotations.length > 0) {
            var overrides = {
                options: {
                    plugins: {
                        annotation: {
                            drawTime: 'afterDatasetsDraw',
                            annotations: annotations
                        }
                    }
                }
            };
            // Add these overrides onto the normal config.
            _.merge(config, overrides);

            // Update the chart annotations element.
            var descriptions = annotations.map(function(annotation) {
                var description = '';
                if (annotation.description) {
                    if (typeof annotation.description === 'function') {
                        description = annotation.description.call(annotation);
                    }
                    else {
                        description = translations.t(annotation.description);
                    }
                }
                return description;
            }).filter(function(description) { return description != ''; });

            var currentDescription = $('#chart-annotations').text();
            var newDescription = descriptions.join('. ');
            if (currentDescription != newDescription) {
                $('#chart-annotations').text(newDescription);
            }
        }
    }
    else if (config.options && config.options.annotation) {
        delete config.options.annotation;
    }

    return config;
}

  opensdg.chartTypes.line = function(info) {
    var config = opensdg.chartTypes.base(info);
    var overrides = {
        type: 'line',
        options: {
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
        },
        plugins: [{
            beforeDatasetsDraw: function(chart) {
                if (chart.tooltip._active && chart.tooltip._active.length) {
                    var activePoint = chart.tooltip._active[0],
                        ctx = chart.ctx,
                        x = activePoint.element.x,
                        topY = chart.scales.y.top,
                        bottomY = chart.scales.y.bottom;

                    // draw line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#757575';
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }],
    };
    // Add these overrides onto the normal config, and return it.
    _.merge(config, overrides);
    return config;
}
  opensdg.chartTypes.bar = function (info) {
    var config = opensdg.chartTypes.base(info);
    var overrides = {
        type: 'bar',
    };
    if (info.stackedDisaggregation) {
        overrides.options = {
            scales: {
                x: { stacked: true },
                y: { stacked: true },
            }
        };
        // If we have stackedDisaggregation, we need to group datasets into stacks.
        config.data.datasets.forEach(function (dataset) {
            var disaggregation = $.extend({}, dataset.disaggregation);
            // We're going to "stringify" each combination of disaggregations in order
            // to place them in their own "stacks". To place "stacked" disaggregations
            // into the same stack, we set them as "samestack" before stringifying.
            // Note that the string "samestack" is completely arbitrary.
            if (typeof disaggregation[info.stackedDisaggregation] !== 'undefined') {
                disaggregation[info.stackedDisaggregation] = 'samestack';
            }
            // Use the disaggregation as a unique id for each stack.
            dataset.stack = JSON.stringify(disaggregation);
        });
    }
    // Manually set the borderWidths to 0 to avoid a weird border effect on the bars.
    config.data.datasets.forEach(function(dataset) {
        dataset.borderWidth = 0;
    });
    // Add these overrides onto the normal config, and return it.
    _.merge(config, overrides);
    return config;
}
  opensdg.convertBinaryValue = function (value) {
    if (typeof value === 'string') {
        value = parseInt(value, 10);
    }
    if (value === 1) {
        return 'Yes';
    }
    else if (value === -1) {
        return 'No';
    }
    return '';
}

opensdg.chartTypes.binary = function (info) {
    var config = opensdg.chartTypes.base(info);
    var overrides = {
        // Force the "bar" type instead of the "binary" type which Chart.js
        // does not recognize.
        type: 'bar',
        // Assign some callbacks to convert 1/-1 to Yes/No.
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            var label = tooltipItem.dataset.label || '';
                            label += ': ' + opensdg.convertBinaryValue(tooltipItem.formattedValue);
                            return label;
                        },
                    },
                },
            },
            scales: {
                y: {
                    // Set the min/max to -1/1 so that the bars will start from the
                    // middle and either go up (for 1) or down (for -1).
                    min: -1,
                    max: 1,
                    ticks: {
                        callback: opensdg.convertBinaryValue,
                    },
                },
            },
        }
    }

    // Tweak the data so that 0 is treated as -1. This is done so that the bar appears
    // to be pointed down.
    config.data.datasets = config.data.datasets.map(function(dataset) {
        dataset.data = dataset.data.map(function(value) {
            if (value === 0) {
                return -1;
            }
            return value;
        });
        return dataset;
    });

    // Manually set the borderWidths to 0 to avoid a weird border effect on the bars.
    config.data.datasets.forEach(function(dataset) {
        dataset.borderWidth = 0;
    });

    // Add these overrides onto the normal config.
    _.merge(config, overrides);
    return config;
};

  /**
 * @param {Object} config
 * @param {Object} info
 * @return null
 */
function alterTableConfig(config, info) {
    opensdg.tableConfigAlterations.forEach(function (callback) {
        callback(config, info);
    });
}

/**
 * @param {Object} tableData
 * @return {String}
 */
function toCsv(tableData) {
    var lines = [],
        headings = _.map(tableData.headings, function (heading) { return '"' + translations.t(heading) + '"'; });

    lines.push(headings.join(','));

    _.each(tableData.data, function (dataValues) {
        var line = [];

        _.each(headings, function (heading, index) {
            line.push(dataValues[index]);
        });

        lines.push(line.join(','));
    });

    return lines.join('\n');
}

/**
 * @param {Element} el
 * @param {Object} info
 * @return null
 */
function initialiseDataTable(el, info) {
    var nonYearColumns = [];
    for (var i = 1; i < info.table.headings.length; i++) {
        nonYearColumns.push(i);
    }
    var datatables_options = OPTIONS.datatables_options || {
        paging: false,
        bInfo: false,
        bAutoWidth: false,
        searching: false,
        responsive: false,
        order: [[0, 'asc']],
        columnDefs: [
            {
                targets: nonYearColumns,
                createdCell: function (td, cellData, rowData, row, col) {
                    $(td).text(alterDataDisplay(cellData, rowData, 'table cell'));
                },
            },
        ],
    }, table = $(el).find('table');

    datatables_options.aaSorting = [];

    alterTableConfig(datatables_options, info);
    table.DataTable(datatables_options);
    table.removeAttr('role');
    table.find('thead th').removeAttr('rowspan').removeAttr('colspan').removeAttr('aria-label');
    setDataTableWidth(table);
};

/**
 * @param {Object} chartInfo
 * @return null
 */
function createSelectionsTable(chartInfo) {
    createTable(chartInfo.selectionsTable, chartInfo.indicatorId, '#selectionsTable', chartInfo.isProxy);
    $('#tableSelectionDownload').empty();
    createTableTargetLines(chartInfo.graphAnnotations);
    createDownloadButton(chartInfo.selectionsTable, 'Table', chartInfo.indicatorId, '#tableSelectionDownload');
    createSourceButton(chartInfo.shortIndicatorId, '#tableSelectionDownload');
    createIndicatorDownloadButtons(chartInfo.indicatorDownloads, chartInfo.shortIndicatorId, '#tableSelectionDownload');
};

/**
 * @param {Array} graphAnnotations
 * @return null
 */
function createTableTargetLines(graphAnnotations) {
    var targetLines = graphAnnotations.filter(function (a) { return a.preset === 'target_line'; });
    var $targetLines = $('#tableTargetLines');
    $targetLines.empty();
    targetLines.forEach(function (targetLine) {
        var targetLineLabel = targetLine.label.content;
        if (!targetLineLabel) {
            targetLineLabel = opensdg.annotationPresets.target_line.label.content;
        }
        $targetLines.append('<dt>' + targetLineLabel + '</dt><dd>' + alterDataDisplay(targetLine.value, targetLine, 'target line') + '</dd>');
    });
    if (targetLines.length === 0) {
        $targetLines.hide();
    }
    else {
        $targetLines.show();
    }
}

/**
 * @param {Object} table
 * @return bool
 */
function tableHasData(table) {
    for (var i = 0; i < table.data.length; i++) {
        if (table.data[i].length > 1) {
            return true;
        }
    }
    return false;
}

/**
 * @param {Object} table
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createTable(table, indicatorId, el, isProxy) {

    var table_class = OPTIONS.table_class || 'table table-hover';

    // clear:
    $(el).html('');

    if (table && tableHasData(table)) {
        var currentTable = $('<table />').attr({
            'class': table_class,
            'width': '100%'
        });

        var tableTitle = MODEL.chartTitle;
        if (isProxy) {
            tableTitle += ' ' + PROXY_PILL;
        }
        currentTable.append('<caption>' + tableTitle + '</caption>');

        var table_head = '<thead><tr>';

        var getHeading = function (heading, index) {
            var arrows = '<span class="sort"><i class="fa fa-sort"></i><i class="fa fa-sort-down"></i><i class="fa fa-sort-up"></i></span>';
            var button = '<span tabindex="0" role="button" aria-describedby="column-sort-info">' + translations.t(heading) + '</span>';
            return button + arrows;
        };

        table.headings.forEach(function (heading, index) {
            table_head += '<th' + (!index ? '' : ' class="table-value"') + ' scope="col">' + getHeading(heading, index) + '</th>';
        });

        table_head += '</tr></thead>';
        currentTable.append(table_head);
        currentTable.append('<tbody></tbody>');

        table.data.forEach(function (data) {
            var row_html = '<tr>';
            table.headings.forEach(function (heading, index) {
                // For accessibility set the Year column to a "row" scope th.
                var isYear = (index == 0);
                var cell_prefix = (isYear) ? '<th scope="row"' : '<td';
                var cell_suffix = (isYear) ? '</th>' : '</td>';
                row_html += cell_prefix + (isYear ? '' : ' class="table-value"') + '>' + (data[index] !== null && data[index] !== undefined ? data[index] : '-') + cell_suffix;
            });
            row_html += '</tr>';
            currentTable.find('tbody').append(row_html);
        });

        $(el).append(currentTable);

        // initialise data table and provide some info for alterations.
        var alterationInfo = {
            table: table,
            indicatorId: indicatorId,
        };
        initialiseDataTable(el, alterationInfo);

        $(el).removeClass('table-has-no-data');
        $('#selectionTableFooter').show();

        $(el).find('th')
            .removeAttr('tabindex')
            .click(function () {
                var sortDirection = $(this).attr('aria-sort');
                $(this).find('span[role="button"]').attr('aria-sort', sortDirection);
            });
    } else {
        $(el).append($('<h3 />').text(translations.indicator.data_not_available));
        $(el).addClass('table-has-no-data');
        $('#selectionTableFooter').hide();
    }
}

/**
 * @param {Object} table
 * @return null
 */
function setDataTableWidth(table) {
    table.find('thead th').each(function () {
        var textLength = $(this).text().length;
        for (var loop = 0; loop < VIEW._tableColumnDefs.length; loop++) {
            var def = VIEW._tableColumnDefs[loop];
            if (textLength < def.maxCharCount) {
                if (!def.width) {
                    $(this).css('white-space', 'nowrap');
                } else {
                    $(this).css('width', def.width + 'px');
                    $(this).data('width', def.width);
                }
                break;
            }
        }
    });

    table.removeAttr('style width');

    var totalWidth = 0;
    table.find('thead th').each(function () {
        if ($(this).data('width')) {
            totalWidth += $(this).data('width');
        } else {
            totalWidth += $(this).width();
        }
    });

    // ascertain whether the table should be width 100% or explicit width:
    var containerWidth = table.closest('.dataTables_wrapper').width();

    if (totalWidth > containerWidth) {
        table.css('width', totalWidth + 'px');
    } else {
        table.css('width', '100%');
    }
}

/**
 * @param {Object} table
 * @return null
 */
function updateChartDownloadButton(table) {
    if (typeof VIEW._chartDownloadButton !== 'undefined') {
        var tableCsv = toCsv(table);
        var blob = new Blob([tableCsv], {
            type: 'text/csv'
        });
        var fileName = VIEW._chartDownloadButton.attr('download');
        if (window.navigator && window.navigator.msSaveBlob) {
            // Special behavior for IE.
            VIEW._chartDownloadButton.off('click.openSdgDownload')
            VIEW._chartDownloadButton.on('click.openSdgDownload', function (event) {
                window.navigator.msSaveBlob(blob, fileName);
            });
        }
        else {
            VIEW._chartDownloadButton
                .attr('href', URL.createObjectURL(blob))
                .data('csvdata', tableCsv);
        }
    }
}

  /**
 * @param {null|undefined|Float|String} value
 * @param {Object} info
 * @param {Object} context
 * @return {null|undefined|Float|String}
 */
function alterDataDisplay(value, info, context) {
    // If value is empty, we will not alter it.
    if (value == null || value == undefined) {
        return value;
    }
    // Before passing to user-defined dataDisplayAlterations, let's
    // do our best to ensure that it starts out as a number.
    var altered = value;
    if (typeof altered !== 'number') {
        altered = Number(value);
    }
    // If that gave us a non-number, return original.
    if (isNaN(altered)) {
        return value;
    }
    // Now go ahead with user-defined alterations.
    opensdg.dataDisplayAlterations.forEach(function (callback) {
        altered = callback(altered, info, context);
    });
    // If the returned value is not a number, use the legacy logic for
    // precision and decimal separator.
    if (typeof altered !== 'number') {
        // Now apply our custom precision control if needed.
        if (VIEW._precision || VIEW._precision === 0) {
            altered = Number.parseFloat(altered).toFixed(VIEW._precision);
        }
        // Now apply our custom decimal separator if needed.
        if (OPTIONS.decimalSeparator) {
            altered = altered.toString().replace('.', OPTIONS.decimalSeparator);
        }
    }
    // Otherwise if we have a number, use toLocaleString instead.
    else {
        var localeOpts = {};
        if (VIEW._precision || VIEW._precision === 0) {
            localeOpts.minimumFractionDigits = VIEW._precision;
            localeOpts.maximumFractionDigits = VIEW._precision;
        }
        altered = altered.toLocaleString(opensdg.language, localeOpts);
    }
    return altered;
}

  /**
 * @param {String} selectedSeries
 * @param {String} selectedUnit
 * @return null
 */
function updateSeriesAndUnitElements(selectedSeries, selectedUnit) {
    var hasSeries = typeof selectedSeries !== 'undefined',
        hasUnit = typeof selectedUnit !== 'undefined',
        hasBoth = hasSeries && hasUnit;
    if (hasSeries || hasUnit || hasBoth) {
        $('[data-for-series], [data-for-unit]').each(function () {
            var elementSeries = $(this).data('for-series'),
                elementUnit = $(this).data('for-unit'),
                seriesMatches = elementSeries === selectedSeries,
                unitMatches = elementUnit === selectedUnit;
            if ((hasSeries || hasBoth) && !seriesMatches && elementSeries !== '') {
                $(this).hide();
            }
            else if ((hasUnit || hasBoth) && !unitMatches && elementUnit !== '') {
                $(this).hide();
            }
            else {
                $(this).show();
            }
        });
    }
}

/**
 * @param {String} contrast
 * @return bool
 */
function isHighContrast(contrast) {
    if (contrast) {
        return contrast === 'high';
    }
    else {
        return $('body').hasClass('contrast-high');
    }
}

/**
 * @param {Object} table
 * @param {String} name
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createDownloadButton(table, name, indicatorId, el) {
    if (window.Modernizr.blobconstructor) {
        var downloadKey = 'download_csv';
        if (name == 'Chart') {
            downloadKey = 'download_chart';
        }
        if (name == 'Table') {
            downloadKey = 'download_table';
        }
        var gaLabel = 'Download ' + name + ' CSV: ' + indicatorId.replace('indicator_', '');
        var tableCsv = toCsv(table);
        var fileName = indicatorId + '.csv';
        var downloadButton = $('<a />').text(translations.indicator[downloadKey])
            .attr(opensdg.autotrack('download_data_current', 'Downloads', 'Download CSV', gaLabel))
            .attr({
                'download': fileName,
                'title': translations.indicator.download_csv_title,
                'aria-label': translations.indicator.download_csv_title,
                'class': 'btn btn-primary btn-download',
                'tabindex': 0
            });
        var blob = new Blob([tableCsv], {
            type: 'text/csv'
        });
        if (window.navigator && window.navigator.msSaveBlob) {
            // Special behavior for IE.
            downloadButton.on('click.openSdgDownload', function (event) {
                window.navigator.msSaveBlob(blob, fileName);
            });
        }
        else {
            downloadButton
                .attr('href', URL.createObjectURL(blob))
                .data('csvdata', tableCsv);
        }
        if (name == 'Chart') {
            VIEW._chartDownloadButton = downloadButton;
        }
        $(el).append(downloadButton);
    } else {
        var headlineId = indicatorId.replace('indicator', 'headline');
        var id = indicatorId.replace('indicator_', '');
        var gaLabel = 'Download Headline CSV: ' + id;
        $(el).append($('<a />').text(translations.indicator.download_headline)
            .attr(opensdg.autotrack('download_data_headline', 'Downloads', 'Download CSV', gaLabel))
            .attr({
                'href': opensdg.remoteDataBaseUrl + '/headline/' + id + '.csv',
                'download': headlineId + '.csv',
                'title': translations.indicator.download_headline_title,
                'aria-label': translations.indicator.download_headline_title,
                'class': 'btn btn-primary btn-download',
                'tabindex': 0
            }));
    }
}

/**
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createSourceButton(indicatorId, el) {
    var gaLabel = 'Download Source CSV: ' + indicatorId;
    $(el).append($('<a />').text(translations.indicator.download_source)
        .attr(opensdg.autotrack('download_data_source', 'Downloads', 'Download CSV', gaLabel))
        .attr({
            'href': opensdg.remoteDataBaseUrl + '/data/' + indicatorId + '.csv',
            'download': indicatorId + '.csv',
            'title': translations.indicator.download_source_title,
            'aria-label': translations.indicator.download_source_title,
            'class': 'btn btn-primary btn-download',
            'tabindex': 0
        }));
}

/**
 * @param {Object} indicatorDownloads
 * @param {String} indicatorId
 * @param {Element} el
 * @return null
 */
function createIndicatorDownloadButtons(indicatorDownloads, indicatorId, el) {
    if (indicatorDownloads) {
        var buttonLabels = Object.keys(indicatorDownloads);
        for (var i = 0; i < buttonLabels.length; i++) {
            var buttonLabel = buttonLabels[i];
            var href = indicatorDownloads[buttonLabel].href;
            var buttonLabelTranslated = translations.t(buttonLabel);
            var gaLabel = buttonLabel + ': ' + indicatorId;
            $(el).append($('<a />').text(buttonLabelTranslated)
                .attr(opensdg.autotrack(buttonLabel, 'Downloads', buttonLabel, gaLabel))
                .attr({
                    'href': opensdg.remoteDataBaseUrl + '/' + href,
                    'download': href.split('/').pop(),
                    'title': buttonLabelTranslated,
                    'class': 'btn btn-primary btn-download',
                    'tabindex': 0
                }));
        }
    }
}


  return {
    HIDE_SINGLE_SERIES: HIDE_SINGLE_SERIES,
    HIDE_SINGLE_UNIT: HIDE_SINGLE_UNIT,
    PROXY_PILL: PROXY_PILL,
    initialiseFields: initialiseFields,
    initialiseUnits: initialiseUnits,
    initialiseSerieses: initialiseSerieses,
    alterChartConfig: alterChartConfig,
    alterTableConfig: alterTableConfig,
    alterDataDisplay: alterDataDisplay,
    updateChartTitle: updateChartTitle,
    updateWithSelectedFields: updateWithSelectedFields,
    updateSeriesAndUnitElements: updateSeriesAndUnitElements,
    updateUnitElements: updateUnitElements,
    updateTimeSeriesAttributes: updateTimeSeriesAttributes,
    updatePlot: updatePlot,
    isHighContrast: isHighContrast,
    getHeadlineColor: getHeadlineColor,
    getGridColor: getGridColor,
    getTickColor: getTickColor,
    updateHeadlineColor: updateHeadlineColor,
    createPlot: createPlot,
    setPlotEvents: setPlotEvents,
    toCsv: toCsv,
    createIndicatorDownloadButtons: createIndicatorDownloadButtons,
    createSourceButton: createSourceButton,
    createDownloadButton: createDownloadButton,
    createSelectionsTable: createSelectionsTable,
    sortFieldGroup: sortFieldGroup,
  }
})();

    VIEW.helpers = helpers;

    VIEW._chartInstance = undefined;
    VIEW._tableColumnDefs = OPTIONS.tableColumnDefs;
    VIEW._mapView = undefined;
    VIEW._legendElement = OPTIONS.legendElement;
    VIEW._precision = undefined;
    VIEW._chartInstances = {};

    var chartHeight = screen.height < OPTIONS.maxChartHeight ? screen.height : OPTIONS.maxChartHeight;
    $('.plot-container', OPTIONS.rootElement).css('height', chartHeight + 'px');

    $(document).ready(function () {

        $(OPTIONS.rootElement).find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            if ($(e.target).attr('href') == '#tableview') {
                setDataTableWidth($(OPTIONS.rootElement).find('#selectionsTable table'));
            } else {
                $($.fn.dataTable.tables(true)).css('width', '100%');
                $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
            }
        });

        // Execute the hide/show functionality for the sidebar, both on
        // the currently active tab, and each time a tab is clicked on.
        $('.data-view .nav-item.active .nav-link').each(toggleSidebar);
        $('.data-view .nav-link').on('click', toggleSidebar);
        function toggleSidebar() {
            var $sidebar = $('.indicator-sidebar'),
                $main = $('.indicator-main'),
                hideSidebar = $(this).data('no-disagg'),
                mobile = window.matchMedia("screen and (max-width: 990px)");
            if (hideSidebar) {
                $sidebar.addClass('indicator-sidebar-hidden');
                $main.addClass('indicator-main-full');
                // On mobile, this can be confusing, so we need to scroll to the tabs.
                if (mobile.matches) {
                    $([document.documentElement, document.body]).animate({
                        scrollTop: $("#indicator-main").offset().top - 40
                    }, 400);
                }
            }
            else {
                $sidebar.removeClass('indicator-sidebar-hidden');
                $main.removeClass('indicator-main-full');
                // Make sure the unit/series items are updated, in case
                // they were changed while on the map.
                helpers.updateChartTitle(VIEW._dataCompleteArgs.chartTitle, VIEW._dataCompleteArgs.isProxy);
                helpers.updateSeriesAndUnitElements(VIEW._dataCompleteArgs.selectedSeries, VIEW._dataCompleteArgs.selectedUnit);
                helpers.updateUnitElements(VIEW._dataCompleteArgs.selectedUnit);
                helpers.updateTimeSeriesAttributes(VIEW._dataCompleteArgs.timeSeriesAttributes);
            }
        };
    });

    MODEL.onDataComplete.attach(function (sender, args) {

        VIEW._precision = args.precision;

        if (MODEL.showData) {
            $('#dataset-size-warning')[args.datasetCountExceedsMax ? 'show' : 'hide']();
            if (!VIEW._chartInstance) {
                helpers.createPlot(args);
                helpers.setPlotEvents(args);
            } else {
                helpers.updatePlot(args);
            }
        }

        helpers.createSelectionsTable(args);
        helpers.updateChartTitle(args.chartTitle, args.isProxy);
        helpers.updateSeriesAndUnitElements(args.selectedSeries, args.selectedUnit);
        helpers.updateUnitElements(args.selectedUnit);
        helpers.updateTimeSeriesAttributes(args.timeSeriesAttributes);

        VIEW._dataCompleteArgs = args;
    });

    MODEL.onFieldsComplete.attach(function (sender, args) {

        helpers.initialiseFields(args);

        if (args.hasGeoData && args.showMap) {
            VIEW._mapView = new mapView();
            VIEW._mapView.initialise(
                args.indicatorId,
                args.precision,
                args.precisionItems,
                OPTIONS.decimalSeparator,
                args.dataSchema,
                VIEW.helpers,
                MODEL.helpers,
                args.chartTitles,
                args.startValues,
                args.proxy,
                args.proxySerieses,
            );
        }
    });

    MODEL.onUnitsComplete.attach(function (sender, args) {

        helpers.initialiseUnits(args);
    });

    if (MODEL.onSeriesesComplete) {

        MODEL.onSeriesesComplete.attach(function (sender, args) {
            helpers.initialiseSerieses(args);
        });
    }

    MODEL.onFieldsCleared.attach(function (sender, args) {

        $(OPTIONS.rootElement).find(':checkbox').prop('checked', false);
        $(OPTIONS.rootElement).find('#clear')
            .addClass('disabled')
            .attr('aria-disabled', 'true')
            .attr('disabled', 'disabled');

        // reset available/unavailable fields
        helpers.updateWithSelectedFields();

        $(OPTIONS.rootElement).find('.selected').css('width', '0');
    });

    MODEL.onSelectionUpdate.attach(function (sender, args) {

        if (args.selectedFields.length) {
            $(OPTIONS.rootElement).find('#clear')
                .removeClass('disabled')
                .attr('aria-disabled', 'false')
                .removeAttr('disabled');
        }
        else {
            $(OPTIONS.rootElement).find('#clear')
                .addClass('disabled')
                .attr('aria-disabled', 'true')
                .attr('disabled', 'disabled');
        }

        // loop through the available fields:
        $('.variable-selector').each(function (index, element) {
            var currentField = $(element).data('field');
            var element = $(OPTIONS.rootElement).find('.variable-selector[data-field="' + currentField + '"]');

            // is this an allowed field:
            if (args.allowedFields.includes(currentField)) {
                $(element).removeClass('disallowed');
                $(element).find('> button').removeAttr('aria-describedby');
            }
            else {
                $(element).addClass('disallowed');
                $(element).find('> button').attr('aria-describedby', 'variable-hint-' + currentField);
            }
        });
    });

    MODEL.onFieldsStatusUpdated.attach(function (sender, args) {

        _.each(args.data, function (fieldGroup) {
            _.each(fieldGroup.values, function (fieldItem) {
                var element = $(OPTIONS.rootElement).find(':checkbox[value="' + fieldItem.value + '"][data-field="' + fieldGroup.field + '"]');
                element.parent().addClass(fieldItem.state).attr('data-has-data', fieldItem.hasData);
            });
            // Indicate whether the fieldGroup had any data.
            var fieldGroupElement = $(OPTIONS.rootElement).find('.variable-selector[data-field="' + fieldGroup.field + '"]');
            fieldGroupElement.attr('data-has-data', fieldGroup.hasData);
            var fieldGroupButton = fieldGroupElement.find('> button'),
                describedByCurrent = fieldGroupButton.attr('aria-describedby') || '',
                noDataHintId = 'no-data-hint-' + fieldGroup.field.replace(/ /g, '-');
            if (!fieldGroup.hasData && !describedByCurrent.includes(noDataHintId)) {
                fieldGroupButton.attr('aria-describedby', describedByCurrent + ' ' + noDataHintId);
            }
            else {
                fieldGroupButton.attr('aria-describedby', describedByCurrent.replace(noDataHintId, ''));
            }

            // Re-sort the items.
            helpers.sortFieldGroup(fieldGroupElement);
        });
    });

    $(OPTIONS.rootElement).on('click', '#clear', function () {
        MODEL.clearSelectedFields();
    });

    $(OPTIONS.rootElement).on('click', '#fields label', function (e) {

        if (!$(this).closest('.variable-selector').hasClass('disallowed')) {
            $(this).find(':checkbox').trigger('click');
        }

        e.preventDefault();
        e.stopPropagation();
    });

    $(OPTIONS.rootElement).on('change', '#units input', function () {
        MODEL.updateSelectedUnit($(this).val());
    });

    $(OPTIONS.rootElement).on('change', '#serieses input', function () {
        MODEL.updateSelectedSeries($(this).val());
    });

    $(OPTIONS.rootElement).on('click', '.variable-options button', function (e) {
        var type = $(this).data('type');
        var $options = $(this).closest('.variable-options').find(':checkbox');

        // The clear button can clear all checkboxes.
        if (type == 'clear') {
            $options.prop('checked', false);
        }
        // The select button must only select checkboxes that have data.
        if (type == 'select') {
            $options.parent().not('[data-has-data=false]').find(':checkbox').prop('checked', true)
        }

        helpers.updateWithSelectedFields();
        e.stopPropagation();
    });

    $(OPTIONS.rootElement).on('click', ':checkbox', function (e) {

        // don't permit disallowed selections:
        if ($(this).closest('.variable-selector').hasClass('disallowed')) {
            return;
        }

        helpers.updateWithSelectedFields();
        e.stopPropagation();
    });

    $(OPTIONS.rootElement).on('click', '.variable-selector', function (e) {

        var $button = $(e.target).closest('button');
        var $options = $(this).find('.variable-options');

        if ($options.is(':visible')) {
            $options.hide();
            $button.attr('aria-expanded', 'false');
        }
        else {
            $options.show();
            $button.attr('aria-expanded', 'true');
        }

        e.stopPropagation();
    });
};
var indicatorController = function (model, view) {
  this._model = model;
  this._view = view;
};

indicatorController.prototype = {
  initialise: function () {
    this._model.initialise();
  }
};
var indicatorInit = function () {
    if ($('#indicatorData').length) {
        var domData = $('#indicatorData').data();

        if (domData.showdata) {

            $('.async-loading').each(function (i, obj) {
                $(obj).append($('<img />').attr('src', $(obj).data('img')).attr('alt', translations.indicator.loading));
            });

            var remoteUrl = '/comb/' + domData.id + '.json';
            if (opensdg.remoteDataBaseUrl !== '/') {
                remoteUrl = opensdg.remoteDataBaseUrl + remoteUrl;
            }

            $.ajax({
                url: remoteUrl,
                success: function (res) {

                    $('.async-loading').remove();
                    $('.async-loaded').show();

                    var model = new indicatorModel({
                        data: res.data,
                        edgesData: res.edges,
                        showMap: domData.showmap,
                        country: domData.country,
                        indicatorId: domData.indicatorid,
                        shortIndicatorId: domData.id,
                        chartTitle: domData.charttitle,
                        chartTitles: domData.charttitles,
                        measurementUnit: domData.measurementunit,
                        xAxisLabel: domData.xaxislabel,
                        showData: domData.showdata,
                        graphType: domData.graphtype,
                        graphTypes: domData.graphtypes,
                        startValues: domData.startvalues,
                        graphLimits: domData.graphlimits,
                        stackedDisaggregation: domData.stackeddisaggregation,
                        graphAnnotations: domData.graphannotations,
                        graphTargetLines: domData.graphtargetlines,
                        graphSeriesBreaks: domData.graphseriesbreaks,
                        indicatorDownloads: domData.indicatordownloads,
                        dataSchema: domData.dataschema,
                        compositeBreakdownLabel: domData.compositebreakdownlabel,
                        precision: domData.precision,
                        proxy: domData.proxy,
                        proxySeries: domData.proxyseries,
                    });
                    var view = new indicatorView(model, {
                        rootElement: '#indicatorData',
                        legendElement: '#plotLegend',
                        decimalSeparator: '',
                        maxChartHeight: 420,
                        tableColumnDefs: [
                            { maxCharCount: 25 }, // nowrap
                            { maxCharCount: 35, width: 200 },
                            { maxCharCount: Infinity, width: 250 }
                        ]
                    });
                    var controller = new indicatorController(model, view);
                    controller.initialise();
                }
            });
        }
    }
};
$(document).ready(function() {
    $('.nav-tabs').each(function() {
        var tabsList = $(this);

        // Allow clicking on the <li> to trigger tab click.
        tabsList.find('li').click(function(event) {
            if (event.target.tagName === 'LI') {
                $(event.target).find('> button').click();
            }
        });
    });
});
$(document).ready(function() {
    $('.nav-tabs').each(function() {
        var tabsList = $(this);
        var tabs = tabsList.find('li > button');
        var panes = tabsList.parent().find('.tab-pane');

        panes.attr({
            'role': 'tabpanel',
            'aria-hidden': 'true',
            'tabindex': '0',
        }).hide();

        tabsList.attr({
            'role': 'tablist',
        });

        tabs.each(function(idx) {
            var tab = $(this);
            var tabId = 'tab-' + tab.attr('data-bs-target').slice(1);
            var pane = tabsList.parent().find(tab.attr('data-bs-target'));

            tab.attr({
                'id': tabId,
                'role': 'tab',
                'aria-selected': 'false',
                'tabindex': '-1',
            }).parent().attr('role', 'presentation');

            pane.attr('aria-labelledby', tabId);

            tab.click(function(e) {
                e.preventDefault();

                tabsList.find('> li.active')
                    .removeClass('active')
                    .find('> button')
                    .attr({
                        'aria-selected': 'false',
                        'tabindex': '-1',
                    })
                    .removeClass('active');

                panes.filter(':visible').attr({
                    'aria-hidden': 'true',
                }).hide();

                pane.attr({
                    'aria-hidden': 'false',
                }).show();

                tab.attr({
                    'aria-selected': 'true',
                    'tabindex': '0',
                }).parent().addClass('active');
                tab.focus();
            });
        });

        // Show the first tabPanel
        panes.first().attr('aria-hidden', 'false').show();

        // Set state for the first tabsList li
        tabsList.find('li:first').addClass('active').find(' > button').attr({
            'aria-selected': 'true',
            'tabindex': '0',
        });

        // Set keydown events on tabList item for navigating tabs
        tabsList.delegate('button', 'keydown', function(e) {
            var tab = $(this);
            switch (e.which) {
                case 37:
                    if (tab.parent().prev().length != 0) {
                        tab.parent().prev().find('> button').click();
                        e.preventDefault();
                    }
                    else {
                        tabsList.find('li:last > button').click();
                        e.preventDefault();
                    }
                    break;
                case 39:
                    if (tab.parent().next().length != 0) {
                        tab.parent().next().find('> button').click();
                        e.preventDefault();
                    }
                    else {
                        tabsList.find('li:first > button').click();
                        e.preventDefault();
                    }
                    break;
            }
        });
    });
});
var indicatorSearch = function() {

  function sanitizeInput(input) {
    if (input === null) {
      return null;
    }
    var doc = new DOMParser().parseFromString(input, 'text/html');
    var stripped = doc.body.textContent || "";
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
        "`": '&grave;',
    };
    var reg = /[&<>"'/`]/ig;
    return stripped.replace(reg, function(match) {
      return map[match];
    });
  }

  var urlParams = new URLSearchParams(window.location.search);
  var searchTerms = sanitizeInput(urlParams.get('q'));
  if (searchTerms !== null) {
    document.getElementById('search-bar-on-page').value = searchTerms;
    document.getElementById('search-term').innerHTML = searchTerms;

    var searchTermsToUse = searchTerms;
    // This is to allow for searching by indicator with dashes.
    if (searchTerms.split('-').length == 3 && searchTerms.length < 15) {
      // Just a best-guess check to see if the user intended to search for an
      // indicator ID.
      searchTermsToUse = searchTerms.replace(/-/g, '.');
    }

    var useLunr = typeof window.lunr !== 'undefined';
    if (useLunr && opensdg.language != 'en') {
      if (typeof lunr[opensdg.language] === 'undefined') {
        useLunr = false;
      }
    }

    // Recognize an indicator id as a special case that does not need Lunr.
    var searchWords = searchTermsToUse.split(' '),
        indicatorIdParts = searchWords[0].split('.'),
        isIndicatorSearch = (searchWords.length === 1 && indicatorIdParts.length >= 3);
    if (isIndicatorSearch) {
      useLunr = false;
    }

    var results = [];
    var alternativeSearchTerms = [];
    var noTermsProvided = (searchTerms === '');

    if (useLunr && !noTermsProvided) {
      // Engish-specific tweak for words separated only by commas.
      if (opensdg.language == 'en') {
        lunr.tokenizer.separator = /[\s\-,]+/
      }

      var searchIndex = lunr(function () {
        if (opensdg.language != 'en' && lunr[opensdg.language]) {
          this.use(lunr[opensdg.language]);
        }
        this.use(storeUnstemmed);
        this.ref('url');
        // Index the expected fields.
        this.field('title', getSearchFieldOptions('title'));
        this.field('content', getSearchFieldOptions('content'));
        this.field('id', getSearchFieldOptions('id'));
        // Index any extra fields.
        var i;
        for (i = 0; i < opensdg.searchIndexExtraFields.length; i++) {
          var extraField = opensdg.searchIndexExtraFields[i];
          this.field(extraField, getSearchFieldOptions(extraField));
        }
        // Index all the documents.
        for (var ref in opensdg.searchItems) {
          this.add(opensdg.searchItems[ref]);
        };
      });

      // Perform the search.
      var results = searchIndex.search(searchTermsToUse);

      // If we didn't find anything, get progressively "fuzzier" to look for
      // alternative search term options.
      if (!results.length > 0) {
        for (var fuzziness = 1; fuzziness < 5; fuzziness++) {
          var fuzzierQuery = getFuzzierQuery(searchTermsToUse, fuzziness);
          var alternativeResults = searchIndex.search(fuzzierQuery);
          if (alternativeResults.length > 0) {
            var matchedTerms = getMatchedTerms(alternativeResults);
            if (matchedTerms) {
              alternativeSearchTerms = matchedTerms;
            }
            break;
          }
        }
      }
    }
    else if (!noTermsProvided) {
      // Non-Lunr basic search functionality.
      results = _.filter(opensdg.searchItems, function(item) {
        var i, match = false;
        if (item.title) {
          match = match || item.title.indexOf(searchTermsToUse) !== -1;
        }
        if (item.content) {
          match = match || item.content.indexOf(searchTermsToUse) !== -1;
        }
        for (i = 0; i < opensdg.searchIndexExtraFields.length; i++) {
          var extraField = opensdg.searchIndexExtraFields[i];
          if (typeof item[extraField] !== 'undefined') {
            match = match || item[extraField].indexOf(searchTermsToUse) !== -1;
          }
        }
        return match;
      });
      // Mimic what Lunr does.
      results = _.map(results, function(item) {
        return { ref: item.url }
      });
    }

    var resultItems = [];

    results.forEach(function(result) {
      var doc = opensdg.searchItems[result.ref]
      // Truncate the contents.
      if (doc.content.length > 400) {
        doc.content = doc.content.substring(0, 400) + '...';
      }
      // Indicate the matches.
      doc.content = doc.content.replace(new RegExp('(' + escapeRegExp(searchTerms) + ')', 'gi'), '<span class="match">$1</span>');
      doc.title = doc.title.replace(new RegExp('(' + escapeRegExp(searchTerms) + ')', 'gi'), '<span class="match">$1</span>');
      resultItems.push(doc);
    });

    $('.loader').hide();

    // Print the results using a template.
    var template = _.template(
      $("script.results-template").html()
    );
    $('div.results').html(template({
      searchResults: resultItems,
      resultsCount: resultItems.length,
      didYouMean: (alternativeSearchTerms.length > 0) ? alternativeSearchTerms : false,
    }));

    // Hide the normal header search.
    $('.header-search-bar').hide();
  }

  // Helper function to make a search query "fuzzier", using the ~ syntax.
  // See https://lunrjs.com/guides/searching.html#fuzzy-matches.
  function getFuzzierQuery(query, amountOfFuzziness) {
    return query
      .split(' ')
      .map(function(x) { return x + '~' + amountOfFuzziness; })
      .join(' ');
  }

  // Helper function to get the matched words from a result set.
  function getMatchedTerms(results) {
    var matchedTerms = {};
    results.forEach(function(result) {
      Object.keys(result.matchData.metadata).forEach(function(stemmedTerm) {
        Object.keys(result.matchData.metadata[stemmedTerm]).forEach(function(fieldName) {
          result.matchData.metadata[stemmedTerm][fieldName].unstemmed.forEach(function(unstemmedTerm) {
            matchedTerms[unstemmedTerm] = true;
          });
        });
      });
    });
    return Object.keys(matchedTerms);
  }

  // Helper function to get a boost score, if any.
  function getSearchFieldOptions(field) {
    var opts = {}
    var fieldBoost = opensdg.searchIndexBoost.find(function(boost) {
      return boost.field === field;
    });
    if (fieldBoost) {
      opts['boost'] = parseInt(fieldBoost.boost)
    }
    return opts
  }

  // Used to highlight search term matches on the screen.
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/gi, "\\$&");
  };

  // Define a pipeline function that keeps the unstemmed word.
  // See: https://github.com/olivernn/lunr.js/issues/287#issuecomment-454923675
  function storeUnstemmed(builder) {
    function pipelineFunction(token) {
      token.metadata['unstemmed'] = token.toString();
      return token;
    };
    lunr.Pipeline.registerFunction(pipelineFunction, 'storeUnstemmed');
    var firstPipelineFunction = builder.pipeline._stack[0];
    builder.pipeline.before(firstPipelineFunction, pipelineFunction);
    builder.metadataWhitelist.push('unstemmed');
  }
};

$(function() {

  var $el = $('#indicator_search');
  $('#jump-to-search').show();
  $('#jump-to-search a').click(function() {
    if($el.is(':hidden')) {
      $('.navbar span[data-target="search"]').click();
    }
    $el.focus();
  });

  indicatorSearch();
});

// Add the cookie settings link in the footer.
$(document).ready(function() {
if (klaroConfig && klaroConfig.noAutoLoad !== true) {
  var cookieLink = $('<li class="cookie-settings"><a role="button" tabindex="0">' + translations.cookies.cookie_settings + '</a></li>');
  $(cookieLink).click(function() {
    klaro.show();
  });
  $(cookieLink).keypress(function(event) {
    if (event.key === 'Enter') {
      klaro.show();
    }
  });
  $('#footerLinks ul').append(cookieLink);
}
});

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js */
"document"in self&&("classList"in document.createElement("_")&&(!document.createElementNS||"classList"in document.createElementNS("http://www.w3.org/2000/svg","g"))||!function(t){"use strict";if("Element"in t){var e="classList",n="prototype",i=t.Element[n],s=Object,r=String[n].trim||function(){return this.replace(/^\s+|\s+$/g,"")},o=Array[n].indexOf||function(t){for(var e=0,n=this.length;n>e;e++)if(e in this&&this[e]===t)return e;return-1},a=function(t,e){this.name=t,this.code=DOMException[t],this.message=e},c=function(t,e){if(""===e)throw new a("SYNTAX_ERR","An invalid or illegal string was specified");if(/\s/.test(e))throw new a("INVALID_CHARACTER_ERR","String contains an invalid character");return o.call(t,e)},l=function(t){for(var e=r.call(t.getAttribute("class")||""),n=e?e.split(/\s+/):[],i=0,s=n.length;s>i;i++)this.push(n[i]);this._updateClassName=function(){t.setAttribute("class",""+this)}},u=l[n]=[],h=function(){return new l(this)};if(a[n]=Error[n],u.item=function(t){return this[t]||null},u.contains=function(t){return t+="",-1!==c(this,t)},u.add=function(){var t,e=arguments,n=0,i=e.length,s=!1;do t=e[n]+"",-1===c(this,t)&&(this.push(t),s=!0);while(++n<i);s&&this._updateClassName()},u.remove=function(){var t,e,n=arguments,i=0,s=n.length,r=!1;do for(t=n[i]+"",e=c(this,t);-1!==e;)this.splice(e,1),r=!0,e=c(this,t);while(++i<s);r&&this._updateClassName()},u.toggle=function(t,e){t+="";var n=this.contains(t),i=n?e!==!0&&"remove":e!==!1&&"add";return i&&this[i](t),e===!0||e===!1?e:!n},u.toString=function(){return this.join(" ")},s.defineProperty){var f={get:h,enumerable:!0,configurable:!0};try{s.defineProperty(i,e,f)}catch(g){(void 0===g.number||-2146823252===g.number)&&(f.enumerable=!1,s.defineProperty(i,e,f))}}else s[n].__defineGetter__&&i.__defineGetter__(e,h)}}(self),function(){"use strict";var t=document.createElement("_");if(t.classList.add("c1","c2"),!t.classList.contains("c2")){var e=function(t){var e=DOMTokenList.prototype[t];DOMTokenList.prototype[t]=function(t){var n,i=arguments.length;for(n=0;i>n;n++)t=arguments[n],e.call(this,t)}};e("add"),e("remove")}if(t.classList.toggle("c3",!1),t.classList.contains("c3")){var n=DOMTokenList.prototype.toggle;DOMTokenList.prototype.toggle=function(t,e){return 1 in arguments&&!this.contains(t)==!e?e:n.call(this,t)}}t=null}());/*! modernizr 3.5.0 (Custom Build) | MIT *
 * https://modernizr.com/download/?-blobconstructor-localstorage-setclasses !*/
 !function(e,n,o){function s(e,n){return typeof e===n}function t(){var e,n,o,t,a,l,c;for(var f in i)if(i.hasOwnProperty(f)){if(e=[],n=i[f],n.name&&(e.push(n.name.toLowerCase()),n.options&&n.options.aliases&&n.options.aliases.length))for(o=0;o<n.options.aliases.length;o++)e.push(n.options.aliases[o].toLowerCase());for(t=s(n.fn,"function")?n.fn():n.fn,a=0;a<e.length;a++)l=e[a],c=l.split("."),1===c.length?Modernizr[c[0]]=t:(!Modernizr[c[0]]||Modernizr[c[0]]instanceof Boolean||(Modernizr[c[0]]=new Boolean(Modernizr[c[0]])),Modernizr[c[0]][c[1]]=t),r.push((t?"":"no-")+c.join("-"))}}function a(e){var n=c.className,o=Modernizr._config.classPrefix||"";if(f&&(n=n.baseVal),Modernizr._config.enableJSClass){var s=new RegExp("(^|\\s)"+o+"no-js(\\s|$)");n=n.replace(s,"$1"+o+"js$2")}Modernizr._config.enableClasses&&(n+=" "+o+e.join(" "+o),f?c.className.baseVal=n:c.className=n)}var r=[],i=[],l={_version:"3.5.0",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(e,n){var o=this;setTimeout(function(){n(o[e])},0)},addTest:function(e,n,o){i.push({name:e,fn:n,options:o})},addAsyncTest:function(e){i.push({name:null,fn:e})}},Modernizr=function(){};Modernizr.prototype=l,Modernizr=new Modernizr,Modernizr.addTest("blobconstructor",function(){try{return!!new Blob}catch(e){return!1}},{aliases:["blob-constructor"]}),Modernizr.addTest("localstorage",function(){var e="modernizr";try{return localStorage.setItem(e,e),localStorage.removeItem(e),!0}catch(n){return!1}});var c=n.documentElement,f="svg"===c.nodeName.toLowerCase();t(),a(r),delete l.addTest,delete l.addAsyncTest;for(var u=0;u<Modernizr._q.length;u++)Modernizr._q[u]();e.Modernizr=Modernizr}(window,document);/*
 * Leaflet selection legend.
 *
 * This is a Leaflet control designed to keep track of selected layers on a map
 * and visualize the selections as stacked bar graphs.
 */
(function () {
  "use strict";

  if (typeof L === 'undefined') {
    return;
  }

  L.Control.SelectionLegend = L.Control.extend({

    initialize: function(plugin) {
      this.selections = [];
      this.plugin = plugin;
    },

    addSelection: function(selection) {
      this.selections.push(selection);
      this.update();
    },

    removeSelection: function(selection) {
      var index = this.selections.indexOf(selection);
      this.selections.splice(index, 1);
      this.update();
    },

    isSelected: function(selection) {
      return (this.selections.indexOf(selection) !== -1);
    },

    onAdd: function() {
      var div = L.DomUtil.create('div', 'selection-legend');
      this.legendDiv = div;
      this.resetSwatches();
      return div;
    },

    renderSwatches: function() {
      var controlTpl = '' +
        '<dl id="selection-list"></dl>' +
        '<div class="legend-footer">' +
          '<div class="legend-swatches">' +
            '{legendSwatches}' +
          '</div>' +
          '<div class="legend-values">' +
            '<span class="legend-value left">{lowValue}</span>' +
            '<span class="arrow left"></span>' +
            '<span class="legend-value right">{highValue}</span>' +
            '<span class="arrow right"></span>' +
          '</div>' +
        '</div>';
      var swatchTpl = '<span class="legend-swatch" style="width:{width}%; background:{color};"></span>';
      var swatchWidth = 100 / this.plugin.options.colorRange.length;
      var swatches = this.plugin.options.colorRange.map(function(swatchColor) {
        return L.Util.template(swatchTpl, {
          width: swatchWidth,
          color: swatchColor,
        });
      }).join('');
      var context = { indicatorId: this.plugin.indicatorId };
      return L.Util.template(controlTpl, {
        lowValue: this.plugin.alterData(opensdg.dataRounding(this.plugin.valueRanges[this.plugin.currentDisaggregation][0], context)),
        highValue: this.plugin.alterData(opensdg.dataRounding(this.plugin.valueRanges[this.plugin.currentDisaggregation][1], context)),
        legendSwatches: swatches,
      });
    },

    resetSwatches: function() {
      this.legendDiv.innerHTML = this.renderSwatches();
    },

    update: function() {
      var selectionList = L.DomUtil.get('selection-list');
      var selectionTplHighValue = '' +
        '<dt class="selection-name"><span class="selection-name-background">{name}</span></dt>' +
        '<dd class="selection-value-item {valueStatus}">' +
          '<span class="selection-bar" style="background-color: {color}; width: {percentage}%;">' +
            '<span class="selection-value selection-value-high">' +
              '<span class="selection-value-high-background">{value}</span>' +
            '</span>' +
          '</span>' +
          '<i class="selection-close fa fa-remove"></i>' +
        '</dd>';
      var selectionTplLowValue = '' +
      '<dt class="selection-name"><span class="selection-name-background">{name}</span></dt>' +
      '<dd class="selection-value-item {valueStatus}">' +
        '<span class="selection-bar" style="background-color: {color}; width: {percentage}%;"></span>' +
        '<span class="selection-value selection-value-low" style="left: {percentage}%;">' +
          '<span class="selection-value-low-background">{value}</span>' +
        '</span>' +
        '<i class="selection-close fa fa-remove"></i>' +
      '</dd>';
      var plugin = this.plugin;
      var valueRange = this.plugin.valueRanges[this.plugin.currentDisaggregation];
      selectionList.innerHTML = this.selections.map(function(selection) {
        var value = plugin.getData(selection.feature.properties);
        var color = '#FFFFFF';
        var percentage, valueStatus;
        var templateToUse = selectionTplHighValue;
        if (typeof value === 'number') {
          color = plugin.colorScale(value).hex();
          valueStatus = 'has-value';
          var fraction = (value - valueRange[0]) / (valueRange[1] - valueRange[0]);
          percentage = Math.round(fraction * 100);
          if (percentage <= 50) {
            templateToUse = selectionTplLowValue;
          }
        }
        else {
          value = '';
          valueStatus = 'no-value';
          percentage = 0;
        }
        return L.Util.template(templateToUse, {
          name: selection.feature.properties.name,
          valueStatus: valueStatus,
          percentage: percentage,
          value: plugin.alterData(value),
          color: color,
        });
      }).join('');

      // Assign click behavior.
      var control = this,
          clickSelector = '#selection-list dd';
      $(clickSelector).click(function(e) {
        var index = $(clickSelector).index(this),
            selection = control.selections[index];
        control.removeSelection(selection);
        control.plugin.unhighlightFeature(selection);
      });
    }

  });

  // Factory function for this class.
  L.Control.selectionLegend = function(plugin) {
    return new L.Control.SelectionLegend(plugin);
  };
}());

/*
 * Leaflet year Slider.
 *
 * This is merely a specific configuration of Leaflet of L.TimeDimension.
 * See here: https://github.com/socib/Leaflet.TimeDimension
 */
(function () {
  "use strict";

  if (typeof L === 'undefined') {
    return;
  }

  var defaultOptions = {
    // YearSlider options.
    yearChangeCallback: null,
    years: [],
    // TimeDimensionControl options.
    timeSliderDragUpdate: true,
    speedSlider: false,
    position: 'bottomleft',
    playButton: false,
  };

  L.Control.YearSlider = L.Control.TimeDimension.extend({

    // Hijack the displayed date format.
    _getDisplayDateFormat: function(date){
      var time = date.toISOString().slice(0, 10);
      var match = this.options.years.find(function(y) { return y.time == time; });
      if (match) {
        return match.display;
      }
      else {
        return date.getFullYear();
      }
    },

    // Override the _createButton method to prevent the date from being a link.
    _createButton: function(title, container) {
      if (title === 'Date') {
        var span = L.DomUtil.create('span', this.options.styleNS + ' timecontrol-' + title.toLowerCase(), container);
        span.title = title;
        return span;
      }
      else {
        return L.Control.TimeDimension.prototype._createButton.call(this, title, container);
      }
    },

    // Override the _createSliderTime method to give the slider accessibility features.
    _createSliderTime: function(className, container) {
      var knob = L.Control.TimeDimension.prototype._createSliderTime.call(this, className, container),
          control = this,
          times = this._timeDimension.getAvailableTimes(),
          years = times.map(function(time) {
            var date = new Date(time);
            return control._getDisplayDateFormat(date);
          }),
          minYear = years[0],
          maxYear = years[years.length - 1],
          knobElement = knob._element;

      control._buttonBackward.title = translations.indicator.map_slider_back;
      control._buttonBackward.setAttribute('aria-label', control._buttonBackward.title);
      control._buttonForward.title = translations.indicator.map_slider_forward;
      control._buttonForward.setAttribute('aria-label', control._buttonForward.title);

      knobElement.setAttribute('tabindex', '0');
      knobElement.setAttribute('role', 'slider');
      knobElement.setAttribute('aria-label', translations.indicator.map_slider_keyboard);
      knobElement.title = translations.indicator.map_slider_mouse;
      knobElement.setAttribute('aria-valuemin', minYear);
      knobElement.setAttribute('aria-valuemax', maxYear);

      function updateSliderAttributes() {
        var yearIndex = 0;
        if (knob.getValue()) {
          yearIndex = knob.getValue();
        }
        knobElement.setAttribute('aria-valuenow', years[yearIndex]);
      }
      updateSliderAttributes();

      // Give the slider left/right keyboard functionality.
      knobElement.addEventListener('keydown', function(e) {
        if (e.which === 37 || e.which === 40) {
          var min = knob.getMinValue();
          var value = knob.getValue();
          value = value - 1;
          if (value >= min) {
            knob.setValue(value);
            control._sliderTimeValueChanged(value);
            updateSliderAttributes();
          }
          e.preventDefault();
        }
        else if (e.which === 39 || e.which === 38) {
          var max = knob.getMaxValue();
          var value = knob.getValue();
          value = value + 1;
          if (value <= max) {
            knob.setValue(value);
            control._sliderTimeValueChanged(value);
            updateSliderAttributes();
          }
          e.preventDefault();
        }
      });
      return knob;
    }

  });

  // Helper function to compose the full widget.
  L.Control.yearSlider = function(options) {
    var years = getYears(options.years);
    // Extend the defaults.
    options = L.Util.extend(defaultOptions, options);
    // Hardcode the timeDimension to year intervals.
    options.timeDimension = new L.TimeDimension({
      // We pad our years to at least January 2nd, so that timezone issues don't
      // cause any problems. This converts the array of years into a comma-
      // delimited string of YYYY-MM-DD dates.
      times: years.map(function(y) { return y.time }).join(','),
      //Set the map to the most recent year
      currentTime: new Date(years.slice(-1)[0].time).getTime(),
    });
    // Listen for time changes.
    if (typeof options.yearChangeCallback === 'function') {
      options.timeDimension.on('timeload', options.yearChangeCallback);
    };
    // Also pass in another callback for managing the back/forward buttons.
    options.timeDimension.on('timeload', function(e) {
      var currentTimeIndex = this.getCurrentTimeIndex(),
          availableTimes = this.getAvailableTimes(),
          $backwardButton = $('.timecontrol-backward'),
          $forwardButton = $('.timecontrol-forward'),
          isFirstTime = (currentTimeIndex === 0),
          isLastTime = (currentTimeIndex === availableTimes.length - 1);
      $backwardButton
        .attr('disabled', isFirstTime)
        .attr('aria-disabled', isFirstTime);
      $forwardButton
        .attr('disabled', isLastTime)
        .attr('aria-disabled', isLastTime);
    });
    // Pass in our years for later use.
    options.years = years;
    // Return the control.
    return new L.Control.YearSlider(options);
  };

  function isYear(year) {
    var parsedInt = parseInt(year, 10);
    return /^\d+$/.test(year) && parsedInt > 1900 && parsedInt < 3000;
  }

  function getYears(years) {
    // Support an array of years or an array of strings starting with years.
    var day = 2;
    return years.map(function(year) {
      var mapped = {
        display: year,
        time: year,
      };
      // Usually this is a year.
      if (isYear(year)) {
        mapped.time = year + '-01-02';
        // Start over that day variable.
        day = 2;
      }
      // Otherwise we get the year from the beginning of the string.
      else {
        var delimiters = ['-', '.', ' ', '/'];
        for (var i = 0; i < delimiters.length; i++) {
          var parts = year.split(delimiters[i]);
          if (parts.length > 1 && isYear(parts[0])) {
            mapped.time = parts[0] + '-01-0' + day;
            day += 1;
            break;
          }
        }
      }
      return mapped;
    });
  }
}());
/*
 * Leaflet fullscreenAccessible.
 *
 * This is an override of L.Control.Fullscreen for accessibility fixes.
 * See here: https://github.com/Leaflet/Leaflet.fullscreen
 */
(function () {
    "use strict";

    if (typeof L === 'undefined') {
        return;
    }

    L.Control.FullscreenAccessible = L.Control.Fullscreen.extend({
        onAdd: function(map) {
            var container = L.Control.Fullscreen.prototype.onAdd.call(this, map);
            this.link.setAttribute('role', 'button');
            this.link.setAttribute('aria-label', this.link.title);
            this.link.innerHTML = '<i class="fa fa-expand" aria-hidden="true"></i>';
            return container;
        },
        _toggleTitle: function() {
            L.Control.Fullscreen.prototype._toggleTitle.call(this);
            this.link.setAttribute('aria-label', this.link.title);
            var faClass = this._map.isFullscreen() ? 'fa-compress' : 'fa-expand'
            this.link.innerHTML = '<i class="fa ' + faClass + '" aria-hidden="true"></i>';
        }
    });

  }());
/*
 * Leaflet search.
 *
 * This is customized version of L.Control.Search.
 * See here: https://github.com/stefanocudini/leaflet-search
 */
(function () {
  "use strict";

  if (typeof L === 'undefined') {
    return;
  }

  L.Control.SearchAccessible = L.Control.Search.extend({
    onAdd: function(map) {
      var container = L.Control.Search.prototype.onAdd.call(this, map);

      this._input.setAttribute('aria-label', this._input.placeholder);
      this._input.removeAttribute('role');
      this._tooltip.setAttribute('aria-label', this._input.placeholder);

      this._button.setAttribute('role', 'button');
      this._accessibleCollapse();
      this._button.innerHTML = '<i class="fa fa-search" aria-hidden="true"></i>';

      this._cancel.setAttribute('role', 'button');
      this._cancel.title = translations.indicator.map_search_cancel;
      this._cancel.setAttribute('aria-label', this._cancel.title);
      this._cancel.innerHTML = '<i class="fa fa-close" aria-hidden="true"></i>';

      // Prevent the delayed collapse when tabbing out of the input box.
      L.DomEvent.on(this._cancel, 'focus', this.collapseDelayedStop, this);

      return container;
    },
    _createInput: function (text, className) {
      var input = L.Control.Search.prototype._createInput.call(this, text, className);
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', 'map-search-listbox');
      var combobox = L.DomUtil.create('div', '', this._container);
      combobox.setAttribute('role', 'combobox');
      combobox.setAttribute('aria-expanded', 'false');
      combobox.setAttribute('aria-owns', 'map-search-listbox');
      combobox.setAttribute('aria-haspopup', 'listbox');
      combobox.id = 'map-search-combobox';
      combobox.append(input);
      this._combobox = combobox;
      return input;
    },
    _createTooltip: function(className) {
      var tooltip = L.Control.Search.prototype._createTooltip.call(this, className);
      tooltip.id = 'map-search-listbox';
      tooltip.setAttribute('role', 'listbox');
      return tooltip;
    },
    _accessibleExpand: function() {
      this._accessibleDescription(translations.indicator.map_search_hide);
      this._button.setAttribute('aria-expanded', 'true');
    },
    _accessibleCollapse: function() {
      this._accessibleDescription(translations.indicator.map_search_show);
      this._button.setAttribute('aria-expanded', 'false');
      this._button.focus();
    },
    _accessibleDescription: function(description) {
      this._button.title = description;
      this._button.setAttribute('aria-label', description);
    },
    expand: function(toggle) {
      L.Control.Search.prototype.expand.call(this, toggle);
      this._accessibleExpand();
      return this;
    },
    collapse: function() {
      L.Control.Search.prototype.collapse.call(this);
      this._accessibleCollapse();
      return this;
    },
    cancel: function() {
      L.Control.Search.prototype.cancel.call(this);
      this._accessibleExpand();
      this._combobox.setAttribute('aria-expanded', 'false');
      this._input.removeAttribute('aria-activedescendant');
      return this;
    },
    showTooltip: function(records) {
      L.Control.Search.prototype.showTooltip.call(this, records);
      this._accessibleDescription(translations.indicator.map_search);
      this._button.removeAttribute('aria-expanded');
      this._combobox.setAttribute('aria-expanded', 'true');
      if (this._countertips > 0) {
        this._input.setAttribute('aria-activedescendant', this._tooltip.childNodes[0].id);
      }
      return this._countertips;
    },
    _createTip: function(text, val) {
      var tip = L.Control.Search.prototype._createTip.call(this, text, val);
      tip.setAttribute('role', 'option');
      tip.id = 'map-search-option-' + val.layer.feature.properties.geocode;
      return tip;
    },
    _handleSubmit: function(e) {
      // Prevent the enter key from immediately collapsing the search bar.
      if ((typeof e === 'undefined' || e.type === 'keyup') && this._input.value === '') {
        return;
      }
      if (this._tooltip.childNodes.length > 0 && this._input.value !== '') {
        // This is a workaround for the bug where non-exact matches
        // do not successfully search. See this Github issue:
        // https://github.com/stefanocudini/leaflet-search/issues/264
        var firstSuggestion = this._tooltip.childNodes[0].innerText;
        var firstSuggestionLower = firstSuggestion.toLowerCase();
        var userInput = this._input.value;
        var userInputLower = userInput.toLowerCase();
        if (firstSuggestion !== userInput && firstSuggestionLower.includes(userInputLower)) {
          this._input.value = firstSuggestion;
        }
      }
      L.Control.Search.prototype._handleSubmit.call(this, e);
    },
    _handleArrowSelect: function(velocity) {
      L.Control.Search.prototype._handleArrowSelect.call(this, velocity);
      var searchTips = this._tooltip.hasChildNodes() ? this._tooltip.childNodes : [];
			for (i=0; i<searchTips.length; i++) {
			  searchTips[i].setAttribute('aria-selected', 'false');
      }
      var selectedTip = searchTips[this._tooltip.currentSelection];
      if (typeof selectedTip === 'undefined') {
        selectedTip = searchTips[0];
      }
      selectedTip.setAttribute('aria-selected', 'true');
      this._input.setAttribute('aria-activedescendant', selectedTip.id);
    },
    _createAlert: function(className) {
      var alert = L.Control.Search.prototype._createAlert.call(this, className);
      alert.setAttribute('role', 'alert');
      return alert;
    }
  });
}());
/*
 * Leaflet disaggregation controls.
 *
 * This is a Leaflet control designed replicate the disaggregation
 * controls that are in the sidebar for tables and charts.
 */
(function () {
    "use strict";

    if (typeof L === 'undefined') {
        return;
    }

    L.Control.DisaggregationControls = L.Control.extend({

        options: {
            position: 'bottomleft'
        },

        initialize: function (plugin) {
            this.plugin = plugin;
            this.list = null;
            this.form = null;
            this.currentDisaggregation = 0;
            this.displayedDisaggregation = 0;
            this.needsMapUpdate = false;
            this.seriesColumn = 'Series';
            this.unitsColumn = 'Units';
            this.displayForm = false;
            this.updateDisaggregations(plugin.startValues);
        },

        updateDisaggregations: function(startValues) {
            // TODO: Not all of this needs to be done
            // at every update.
            var features = this.getFeatures();
            if (startValues && startValues.length > 0) {
                this.currentDisaggregation = this.getStartingDisaggregation(features, startValues);
                this.displayedDisaggregation = this.currentDisaggregation;
                this.needsMapUpdate = true;
            }
            this.disaggregations = this.getVisibleDisaggregations(features);
            this.fieldsInOrder = this.getFieldsInOrder();
            this.valuesInOrder = this.getValuesInOrder();
            this.allSeries = this.getAllSeries();
            this.allUnits = this.getAllUnits();
            this.allDisaggregations = this.getAllDisaggregations();
            this.hasSeries = (this.allSeries.length > 0);
            this.hasUnits = (this.allUnits.length > 0);
            this.hasDisaggregations = this.hasDissagregationsWithValues();
            this.hasDisaggregationsWithMultipleValuesFlag = this.hasDisaggregationsWithMultipleValues();
        },

        getFeatures: function() {
            return this.plugin.getVisibleLayers().toGeoJSON().features.filter(function(feature) {
                return typeof feature.properties.disaggregations !== 'undefined';
            });
        },

        getStartingDisaggregation: function(features, startValues) {
            if (features.length === 0) {
                return;
            }
            var disaggregations = features[0].properties.disaggregations,
                fields = Object.keys(disaggregations[0]),
                weighted = _.sortBy(disaggregations.map(function(disaggregation, index) {
                    var disaggClone = Object.assign({}, disaggregation);
                    disaggClone.emptyFields = 0;
                    disaggClone.index = index;
                    fields.forEach(function(field) {
                        if (disaggClone[field] == '') {
                            disaggClone.emptyFields += 1;
                        }
                    });
                    return disaggClone;
                }), 'emptyFields').reverse(),
                match = weighted.find(function(disaggregation) {
                    return _.every(startValues, function(startValue) {
                        return disaggregation[startValue.field] === startValue.value;
                    });
                });
            if (match) {
                return match.index;
            }
            else {
                return 0;
            }
        },

        getVisibleDisaggregations: function(features) {
            if (features.length === 0) {
                return [];
            }

            var disaggregations = features[0].properties.disaggregations;
            // The purpose of the rest of this function is to identiy
            // and remove any "region columns" - ie, any columns that
            // correspond exactly to names of map regions. These columns
            // are useful on charts and tables but should not display
            // on maps.
            var allKeys = Object.keys(disaggregations[0]);
            var relevantKeys = {};
            var rememberedValues = {};
            disaggregations.forEach(function(disagg) {
                for (var i = 0; i < allKeys.length; i++) {
                    var key = allKeys[i];
                    if (rememberedValues[key]) {
                        if (rememberedValues[key] !== disagg[key]) {
                            relevantKeys[key] = true;
                        }
                    }
                    rememberedValues[key] = disagg[key];
                }
            });
            relevantKeys = Object.keys(relevantKeys);
            if (features.length > 1) {
                // Any columns not already identified as "relevant" might
                // be region columns.
                var regionColumnCandidates = allKeys.filter(function(item) {
                    return relevantKeys.includes(item) ? false : true;
                });
                // Compare the column value across map regions - if it is
                // different then we assume the column is a "region column".
                // For efficiency we only check the first and second region.
                var regionColumns = regionColumnCandidates.filter(function(candidate) {
                    var region1 = features[0].properties.disaggregations[0][candidate];
                    var region2 = features[1].properties.disaggregations[0][candidate];
                    return region1 === region2 ? false : true;
                });
                // Now we can treat any non-region columns as relevant.
                regionColumnCandidates.forEach(function(item) {
                    if (!regionColumns.includes(item)) {
                        relevantKeys.push(item);
                    }
                });
            }
            relevantKeys.push(this.seriesColumn);
            relevantKeys.push(this.unitsColumn);
            var pruned = [];
            disaggregations.forEach(function(disaggregation) {
                var clone = Object.assign({}, disaggregation);
                Object.keys(clone).forEach(function(key) {
                    if (!(relevantKeys.includes(key))) {
                        delete clone[key];
                    }
                });
                pruned.push(clone);
            });
            return pruned;
        },

        update: function() {
            this.updateDisaggregations();
            this.updateList();
            if (this.displayForm) {
                this.updateForm();
            }
        },

        getFieldsInOrder: function () {
            return this.plugin.dataSchema.fields.map(function(field) {
                return field.name;
            });
        },

        getValuesInOrder: function () {
            var valuesInOrder = {};
            this.plugin.dataSchema.fields.forEach(function(field) {
                if (field.constraints && field.constraints.enum) {
                    valuesInOrder[field.name] = field.constraints.enum;
                }
            });
            return valuesInOrder;
        },

        hasDissagregationsWithValues: function () {
            var hasDisaggregations = false;
            this.allDisaggregations.forEach(function(disaggregation) {
                if (disaggregation.values.length > 0 && disaggregation.values[0] !== '') {
                    hasDisaggregations = true;
                }
            });
            return hasDisaggregations;
        },

        hasDisaggregationsWithMultipleValues: function () {
            var hasDisaggregations = false;
            this.allDisaggregations.forEach(function(disaggregation) {
                if (disaggregation.values.length > 1 && disaggregation.values[1] !== '') {
                    hasDisaggregations = true;
                }
            });
            return hasDisaggregations;
        },

        updateList: function () {
            var list = this.list;
            list.innerHTML = '';
            if (this.hasSeries) {
                var title = L.DomUtil.create('dt', 'disaggregation-title'),
                    definition = L.DomUtil.create('dd', 'disaggregation-definition'),
                    container = L.DomUtil.create('div', 'disaggregation-container');
                title.innerHTML = translations.indicator.series;
                definition.innerHTML = this.getCurrentSeries();
                container.append(title);
                container.append(definition);
                list.append(container);
            }
            if (this.hasUnits) {
                var title = L.DomUtil.create('dt', 'disaggregation-title'),
                    definition = L.DomUtil.create('dd', 'disaggregation-definition'),
                    container = L.DomUtil.create('div', 'disaggregation-container');
                title.innerHTML = translations.indicator.unit;
                definition.innerHTML = this.getCurrentUnit();
                container.append(title);
                container.append(definition);
                list.append(container);
            }
            if (this.hasDisaggregations) {
                var currentDisaggregation = this.disaggregations[this.currentDisaggregation];
                this.allDisaggregations.forEach(function(disaggregation) {
                    var title = L.DomUtil.create('dt', 'disaggregation-title'),
                        definition = L.DomUtil.create('dd', 'disaggregation-definition'),
                        container = L.DomUtil.create('div', 'disaggregation-container'),
                        field = disaggregation.field;
                    title.innerHTML = translations.t(field);
                    var disaggregationValue = currentDisaggregation[field];
                    if (disaggregationValue !== '') {
                        definition.innerHTML = disaggregationValue;
                        container.append(title);
                        container.append(definition);
                        list.append(container);
                    }
                });
            }
        },

        updateForm: function() {
            var seriesColumn = this.seriesColumn,
                unitsColumn = this.unitsColumn,
                container = this.form,
                formInputs = L.DomUtil.create('div', 'disaggregation-form-inner'),
                that = this;
            container.innerHTML = '';
            container.append(formInputs)
            L.DomEvent.disableScrollPropagation(formInputs);
            if (this.hasSeries) {
                var form = L.DomUtil.create('div', 'disaggregation-fieldset-container'),
                    legend = L.DomUtil.create('legend', 'disaggregation-fieldset-legend'),
                    fieldset = L.DomUtil.create('fieldset', 'disaggregation-fieldset');
                legend.innerHTML = translations.indicator.series;
                fieldset.append(legend);
                form.append(fieldset);
                formInputs.append(form);
                this.allSeries.forEach(function(series) {
                    var input = L.DomUtil.create('input', 'disaggregation-input');
                    input.type = 'radio';
                    input.name = 'map-' + seriesColumn;
                    input.value = series;
                    input.tabindex = 0;
                    input.checked = (series === that.getCurrentSeries()) ? 'checked' : '';
                    var label = L.DomUtil.create('label', 'disaggregation-label');
                    label.innerHTML = series;
                    if (that.plugin.proxySerieses.includes(series)) {
                        label.innerHTML += ' ' + that.plugin.viewHelpers.PROXY_PILL;
                    }
                    label.prepend(input);
                    fieldset.append(label);
                    input.addEventListener('change', function(e) {
                        that.currentDisaggregation = that.getSelectedDisaggregationIndex(seriesColumn, series);
                        that.updateForm();
                    });
                });
            }
            if (this.hasUnits) {
                var form = L.DomUtil.create('div', 'disaggregation-fieldset-container'),
                    legend = L.DomUtil.create('legend', 'disaggregation-fieldset-legend'),
                    fieldset = L.DomUtil.create('fieldset', 'disaggregation-fieldset');
                legend.innerHTML = translations.indicator.unit_of_measurement;
                fieldset.append(legend);
                form.append(fieldset);
                formInputs.append(form);
                this.allUnits.forEach(function(unit) {
                    var input = L.DomUtil.create('input', 'disaggregation-input');
                    if (that.isDisaggegrationValidGivenCurrent(unitsColumn, unit)) {
                        input.type = 'radio';
                        input.name = 'map-' + unitsColumn;
                        input.value = unit;
                        input.tabindex = 0;
                        input.checked = (unit === that.getCurrentUnit()) ? 'checked' : '';
                        var label = L.DomUtil.create('label', 'disaggregation-label');
                        label.innerHTML = unit;
                        label.prepend(input);
                        fieldset.append(label);
                        input.addEventListener('change', function(e) {
                            that.currentDisaggregation = that.getSelectedDisaggregationIndex(unitsColumn, unit);
                            that.updateForm();
                        });
                    }
                });
            }
            if (this.hasDisaggregations) {
                var currentDisaggregation = this.disaggregations[this.currentDisaggregation];
                this.allDisaggregations.forEach(function (disaggregation) {
                    var form = L.DomUtil.create('div', 'disaggregation-fieldset-container'),
                        legend = L.DomUtil.create('legend', 'disaggregation-fieldset-legend'),
                        fieldset = L.DomUtil.create('fieldset', 'disaggregation-fieldset'),
                        field = disaggregation.field;
                    legend.innerHTML = translations.t(field);
                    fieldset.append(legend);
                    form.append(fieldset);
                    formInputs.append(form);
                    disaggregation.values.forEach(function (value) {
                        var input = L.DomUtil.create('input', 'disaggregation-input');
                        if (that.isDisaggegrationValidGivenCurrent(field, value)) {
                            input.type = 'radio';
                            input.name = 'map-' + field;
                            input.value = value;
                            input.tabindex = 0;
                            input.checked = (value === currentDisaggregation[field]) ? 'checked' : '';
                            var label = L.DomUtil.create('label', 'disaggregation-label');
                            label.innerHTML = (value === '') ? translations.indicator.total : value;
                            label.prepend(input);
                            fieldset.append(label);
                            input.addEventListener('change', function(e) {
                                that.currentDisaggregation = that.getSelectedDisaggregationIndex(field, value);
                                that.updateForm();
                            });
                        }
                    });
                });
            }

            var applyButton = L.DomUtil.create('button', 'disaggregation-apply-button'),
                cancelButton = L.DomUtil.create('button', 'disaggregation-cancel-button'),
                buttonContainer = L.DomUtil.create('div', 'disaggregation-form-buttons');
            applyButton.innerHTML = translations.indicator.apply;
            buttonContainer.append(applyButton);
            cancelButton.innerHTML = translations.indicator.cancel;
            buttonContainer.append(cancelButton);
            container.append(buttonContainer);

            cancelButton.addEventListener('click', function(e) {
                that.currentDisaggregation = that.displayedDisaggregation;
                $('.disaggregation-form-outer').toggle();
                that.updateForm();
            });
            applyButton.addEventListener('click', function(e) {
                that.updateMap();
                that.updateList();
                $('.disaggregation-form-outer').toggle();
            });
        },

        updateMap: function() {
            this.needsMapUpdate = false;
            this.plugin.currentDisaggregation = this.currentDisaggregation;
            this.plugin.updatePrecision();
            this.plugin.setColorScale();
            this.plugin.updateColors();
            this.plugin.updateTooltips();
            this.plugin.selectionLegend.resetSwatches();
            this.plugin.selectionLegend.update();
            this.plugin.updateTitle();
            this.plugin.updateFooterFields();
            this.plugin.replaceYearSlider();
        },

        onAdd: function () {
            var div = L.DomUtil.create('div', 'disaggregation-controls'),
                list = L.DomUtil.create('dl', 'disaggregation-list'),
                that = this;

            if (this.hasSeries || this.hasUnits || this.hasDisaggregations) {
                this.list = list;
                div.append(list);
                this.updateList();

                var numSeries = this.allSeries.length,
                    numUnits = this.allUnits.length,
                    displayForm = this.displayForm;

                if (displayForm && (this.hasDisaggregationsWithMultipleValuesFlag || (numSeries > 1 || numUnits > 1))) {

                    var button = L.DomUtil.create('button', 'disaggregation-button');
                    button.innerHTML = translations.indicator.change_breakdowns;
                    button.addEventListener('click', function(e) {
                        that.displayedDisaggregation = that.currentDisaggregation;
                        $('.disaggregation-form-outer').show();
                    });
                    div.append(button);

                    var container = L.DomUtil.create('div', 'disaggregation-form');
                    var containerOuter = L.DomUtil.create('div', 'disaggregation-form-outer');
                    containerOuter.append(container);
                    this.form = container;
                    div.append(containerOuter);
                    this.updateForm();
                }
            }

            return div;
        },

        getCurrentSeries: function() {
            var disaggregation = this.disaggregations[this.currentDisaggregation];
            return disaggregation[this.seriesColumn];
        },

        getCurrentUnit: function() {
            var disaggregation = this.disaggregations[this.currentDisaggregation];
            return disaggregation[this.unitsColumn];
        },

        getAllSeries: function () {
            var seriesColumn = this.seriesColumn;
            if (typeof this.disaggregations[0][seriesColumn] === 'undefined' || !this.disaggregations[0][seriesColumn]) {
                return [];
            }
            var allSeries = _.uniq(this.disaggregations.map(function(disaggregation) {
                return disaggregation[seriesColumn];
            }));
            var sortedSeries = this.valuesInOrder[seriesColumn];
            allSeries.sort(function(a, b) {
                return sortedSeries.indexOf(a) - sortedSeries.indexOf(b);
            });
            return allSeries;
        },

        getAllUnits: function () {
            var unitsColumn = this.unitsColumn;
            if (typeof this.disaggregations[0][unitsColumn] === 'undefined' || !this.disaggregations[0][unitsColumn]) {
                return [];
            }
            var allUnits = _.uniq(this.disaggregations.map(function(disaggregation) {
                return disaggregation[unitsColumn];
            }));
            var sortedUnits = this.valuesInOrder[unitsColumn];
            allUnits.sort(function(a, b) {
                return sortedUnits.indexOf(a) - sortedUnits.indexOf(b);
            });
            return allUnits;
        },

        getAllDisaggregations: function () {
            var disaggregations = this.disaggregations,
                valuesInOrder = this.valuesInOrder,
                validFields = Object.keys(disaggregations[0]),
                invalidFields = [this.seriesColumn, this.unitsColumn],
                allDisaggregations = [];

            this.fieldsInOrder.forEach(function(field) {
                if (!(invalidFields.includes(field)) && validFields.includes(field)) {
                    var sortedValues = valuesInOrder[field],
                        item = {
                            field: field,
                            values: _.uniq(disaggregations.map(function(disaggregation) {
                                return disaggregation[field];
                            })),
                        };
                    item.values.sort(function(a, b) {
                        return sortedValues.indexOf(a) - sortedValues.indexOf(b);
                    });
                    allDisaggregations.push(item);
                }
            });

            return allDisaggregations;
        },

        getSelectedDisaggregationIndex: function(changedKey, newValue) {
            for (var i = 0; i < this.disaggregations.length; i++) {
                var disaggregation = this.disaggregations[i],
                    keys = Object.keys(disaggregation),
                    matchesSelections = true;
                for (var j = 0; j < keys.length; j++) {
                    var key = keys[j],
                        inputName = 'map-' + key,
                        $inputElement = $('input[name="' + inputName + '"]:checked'),
                        selection = $inputElement.val();
                    if ($inputElement.length > 0 && selection !== disaggregation[key]) {
                        matchesSelections = false;
                        break;
                    }
                }
                if (matchesSelections) {
                    return i;
                }
            }
            // If we are still here, it means that a recent change
            // has resulted in an illegal combination. In this case
            // we look at the recently-changed key and its value,
            // and we pick the first disaggregation that matches.
            for (var i = 0; i < this.disaggregations.length; i++) {
                var disaggregation = this.disaggregations[i],
                    keys = Object.keys(disaggregation);
                if (keys.includes(changedKey) && disaggregation[changedKey] === newValue) {
                    return i;
                }
            }
            // If we are still here, something went wrong.
            throw('Could not find match');
        },

        isDisaggegrationValidGivenCurrent: function(field, value) {
            var currentDisaggregation = Object.assign({}, this.disaggregations[this.currentDisaggregation]);
            currentDisaggregation[field] = value;
            var keys = Object.keys(currentDisaggregation);
            for (var i = 0; i < this.disaggregations.length; i++) {
                var valid = true;
                var otherDisaggregation = this.disaggregations[i];
                for (var j = 0; j < keys.length; j++) {
                    var key = keys[j];
                    if (currentDisaggregation[key] !== otherDisaggregation[key]) {
                        valid = false;
                    }
                }
                if (valid) {
                    return true;
                }
            }
            return false;
        },

    });

    // Factory function for this class.
    L.Control.disaggregationControls = function (plugin) {
        return new L.Control.DisaggregationControls(plugin);
    };
}());
$(document).ready(function() {
    $('a[href="#top"]').prepend('<svg class="app-c-back-to-top__icon" xmlns="http://www.w3.org/2000/svg" width="13" height="17" viewBox="0 0 13 17" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.5 0L0 6.5 1.4 8l4-4v12.7h2V4l4.3 4L13 6.4z"></path></svg>');
});
