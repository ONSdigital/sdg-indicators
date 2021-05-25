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
      options.mapOptions.colorRange = (overrideColorRange) ? colorRange : defaults.colorRange;
    }

    this.options = $.extend(true, {}, defaults, options.mapOptions);
    this.mapLayers = [];
    this.indicatorId = options.indicatorId;
    this._precision = options.precision;
    this._decimalSeparator = options.decimalSeparator;
    this.currentDisaggregation = 0;

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

    // Zoom to a feature.
    zoomToFeature: function(layer) {
      this.map.fitBounds(layer.getBounds());
    },

    // Build content for a tooltip.
    getTooltipContent: function(feature) {
      var tooltipContent = feature.properties.name;
      var tooltipData = this.getData(feature.properties);
      if (tooltipData) {
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
      // @deprecated start
      if (typeof opensdg.dataDisplayAlterations === 'undefined') {
        opensdg.dataDisplayAlterations = [];
      }
      // @deprecated end
      opensdg.dataDisplayAlterations.forEach(function(callback) {
        value = callback(value);
      });
      if (this._precision || this._precision === 0) {
        value = Number.parseFloat(value).toFixed(this._precision);
      }
      if (this._decimalSeparator) {
        value = value.toString().replace('.', this._decimalSeparator);
      }
      return value;
    },

    // Get the data from a feature's properties, according to the current year.
    getData: function(props) {
      if (props.values && props.values.length && props.values[this.currentDisaggregation][this.currentYear]) {
        return opensdg.dataRounding(props.values[this.currentDisaggregation][this.currentYear]);
      }
      return false;
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

    // Get the (long) URL of a geojson file, given a particular subfolder.
    getGeoJsonUrl: function(subfolder) {
      var fileName = this.indicatorId + '.geojson';
      return [opensdg.remoteDataBaseUrl, 'geojson', subfolder, fileName].join('/');
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
            .text(translations.indicator.download_geojson + ' - ' + downloadLabel);
          $(plugin.element).parent().append(downloadButton);

          // Keep track of the minimums and maximums.
          _.each(geoJson.features, function(feature) {
            if (feature.properties.values && feature.properties.values.length) {
              availableYears = availableYears.concat(Object.keys(feature.properties.values[0]));
              minimumValues.push(_.min(Object.values(feature.properties.values[0])));
              maximumValues.push(_.max(Object.values(feature.properties.values[0])));
            }
          });
        }

        // Calculate the ranges of values, years and colors.
        plugin.valueRange = [_.min(minimumValues), _.max(maximumValues)];
        plugin.colorScale = chroma.scale(plugin.options.colorRange)
          .domain(plugin.valueRange)
          .classes(plugin.options.colorRange.length);
        plugin.years = _.uniq(availableYears).sort();
        plugin.currentYear = plugin.years[0];

        // And we can now update the colors.
        plugin.updateColors();

        // Add zoom control.
        plugin.map.addControl(L.Control.zoomHome());

        // Add full-screen functionality.
        plugin.map.addControl(new L.Control.FullscreenAccessible());

        // Add the year slider.
        plugin.map.addControl(L.Control.yearSlider({
          years: plugin.years,
          yearChangeCallback: function(e) {
            plugin.currentYear = plugin.years[e.target._currentTimeIndex];
            plugin.updateColors();
            plugin.updateTooltips();
            plugin.selectionLegend.update();
          }
        }));

        // Add the selection legend.
        plugin.selectionLegend = L.Control.selectionLegend(plugin);
        plugin.map.addControl(plugin.selectionLegend);

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
        }
        // Event handler for when a geoJson layer is zoomed into.
        function zoomInHandler(e) {
          plugin.updateStaticLayers();
        }
      });

      // Perform some last-minute tasks when the user clicks on the "Map" tab.
      $('.map .nav-link').click(function() {
        setTimeout(function() {
          $('#map #loader-container').hide();
          // Leaflet needs "invalidateSize()" if it was originally rendered in a
          // hidden element. So we need to do that when the tab is clicked.
          plugin.map.invalidateSize();
          // Also zoom in/out as needed.
          plugin.map.fitBounds(plugin.getVisibleLayers().getBounds());
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
          var maxHeight = $(window).height() - heightPadding;
          if ($('#map').height() > maxHeight) {
            $('#map').height(maxHeight);
          }
        }, 500);
      });
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
Chart.plugins.register({
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

    if (chart.isScaleUpdate) {
      chart.isScaleUpdate = false;
      return;
    }

    var datasets = _.filter(chart.data.datasets, function (ds, index) {
      var meta = chart.getDatasetMeta(index).$filler;
      return meta && meta.visible;
    });

    var ranges = _.chain(datasets).map('allData').map(function (data) {
      return {
        min: _.findIndex(data, function(val) { return val !== null }),
        max: _.findLastIndex(data, function(val) { return val !== null })
      };
    }).value();

    var dataRange = ranges.length ? {
      min: _.chain(ranges).map('min').min().value(),
      max: _.chain(ranges).map('max').max().value()
    } : undefined;

    if (dataRange) {
      chart.data.labels = chart.data.allLabels.slice(dataRange.min, dataRange.max + 1);

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

// This plugin displays a message to the user whenever a chart has no data.
Chart.plugins.register({
  afterDraw: function(chart) {
    if (chart.data.datasets.length === 0) {

      // @deprecated start
      if (typeof translations.indicator.data_not_available === 'undefined') {
        translations.indicator.data_not_available = 'This data is not available. Please choose alternative data to display.';
      }
      // @deprecated end

      var ctx = chart.chart.ctx;
      var width = chart.chart.width;
      var height = chart.chart.height
      chart.clear();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "normal 40px 'Open Sans', Helvetica, Arial, sans-serif";
      var lines = getTextLinesOnCanvas(ctx, translations.indicator.data_not_available, chart.chart.width);
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
Chart.plugins.register({
    afterInit: function(chart) {
        var plugin = this;
        plugin.chart = chart;
        plugin.currentTooltip = null;
        plugin.initElements();
        $(chart.canvas).keydown(function(e) {
            switch (e.which) {
                case 37:
                    plugin.previousTooltip();
                    e.preventDefault();
                    break;
                case 39:
                    plugin.nextTooltip();
                    e.preventDefault();
                    break;
            }
        });
    },
    initElements: function() {
        $('<span/>')
            .addClass('sr-only')
            .attr('id', 'chart-tooltip-status')
            .attr('role', 'status')
            .appendTo('#chart');
        if (window.innerWidth <= 768) {
            $(this.chart.canvas).text(translations.indicator.chart + '. ' + translations.indicator.data_tabular_alternative);
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
    afterDatasetsDraw: function() {
        var plugin = this;
        if (plugin.allTooltips == null) {
            plugin.allTooltips = plugin.getAllTooltips();
        }
    },
    afterUpdate: function() {
        var plugin = this;
        plugin.allTooltips = null;
        plugin.currentTooltip = null;
    },
    getAllTooltips: function() {
        var datasets = this.chart.data.datasets;
        var allTooltips = [];
        if (datasets.length == 0) {
            return allTooltips;
        }
        // For line charts, we group points into vertical tooltips.
        if (this.chart.config.type == 'line') {
            for (var pointIndex = 0; pointIndex < datasets[0].data.length; pointIndex++) {
                var verticalTooltips = [];
                for (var datasetIndex = 0; datasetIndex < datasets.length; datasetIndex++) {
                    var meta = this.chart.getDatasetMeta(datasetIndex);
                    if (meta.hidden) {
                        continue;
                    }
                    if (datasets[datasetIndex].data[pointIndex] !== null) {
                        verticalTooltips.push(meta.data[pointIndex]);
                    }
                }
                if (verticalTooltips.length > 0) {
                    allTooltips.push(verticalTooltips);
                }
            }
        }
        // For other charts, each point gets its own tooltip.
        else {
            for (var datasetIndex = 0; datasetIndex < datasets.length; datasetIndex++) {
                var meta = this.chart.getDatasetMeta(datasetIndex);
                if (meta.hidden) {
                    continue;
                }
                for (var pointIndex = 0; pointIndex < datasets[datasetIndex].data.length; pointIndex++) {
                    var singleTooltip = meta.data[pointIndex];
                    allTooltips.push([singleTooltip]);
                }
            }
        }
        return allTooltips;
    },
    previousTooltip: function() {
        var plugin = this,
            newTooltip = 0;
        if (plugin.currentTooltip !== null) {
            newTooltip = plugin.currentTooltip - 1;
        }
        if (newTooltip < 0) {
            newTooltip = plugin.allTooltips.length - 1;
        }
        plugin.activateTooltips(plugin.allTooltips[newTooltip]);
        plugin.currentTooltip = newTooltip;
    },
    nextTooltip: function() {
        var plugin = this,
            newTooltip = 0;
        if (plugin.currentTooltip !== null) {
            newTooltip = plugin.currentTooltip + 1;
        }
        if (newTooltip >= plugin.allTooltips.length) {
            newTooltip = 0;
        }
        plugin.activateTooltips(plugin.allTooltips[newTooltip]);
        plugin.currentTooltip = newTooltip;
    },
    activateTooltips: function(tooltips) {
        this.chart.tooltip._active = tooltips
        this.chart.tooltip.update(true);
        this.chart.draw();
        this.announceTooltips(tooltips);
    },
    announceTooltips: function(tooltips) {
        if (tooltips.length > 0) {
            var labels = {};
            for (var i = 0; i < tooltips.length; i++) {
                var datasetIndex = tooltips[i]._datasetIndex,
                    pointIndex = tooltips[i]._index,
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
var accessibilitySwitcher = function() {

  var contrastIdentifiers = ['default', 'high'];

  function setActiveContrast(contrast) {
    var contrastType = ""
    _.each(contrastIdentifiers, function(id) {
      $('body').removeClass('contrast-' + id);
    });
    if(contrastType === "long"){
	    $("body").addClass("long");
    }
    $('body').addClass('contrast-' + contrast);

    createCookie("contrast", contrast, 365);
  }

  function getActiveContrast() {
    var contrast = _.filter(contrastIdentifiers, function(id) {
      return $('body').hasClass('contrast-' + id);
    });

    return contrast ? contrast : contrastIdentifiers[0];
  }

  function createCookie(name,value,days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  }

  function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  window.onunload = function(e) {
    var contrast = getActiveContrast();
    createCookie("contrast", contrast, 365);
  }

  var cookie = readCookie("contrast");
  var contrast = cookie ? cookie : contrastIdentifiers[0];
  setActiveContrast(contrast);
  imageFix(contrast);

  ////////////////////////////////////////////////////////////////////////////////////

  _.each(contrastIdentifiers, function(contrast) {
    var gaAttributes = opensdg.autotrack('switch_contrast', 'Accessibility', 'Change contrast setting', contrast);
    var contrastTitle = getContrastToggleTitle(contrast);
    $('.contrast-switcher').append($('<li />').attr({
      'class': 'nav-link contrast contrast-' + contrast
    }).html($('<a />').attr(gaAttributes).attr({
      'href': 'javascript:void(0)',
      'title': contrastTitle,
      'aria-label': contrastTitle,
      'data-contrast': contrast,
    }).html(getContrastToggleLabel(contrast).replace(" ", "<br/>")).click(function() {
      setActiveContrast($(this).data('contrast'));
      imageFix(contrast);
      broadcastContrastChange(contrast, this);
    })));
  });

  function broadcastContrastChange(contrast, elem) {
    var event = new CustomEvent('contrastChange', {
      bubbles: true,
      detail: contrast
    });
    elem.dispatchEvent(event);
  }

  function getContrastToggleLabel(identifier){
    var contrastType = ""
    if(contrastType === "long") {
      if(identifier === "default"){
        return translations.header.default_contrast;
      }
      else if(identifier === "high"){
        return translations.header.high_contrast;
      }
    }
    else {
      return 'A'
    }
  }

  function getContrastToggleTitle(identifier){
    if(identifier === "default"){
      return translations.header.disable_high_contrast;
    }
    else if(identifier === "high"){
      return translations.header.enable_high_contrast;
    }
  }


  function imageFix(contrast) {
    var doNotSwitchTheseSuffixes = ['.svg'];
    var doNotSwitchThesePrefixes = ['https://platform-cdn.sharethis.com/'];
    if (contrast == 'high')  {
      _.each($('img:not([src*=high-contrast])'), function(image) {
        var src = $(image).attr('src').toLowerCase();
        var switchThisImage = true;
        for (var i = 0; i < doNotSwitchTheseSuffixes.length; i++) {
          var suffix = doNotSwitchTheseSuffixes[i];
          if (src.slice(0 - suffix.length) === suffix) {
            switchThisImage = false;
          }
        }
        for (var i = 0; i < doNotSwitchThesePrefixes.length; i++) {
          var prefix = doNotSwitchThesePrefixes[i];
          if (src.slice(0, prefix.length) === prefix) {
            switchThisImage = false;
          }
        }
        if (switchThisImage) {
          $(image).attr('src', $(image).attr('src').replace('img/', 'img/high-contrast/'));
        }
      });
    } else {
      // Remove high-contrast
      _.each($('img[src*=high-contrast]'), function(goalImage){
        $(goalImage).attr('src', $(goalImage).attr('src').replace('high-contrast/', ''));
      })
    }
  };

};
opensdg.chartColors = function(indicatorId) {
  var colorSet = "accessible";
  var numberOfColors = null;
  var customColorList = null;

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
  this.colorSets = {'default':['7e984f', '8d73ca', 'aaa533', 'c65b8a', '4aac8d', 'c95f44'],
                  'sdg':['e5243b', 'dda63a', '4c9f38', 'c5192d', 'ff3a21', '26bde2', 'fcc30b', 'a21942', 'fd6925', 'dd1367','fd9d24','bf8b2e','3f7e44','0a97d9','56c02b','00689d','19486a'],
                  'goal': this.goalColors[this.goalNumber-1],
                  'custom': customColorList,
                  'accessible': ['cd7a00', '339966', '9966cc', '8d4d57', 'A33600', '054ce6']};
  if(Object.keys(this.colorSets).indexOf(colorSet) == -1 || (colorSet=='custom' && customColorList == null)){
    return this.colorSets['default'];
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
var SERIES_TOGGLE = true;
var GRAPH_TITLE_FROM_SERIES = false;

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
  return Array.from(uniques).sort();
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
  if (SERIES_TOGGLE) {
    columns.push(SERIES_COLUMN);
  }
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
 * Move an item from one position in an array to another, in place.
 */
function arrayMove(arr, fromIndex, toIndex) {
  while (fromIndex < 0) {
    fromIndex += arr.length;
  }
  while (toIndex < 0) {
    toIndex += arr.length;
  }
  var paddingAdded = [];
  if (toIndex >= arr.length) {
    var k = toIndex - arr.length;
    while ((k--) + 1) {
      arr.push(undefined);
      paddingAdded.push(arr.length - 1);
    }
  }
  arr.splice(toIndex, 0, arr.splice(fromIndex, 1)[0]);

  // Get rid of the undefined elements that were added.
  paddingAdded.sort();
  while (paddingAdded.length > 0) {
    var paddingIndex = paddingAdded.pop() - 1;
    arr.splice(paddingIndex, 1);
  }
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
function getInitialFieldItemStates(rows, edges, columns) {
  var initial = getFieldColumnsFromData(columns).map(function(field) {
    return {
      field: field,
      hasData: true,
      values: getUniqueValuesByProperty(field, rows).map(function(value) {
        return {
          value: value,
          state: 'default',
          checked: false,
          hasData: true
        };
      }, this),
    };
  }, this);

  return sortFieldItemStates(initial, edges);
}

/**
 * @param {Array} fieldItemStates
 * @param {Array} edges
 * return {Array} Sorted field item states
 */
function sortFieldItemStates(fieldItemStates, edges) {
  if (edges.length > 0) {
    var froms = getUniqueValuesByProperty('From', edges);
    var tos = getUniqueValuesByProperty('To', edges);
    var orderedEdges = froms.concat(tos);
    var fieldsNotInEdges = fieldItemStates
      .map(function(fis) { return fis.field; })
      .filter(function(field) { return !orderedEdges.includes(field); });
    var customOrder = orderedEdges.concat(fieldsNotInEdges);

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
          fieldItemValue.checked = true;
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

    // We need to sort the edges so that we process parents before children.
    var parents = edges.map(function(edge) { return edge.From; });
    edges.sort(function(a, b) {
      if (!parents.includes(a.To) && parents.includes(b.To)) {
        return 1;
      }
      if (!parents.includes(b.To) && parents.includes(a.To)) {
        return -1;
      }
      return 0;
    });

    edges.forEach(function(edge) {
      // This makes sure children are right after their parents.
      var parentIndex = fieldItemStates.findIndex(function(fieldItem) {
        return fieldItem.field == edge.From;
      });
      var childIndex = fieldItemStates.findIndex(function(fieldItem) {
        return fieldItem.field == edge.To;
      });
      arrayMove(fieldItemStates, childIndex, parentIndex + 1);
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

  // Now compute all combinations of those.
  var getAllSubsets = function(combinationSet) {
    if (combinationSet.length == 0) {
      return [];
    }
    var subsets = [combinationSet];
    if (combinationSet.length == 1) {
      return subsets;
    }
    for (var i = 0; i < combinationSet.length; i++) {
      var subset = combinationSet.filter(function(item, index) {
        return index !== i;
      });
      if (subset.length > 0) {
        subsets = subsets.concat(getAllSubsets(subset));
      }
    }
    return subsets;
  }
  var allSubsets = getAllSubsets(fieldValuePairs);
  var fieldValuePairCombinations = {};
  allSubsets.forEach(function(subset) {
    var combinedSubset = {};
    subset.forEach(function(keyValue) {
      Object.assign(combinedSubset, keyValue);
    });
    var combinationKeys = Object.keys(combinedSubset).sort();
    var combinationValues = Object.values(combinedSubset).sort();
    var combinationUniqueId = JSON.stringify(combinationKeys.concat(combinationValues));
    if (!(combinationUniqueId in fieldValuePairCombinations)) {
      fieldValuePairCombinations[combinationUniqueId] = combinedSubset;
    }
  });

  return Object.values(fieldValuePairCombinations);
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
      values: valuesByField[field],
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
function getGraphAnnotations(graphAnnotations, selectedUnit, selectedSeries) {
  return getMatchesByUnitSeries(graphAnnotations, selectedUnit, selectedSeries);
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

  datasets.sort(function(a, b) { return (a.label > b.label) ? 1 : -1; });
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
    spanGaps: true
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
 * @return {Array} Rows
 */
function convertJsonFormatToRows(data) {
  var keys = Object.keys(data);
  if (keys.length === 0) {
    return [];
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
function prepareData(rows) {
  return rows.map(function(item) {

    if (item[VALUE_COLUMN] != 0) {
      // For rounding, use a function that can be set on the global opensdg
      // object, for easier control: opensdg.dataRounding()
      if (typeof opensdg.dataRounding === 'function') {
        item.Value = opensdg.dataRounding(item.Value);
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
    SERIES_TOGGLE: SERIES_TOGGLE,
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
    getCombinationData: getCombinationData,
    getDatasets: getDatasets,
    tableDataFromDatasets: tableDataFromDatasets,
    getPrecision: getPrecision,
    getGraphLimits: getGraphLimits,
    getGraphAnnotations: getGraphAnnotations,
    getColumnsFromData: getColumnsFromData,
    // Backwards compatibility.
    footerFields: deprecated('helpers.footerFields'),
  }
})();


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
  this.data = helpers.convertJsonFormatToRows(options.data);
  this.edgesData = helpers.convertJsonFormatToRows(options.edgesData);
  this.hasHeadline = true;
  this.country = options.country;
  this.indicatorId = options.indicatorId;
  this.shortIndicatorId = options.shortIndicatorId;
  this.chartTitle = options.chartTitle,
  this.chartTitles = options.chartTitles;
  this.graphType = options.graphType;
  this.measurementUnit = options.measurementUnit;
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
  this.indicatorDownloads = options.indicatorDownloads;
  this.compositeBreakdownLabel = options.compositeBreakdownLabel;
  this.precision = options.precision;

  this.initialiseUnits = function() {
    if (this.hasUnits) {
      this.units = helpers.getUniqueValuesByProperty(helpers.UNIT_COLUMN, this.data);
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
      this.years = helpers.getUniqueValuesByProperty(helpers.YEAR_COLUMN, this.data);
      this.fieldsBySeries = helpers.fieldsUsedBySeries(this.serieses, this.data, this.allColumns);
      this.dataHasSeriesSpecificFields = helpers.dataHasSeriesSpecificFields(this.fieldsBySeries);
    }
  }

  this.initialiseFields = function() {
    this.fieldItemStates = helpers.getInitialFieldItemStates(this.data, this.edgesData, this.allColumns);
    this.validParentsByChild = helpers.validParentsByChild(this.edgesData, this.fieldItemStates, this.data);
    this.selectableFields = helpers.getFieldNames(this.fieldItemStates);
    this.allowedFields = helpers.getInitialAllowedFields(this.selectableFields, this.edgesData);
  }

  // Before continuing, we may need to filter by Series, so set up all the Series stuff.
  this.allData = helpers.prepareData(this.data);
  this.allColumns = helpers.getColumnsFromData(this.allData);
  this.hasSerieses = helpers.SERIES_TOGGLE && helpers.dataHasSerieses(this.allColumns);
  this.serieses = this.hasSerieses ? helpers.getUniqueValuesByProperty(helpers.SERIES_COLUMN, this.allData) : [];
  this.hasStartValues = Array.isArray(this.startValues) && this.startValues.length > 0;
  if (this.hasSerieses) {
    this.selectedSeries = this.serieses[0];
    if (this.hasStartValues) {
      this.selectedSeries = helpers.getSeriesFromStartValues(this.startValues) || this.selectedSeries;
    }
    this.refreshSeries();
  }
  else {
    this.data = this.allData;
    this.years = helpers.getUniqueValuesByProperty(helpers.YEAR_COLUMN, this.data);
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
          if (unitInStartValues) {
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
        selectedSeries: this.selectedSeries
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
        indicatorId: this.indicatorId,
        showMap: this.showMap,
        precision: helpers.getPrecision(this.precision, this.selectedUnit, this.selectedSeries),
      });
    }

    if (selectionUpdateNeeded || options.updateFields) {
      this.updateFieldStates(this.selectedFields);
    }

    var filteredData = helpers.getDataBySelectedFields(this.data, this.selectedFields);
    if (this.hasUnits) {
      filteredData = helpers.getDataByUnit(filteredData, this.selectedUnit);
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
      graphAnnotations: helpers.getGraphAnnotations(this.graphAnnotations, this.selectedUnit, this.selectedSeries),
      chartTitle: this.chartTitle,
      indicatorDownloads: this.indicatorDownloads,
      precision: helpers.getPrecision(this.precision, this.selectedUnit, this.selectedSeries),
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

  this.initialise = function(indicatorId, precision, decimalSeparator) {
    $('.map').show();
    $('#map').sdgMap({
      indicatorId: indicatorId,
      mapOptions: {"tileURL":"https://{s}.tile.jawg.io/{id}/{z}/{x}/{y}{r}.png?access-token={accessToken}","tileOptions":{"id":"jawg-light","accessToken":"lCtbMZiG4tbVWl7uq9EEch1yphnuLx9JyZL2qZwoQJ26wAu73oK1NkU4K50AALkp","attribution":"<a href=\"http://jawg.io\" title=\"Tiles Courtesy of Jawg Maps\" target=\"_blank\">&copy; <b>Jawg</b>Maps</a> &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors | <a href=\"http://geoportal.statistics.gov.uk/\">ONS</a>"},"minZoom":4},
      mapLayers: [{"min_zoom":4,"max_zoom":6,"staticBorders":true,"subfolder":"country","label":"Country"},{"min_zoom":6,"max_zoom":8,"staticBorders":true,"subfolder":"regions","label":"Regions"},{"min_zoom":9,"max_zoom":12,"staticBorders":true,"subfolder":"local_authorities","label":"Local Authorities"}],
      precision: precision,
      decimalSeparator: decimalSeparator,
    });
  };
};
var indicatorView = function (model, options) {

  "use strict";

  var view_obj = this;
  this._model = model;

  this._chartInstance = undefined;
  this._rootElement = options.rootElement;
  this._tableColumnDefs = options.tableColumnDefs;
  this._mapView = undefined;
  this._legendElement = options.legendElement;
  this._precision = undefined;
  this._decimalSeparator = options.decimalSeparator;

  var chartHeight = screen.height < options.maxChartHeight ? screen.height : options.maxChartHeight;

  $('.plot-container', this._rootElement).css('height', chartHeight + 'px');

  $(document).ready(function() {
    $(view_obj._rootElement).find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      if($(e.target).attr('href') == '#tableview') {
        setDataTableWidth($(view_obj._rootElement).find('#selectionsTable table'));
      } else {
        $($.fn.dataTable.tables(true)).css('width', '100%');
        $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
      }
    });

    // Provide the hide/show functionality for the sidebar.
    $('.data-view .nav-link').on('click', function(e) {
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
      }
    });
  });

  this._model.onDataComplete.attach(function (sender, args) {

    view_obj._precision = args.precision;

    if(view_obj._model.showData) {

      $('#dataset-size-warning')[args.datasetCountExceedsMax ? 'show' : 'hide']();

      if(!view_obj._chartInstance) {
        view_obj.createPlot(args);
      } else {
        view_obj.updatePlot(args);
      }
    }

    view_obj.createSelectionsTable(args);

    view_obj.updateChartTitle(args.chartTitle);
  });

  this._model.onFieldsComplete.attach(function(sender, args) {
    view_obj.initialiseFields(args);

    if(args.hasGeoData && args.showMap) {
      view_obj._mapView = new mapView();
      view_obj._mapView.initialise(args.indicatorId, args.precision, view_obj._decimalSeparator);
    }
  });

  this._model.onUnitsComplete.attach(function(sender, args) {
    view_obj.initialiseUnits(args);
  });

  if (this._model.onSeriesesComplete) {
    this._model.onSeriesesComplete.attach(function(sender, args) {
      view_obj.initialiseSerieses(args);
    });
  }

  this._model.onFieldsCleared.attach(function(sender, args) {
    $(view_obj._rootElement).find(':checkbox').prop('checked', false);
    $(view_obj._rootElement).find('#clear')
      .addClass('disabled')
      .attr('aria-disabled', 'true')
      .attr('disabled', 'disabled');

    // reset available/unavailable fields
    updateWithSelectedFields();

    $(view_obj._rootElement).find('.selected').css('width', '0');
  });

  this._model.onSelectionUpdate.attach(function(sender, args) {
    if (args.selectedFields.length) {
      $(view_obj._rootElement).find('#clear')
        .removeClass('disabled')
        .attr('aria-disabled', 'false')
        .removeAttr('disabled');
    }
    else {
      $(view_obj._rootElement).find('#clear')
        .addClass('disabled')
        .attr('aria-disabled', 'true')
        .attr('disabled', 'disabled');
    }

    // loop through the available fields:
    $('.variable-selector').each(function(index, element) {
      var currentField = $(element).data('field');
      var element = $(view_obj._rootElement).find('.variable-selector[data-field="' + currentField + '"]');

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

  this._model.onFieldsStatusUpdated.attach(function (sender, args) {

    _.each(args.data, function(fieldGroup) {
      _.each(fieldGroup.values, function(fieldItem) {
        var element = $(view_obj._rootElement).find(':checkbox[value="' + fieldItem.value + '"][data-field="' + fieldGroup.field + '"]');
        element.parent().addClass(fieldItem.state).attr('data-has-data', fieldItem.hasData);
      });
      // Indicate whether the fieldGroup had any data.
      var fieldGroupElement = $(view_obj._rootElement).find('.variable-selector[data-field="' + fieldGroup.field + '"]');
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
      view_obj.sortFieldGroup(fieldGroupElement);
    });
  });

  $(this._rootElement).on('click', '#clear', function() {
    view_obj._model.clearSelectedFields();
  });

  $(this._rootElement).on('click', '#fields label', function (e) {

    if(!$(this).closest('.variable-selector').hasClass('disallowed')) {
      $(this).find(':checkbox').trigger('click');
    }

    e.preventDefault();
    e.stopPropagation();
  });

  $(this._rootElement).on('change', '#units input', function() {
    view_obj._model.updateSelectedUnit($(this).val());
  });

  $(this._rootElement).on('change', '#serieses input', function() {
    view_obj._model.updateSelectedSeries($(this).val());
  });

  // generic helper function, used by clear all/select all and individual checkbox changes:
  var updateWithSelectedFields = function() {
    view_obj._model.updateSelectedFields(_.chain(_.map($('#fields input:checked'), function (fieldValue) {
      return {
        value: $(fieldValue).val(),
        field: $(fieldValue).data('field')
      };
    })).groupBy('field').map(function(value, key) {
      return {
        field: key,
        values: _.map(value, 'value')
      };
    }).value());
  }

  $(this._rootElement).on('click', '.variable-options button', function(e) {
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

    updateWithSelectedFields();

    e.stopPropagation();
  });

  $(this._rootElement).on('click', ':checkbox', function(e) {

    // don't permit disallowed selections:
    if ($(this).closest('.variable-selector').hasClass('disallowed')) {
      return;
    }

    updateWithSelectedFields();

    e.stopPropagation();
  });

  $(this._rootElement).on('click', '.variable-selector', function(e) {

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

  this.initialiseFields = function(args) {
    var fieldsContainValues = args.fields.some(function(field) {
      return field.values.length > 0;
    });
    if (fieldsContainValues) {
      var template = _.template($("#item_template").html());

      if(!$('button#clear').length) {
        $('<button id="clear" disabled="disabled" aria-disabled="true" class="disabled">' + translations.indicator.clear_selections + ' <i class="fa fa-remove"></i></button>').insertBefore('#fields');
      }

      $('#fields').html(template({
        fields: args.fields,
        allowedFields: args.allowedFields,
        edges: args.edges
      }));

      $(this._rootElement).removeClass('no-fields');

    } else {
      $(this._rootElement).addClass('no-fields');
    }
  };

  this.initialiseUnits = function(args) {
    var template = _.template($('#units_template').html()),
        units = args.units || [],
        selectedUnit = args.selectedUnit || null;

    $('#units').html(template({
      units: units,
      selectedUnit: selectedUnit
    }));

    if(!units.length) {
      $(this._rootElement).addClass('no-units');
    }
  };

  this.initialiseSerieses = function(args) {
    var templateElement = $('#series_template');
    if (templateElement.length > 0) {
      var template = _.template(templateElement.html()),
          serieses = args.serieses || [],
          selectedSeries = args.selectedSeries || null;

      $('#serieses').html(template({
        serieses: serieses,
        selectedSeries: selectedSeries
      }));

      if(!serieses.length) {
        $(this._rootElement).addClass('no-serieses');
      }
    }
  };

  this.alterChartConfig = function(config, info) {
    opensdg.chartConfigAlterations.forEach(function(callback) {
      callback(config, info);
    });
  };

  this.alterTableConfig = function(config, info) {
    // deprecated start
    if (typeof opensdg.tableConfigAlterations === 'undefined') {
      opensdg.tableConfigAlterations = [];
    }
    // deprecated end
    opensdg.tableConfigAlterations.forEach(function(callback) {
      callback(config, info);
    });
  };

  this.alterDataDisplay = function(value, info, context) {
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
    // @deprecated start
    if (typeof opensdg.dataDisplayAlterations === 'undefined') {
      opensdg.dataDisplayAlterations = [];
    }
    // @deprecated end
    opensdg.dataDisplayAlterations.forEach(function(callback) {
      altered = callback(altered, info, context);
    });
    // Now apply our custom precision control if needed.
    if (view_obj._precision || view_obj._precision === 0) {
      altered = Number.parseFloat(altered).toFixed(view_obj._precision);
    }
    // Now apply our custom decimal separator if needed.
    if (view_obj._decimalSeparator) {
      altered = altered.toString().replace('.', view_obj._decimalSeparator);
    }
    return altered;
  }

  this.updateChartTitle = function(chartTitle) {
    if (typeof chartTitle !== 'undefined') {
      $('.chart-title').text(chartTitle);
    }
  }

  this.updatePlot = function(chartInfo) {
    this.updateIndicatorDataViewStatus(view_obj._chartInstance.data.datasets, chartInfo.datasets);
    view_obj._chartInstance.data.datasets = chartInfo.datasets;
    view_obj._chartInstance.data.labels = chartInfo.labels;
    this.updateHeadlineColor(this.isHighContrast() ? 'high' : 'default', view_obj._chartInstance);
    // TODO: Investigate assets/js/chartjs/rescaler.js and why "allLabels" is needed.
    view_obj._chartInstance.data.allLabels = chartInfo.labels;

    if(chartInfo.selectedUnit) {
      view_obj._chartInstance.options.scales.yAxes[0].scaleLabel.labelString = translations.t(chartInfo.selectedUnit);
    }

    // Create a temp object to alter, and then apply. We go to all this trouble
    // to avoid completely replacing view_obj._chartInstance -- and instead we
    // just replace it's properties: "type", "data", and "options".
    var updatedConfig = {
      type: view_obj._chartInstance.type,
      data: view_obj._chartInstance.data,
      options: view_obj._chartInstance.options
    }
    this.alterChartConfig(updatedConfig, chartInfo);
    view_obj._chartInstance.type = updatedConfig.type;
    view_obj._chartInstance.data = updatedConfig.data;
    view_obj._chartInstance.options = updatedConfig.options;

    view_obj._chartInstance.update(1000, true);

    $(this._legendElement).html(view_obj._chartInstance.generateLegend());
    view_obj.updateChartDownloadButton(chartInfo.selectionsTable);
  };



  this.createPlot = function (chartInfo) {

    var that = this;
    var gridColor = that.getGridColor();
    var tickColor = that.getTickColor();

    var chartConfig = {
      type: this._model.graphType,
      data: chartInfo,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        spanGaps: true,
        scrollX: true,
        scrollCollapse: true,
        sScrollXInner: '150%',
        scales: {
          xAxes: [{
            maxBarThickness: 150,
            gridLines: {
              color: 'transparent',
              zeroLineColor: '#757575',
            },
            ticks: {
              fontColor: tickColor,
            },
          }],
          yAxes: [{
            gridLines: {
              color: gridColor,
              zeroLineColor: '#757575',
              drawBorder: false,
            },
            ticks: {
              suggestedMin: 0,
              fontColor: tickColor,
              callback: function(value) {
                return view_obj.alterDataDisplay(value, undefined, 'chart y-axis tick');
              },
            },
            scaleLabel: {
              display: this._model.selectedUnit ? translations.t(this._model.selectedUnit) : this._model.measurementUnit,
              labelString: this._model.selectedUnit ? translations.t(this._model.selectedUnit) : this._model.measurementUnit,
              fontColor: tickColor,
            }
          }]
        },
        legendCallback: function(chart) {
            var text = [];
            text.push('<h5 class="sr-only">' + translations.indicator.plot_legend_description + '</h5>');
            text.push('<ul id="legend">');
            _.each(chart.data.datasets, function(dataset) {
              text.push('<li>');
              text.push('<span class="swatch' + (dataset.borderDash ? ' dashed' : '') + '" style="background-color: ' + dataset.borderColor + '">');
              text.push('</span>');
              text.push(translations.t(dataset.label));
              text.push('</li>');
            });
            text.push('</ul>');
            return text.join('');
        },
        legend: {
          display: false
        },
        title: {
          display: false
        },
        plugins: {
          scaler: {}
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItems, data) {
              return data.datasets[tooltipItems.datasetIndex].label + ': ' + view_obj.alterDataDisplay(tooltipItems.yLabel, data, 'chart tooltip');
            },
            afterBody: function() {
              var unit = view_obj._model.selectedUnit ? translations.t(view_obj._model.selectedUnit) : view_obj._model.measurementUnit;
              if (typeof unit !== 'undefined' && unit !== '') {
                return '\n' + translations.indicator.unit + ': ' + unit;
              }
            }
          }
        }
      }
    };
    this.alterChartConfig(chartConfig, chartInfo);
    if (this.isHighContrast()) {
      this.updateGraphAnnotationColors('high', chartConfig);
      this.updateHeadlineColor('high', chartConfig);
    }
    else {
      this.updateHeadlineColor('default', chartConfig);
    }

    this._chartInstance = new Chart($(this._rootElement).find('canvas'), chartConfig);

    window.addEventListener('contrastChange', function(e) {
      var gridColor = that.getGridColor(e.detail);
      var tickColor = that.getTickColor(e.detail);
      that.updateHeadlineColor(e.detail, view_obj._chartInstance);
      that.updateGraphAnnotationColors(e.detail, view_obj._chartInstance);
      view_obj._chartInstance.options.scales.yAxes[0].scaleLabel.fontColor = tickColor;
      view_obj._chartInstance.options.scales.yAxes[0].gridLines.color = gridColor;
      view_obj._chartInstance.options.scales.yAxes[0].ticks.fontColor = tickColor;
      view_obj._chartInstance.options.scales.xAxes[0].ticks.fontColor = tickColor;
      view_obj._chartInstance.update();
      $(view_obj._legendElement).html(view_obj._chartInstance.generateLegend());
    });

    Chart.pluginService.register({
      afterDraw: function(chart) {
        var $canvas = $(that._rootElement).find('canvas'),
        font = '12px Arial',
        canvas = $canvas.get(0),
        ctx = canvas.getContext("2d");

        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6e6e6e';
      }
    });

    this.createDownloadButton(chartInfo.selectionsTable, 'Chart', chartInfo.indicatorId, '#chartSelectionDownload');
    this.createSourceButton(chartInfo.shortIndicatorId, '#chartSelectionDownload');
    this.createIndicatorDownloadButtons(chartInfo.indicatorDownloads, chartInfo.shortIndicatorId, '#chartSelectionDownload');

    $("#btnSave").click(function() {
      var filename = chartInfo.indicatorId + '.png',
          element = document.getElementById('chart-canvas'),
          footer = document.getElementById('selectionChartFooter'),
          height = element.clientHeight + 25 + ((footer) ? footer.clientHeight : 0),
          width = element.clientWidth + 25;
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
        // Allow a chance to alter the screenshot's HTML.
        onclone: function(clone) {
          // Add a body class so that the screenshot style can be custom.
          clone.body.classList.add('image-download-in-progress');
        },
        // Decide which elements to skip.
        ignoreElements: function(el) {
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
      html2canvas(element, options).then(function(canvas) {
        // Then download that canvas as a PNG file.
        canvas.toBlob(function(blob) {
          saveAs(blob, filename);
        });
      });
    });

    $(this._legendElement).html(view_obj._chartInstance.generateLegend());
  };

  this.getHeadlineColor = function(contrast) {
    return this.isHighContrast(contrast) ? '#FFDD00' : '#00006a';
  }

  this.getGridColor = function(contrast) {
    return this.isHighContrast(contrast) ? '#222' : '#ddd';
  };

  this.getTickColor = function(contrast) {
    return this.isHighContrast(contrast) ? '#fff' : '#000';
  }

  this.isHighContrast = function(contrast) {
    if (contrast) {
      return contrast === 'high';
    }
    else {
      return $('body').hasClass('contrast-high');
    }
  };

  this.updateGraphAnnotationColors = function(contrast, chartInfo) {
    if (chartInfo.options.annotation) {
      chartInfo.options.annotation.annotations.forEach(function(annotation) {
        if (contrast === 'default') {
          $.extend(true, annotation, annotation.defaultContrast);
        }
        else if (contrast === 'high') {
          $.extend(true, annotation, annotation.highContrast);
        }
      });
    }
  };

  this.updateHeadlineColor = function(contrast, chartInfo) {
    if (chartInfo.data.datasets.length > 0) {
      var firstDataset = chartInfo.data.datasets[0];
      var isHeadline = (typeof firstDataset.disaggregation === 'undefined');
      if (isHeadline) {
        var newColor = this.getHeadlineColor(contrast);
        firstDataset.backgroundColor = newColor;
        firstDataset.borderColor = newColor;
        firstDataset.pointBackgroundColor = newColor;
        firstDataset.pointBorderColor = newColor;
      }
    }
  }

  this.toCsv = function (tableData) {
    var lines = [],
    headings = _.map(tableData.headings, function(heading) { return '"' + translations.t(heading) + '"'; });

    lines.push(headings.join(','));

    _.each(tableData.data, function (dataValues) {
      var line = [];

      _.each(headings, function (heading, index) {
        line.push(dataValues[index]);
      });

      lines.push(line.join(','));
    });

    return lines.join('\n');
  };

  var setDataTableWidth = function(table) {
    table.find('thead th').each(function() {
      var textLength = $(this).text().length;
      for(var loop = 0; loop < view_obj._tableColumnDefs.length; loop++) {
        var def = view_obj._tableColumnDefs[loop];
        if(textLength < def.maxCharCount) {
          if(!def.width) {
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
    table.find('thead th').each(function() {
      if($(this).data('width')) {
        totalWidth += $(this).data('width');
      } else {
        totalWidth += $(this).width();
      }
    });

    // ascertain whether the table should be width 100% or explicit width:
    var containerWidth = table.closest('.dataTables_wrapper').width();

    if(totalWidth > containerWidth) {
      table.css('width', totalWidth + 'px');
    } else {
      table.css('width', '100%');
    }
  };

  var initialiseDataTable = function(el, info) {
    var nonYearColumns = [];
    for (var i = 1; i < info.table.headings.length; i++) {
      nonYearColumns.push(i);
    }
    var datatables_options = options.datatables_options || {
      paging: false,
      bInfo: false,
      bAutoWidth: false,
      searching: false,
      responsive: false,
      order: [[0, 'asc']],
      columnDefs: [
        {
          targets: nonYearColumns,
          createdCell: function(td, cellData, rowData, row, col) {
            $(td).text(view_obj.alterDataDisplay(cellData, rowData, 'table cell'));
          },
        },
      ],
    }, table = $(el).find('table');

    datatables_options.aaSorting = [];

    view_obj.alterTableConfig(datatables_options, info);
    table.DataTable(datatables_options);
    table.removeAttr('role');
    table.find('thead th').removeAttr('rowspan').removeAttr('colspan').removeAttr('aria-label');
    setDataTableWidth(table);
  };

  this.createSelectionsTable = function(chartInfo) {
    this.createTable(chartInfo.selectionsTable, chartInfo.indicatorId, '#selectionsTable', true);
    $('#tableSelectionDownload').empty();
    this.createDownloadButton(chartInfo.selectionsTable, 'Table', chartInfo.indicatorId, '#tableSelectionDownload');
    this.createSourceButton(chartInfo.shortIndicatorId, '#tableSelectionDownload');
    this.createIndicatorDownloadButtons(chartInfo.indicatorDownloads, chartInfo.shortIndicatorId, '#tableSelectionDownload');
  };


  this.createDownloadButton = function(table, name, indicatorId, el) {
    if(window.Modernizr.blobconstructor) {
      var downloadKey = 'download_csv';
      if (name == 'Chart') {
        downloadKey = 'download_chart';
      }
      if (name == 'Table') {
        downloadKey = 'download_table';
      }
      var gaLabel = 'Download ' + name + ' CSV: ' + indicatorId.replace('indicator_', '');
      var tableCsv = this.toCsv(table);
      var fileName = indicatorId + '.csv';
      var downloadButton = $('<a />').text(translations.indicator[downloadKey])
        .attr(opensdg.autotrack('download_data_current', 'Downloads', 'Download CSV', gaLabel))
        .attr({
          'download': fileName,
          'title': translations.indicator.download_csv_title,
          'class': 'btn btn-primary btn-download',
          'tabindex': 0
        });
      var blob = new Blob([tableCsv], {
        type: 'text/csv'
      });
      if (window.navigator && window.navigator.msSaveBlob) {
        // Special behavior for IE.
        downloadButton.on('click.openSdgDownload', function(event) {
          window.navigator.msSaveBlob(blob, fileName);
        });
      }
      else {
        downloadButton
          .attr('href', URL.createObjectURL(blob))
          .data('csvdata', tableCsv);
      }
      if (name == 'Chart') {
        this._chartDownloadButton = downloadButton;
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
        'class': 'btn btn-primary btn-download',
        'tabindex': 0
      }));
    }
  }

  this.updateChartDownloadButton = function(table) {
    if (typeof this._chartDownloadButton !== 'undefined') {
      var tableCsv = this.toCsv(table);
      var blob = new Blob([tableCsv], {
        type: 'text/csv'
      });
      var fileName = this._chartDownloadButton.attr('download');
      if (window.navigator && window.navigator.msSaveBlob) {
        // Special behavior for IE.
        this._chartDownloadButton.off('click.openSdgDownload')
        this._chartDownloadButton.on('click.openSdgDownload', function(event) {
          window.navigator.msSaveBlob(blob, fileName);
        });
      }
      else {
        this._chartDownloadButton
          .attr('href', URL.createObjectURL(blob))
          .data('csvdata', tableCsv);
      }
    }
  }

  this.updateIndicatorDataViewStatus = function(oldDatasets, newDatasets) {
    var status = '',
        hasData = newDatasets.length > 0,
        dataAdded = newDatasets.length > oldDatasets.length,
        dataRemoved = newDatasets.length < oldDatasets.length,
        getDatasetLabel = function(dataset) { return dataset.label; },
        oldLabels = oldDatasets.map(getDatasetLabel),
        newLabels = newDatasets.map(getDatasetLabel);

    if (!hasData) {
      status = translations.indicator.announce_data_not_available;
    }
    else if (dataAdded) {
      status = translations.indicator.announce_data_added;
      var addedLabels = [];
      newLabels.forEach(function(label) {
        if (!oldLabels.includes(label)) {
          addedLabels.push(label);
        }
      });
      status += ' ' + addedLabels.join(', ');
    }
    else if (dataRemoved) {
      status = translations.indicator.announce_data_removed;
      var removedLabels = [];
      oldLabels.forEach(function(label) {
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

  this.createSourceButton = function(indicatorId, el) {
    var gaLabel = 'Download Source CSV: ' + indicatorId;
    $(el).append($('<a />').text(translations.indicator.download_source)
    .attr(opensdg.autotrack('download_data_source', 'Downloads', 'Download CSV', gaLabel))
    .attr({
      'href': opensdg.remoteDataBaseUrl + '/data/' + indicatorId + '.csv',
      'download': indicatorId + '.csv',
      'title': translations.indicator.download_source_title,
      'class': 'btn btn-primary btn-download',
      'tabindex': 0
    }));
  }

  this.createIndicatorDownloadButtons = function(indicatorDownloads, indicatorId, el) {
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

  this.tableHasData = function(table) {
    for (var i = 0; i < table.data.length; i++) {
      if (table.data[i].length > 1) {
        return true;
      }
    }
    return false;
  }

  this.createTable = function(table, indicatorId, el) {

    options = options || {};
    var that = this,
    table_class = options.table_class || 'table table-hover';

    // clear:
    $(el).html('');

    if(table && this.tableHasData(table)) {
      var currentTable = $('<table />').attr({
        'class': table_class,
        'width': '100%'
      });

      currentTable.append('<caption>' + that._model.chartTitle + '</caption>');

      var table_head = '<thead><tr>';

      var getHeading = function(heading, index) {
        var arrows = '<span class="sort"><i class="fa fa-sort-down"></i><i class="fa fa-sort-up"></i></span>';
        var button = '<span tabindex="0" role="button" aria-describedby="column-sort-info">' + translations.t(heading) + '</span>';
        return (!index) ? button + arrows : arrows + button;
      };

      table.headings.forEach(function (heading, index) {
        table_head += '<th' + (!index ? '': ' class="table-value"') + ' scope="col">' + getHeading(heading, index) + '</th>';
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
        .click(function() {
          var sortDirection = $(this).attr('aria-sort');
          $(this).find('span[role="button"]').attr('aria-sort', sortDirection);
        });
    } else {
      $(el).append($('<h3 />').text(translations.indicator.data_not_available));
      $(el).addClass('table-has-no-data');
      $('#selectionTableFooter').hide();
    }
  };

  this.sortFieldGroup = function(fieldGroupElement) {
    var sortLabels = function(a, b) {
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
};
// @deprecated start
// Some backwards compatibiliy code after Lodash migration.
_.findWhere = _.find;
// @deprecated end

var indicatorController = function (model, view) {
  this._model = model;
  this._view = view;
};

indicatorController.prototype = {
  initialise: function () {
    this._model.initialise();
  }
};
$(document).ready(function() {
    $('.nav-tabs').each(function() {
        var tabsList = $(this);

        // Allow clicking on the <li> to trigger tab click.
        tabsList.find('li').click(function(event) {
            if (event.target.tagName === 'LI') {
                $(event.target).find('> a').click();
            }
        });
    });
});
$(document).ready(function() {
    $('.nav-tabs').each(function() {
        var tabsList = $(this);
        var tabs = tabsList.find('li > a');
        var panes = tabsList.parent().find('.tab-pane');

        panes.attr({
            'class': 'tabPanel',
            'role': 'tabpanel',
            'aria-hidden': 'true',
            'tabindex': '0',
        }).hide();

        tabsList.attr({
            'role': 'tablist',
        });

        tabs.each(function(idx) {
            var tab = $(this);
            var tabId = 'tab-' + tab.attr('href').slice(1);
            var pane = tabsList.parent().find(tab.attr('href'));

            tab.attr({
                'id': tabId,
                'role': 'tab',
                'aria-selected': 'false',
                'tabindex': '-1',
            }).parent().attr('role', 'presentation');

            tab.removeAttr('href');

            pane.attr('aria-labelledby', tabId);

            tab.click(function(e) {
                e.preventDefault();

                tabsList.find('> li.active')
                    .removeClass('active')
                    .find('> a')
                    .attr({
                        'aria-selected': 'false',
                        'tabindex': '-1',
                    });

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
        tabsList.find('li:first').addClass('active').find(' > a').attr({
            'aria-selected': 'true',
            'tabindex': '0',
        });

        // Set keydown events on tabList item for navigating tabs
        tabsList.delegate('a', 'keydown', function(e) {
            var tab = $(this);
            switch (e.which) {
                case 37:
                    if (tab.parent().prev().length != 0) {
                        tab.parent().prev().find('> a').click();
                        e.preventDefault();
                    }
                    else {
                        tabsList.find('li:last > a').click();
                        e.preventDefault();
                    }
                    break;
                case 39:
                    if (tab.parent().next().length != 0) {
                        tab.parent().next().find('> a').click();
                        e.preventDefault();
                    }
                    else {
                        tabsList.find('li:first > a').click();
                        e.preventDefault();
                    }
                    break;
            }
        });
    });
});
var indicatorSearch = function() {

  var urlParams = new URLSearchParams(window.location.search);
  var searchTerms = urlParams.get('q');
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

    if (useLunr) {
      // Engish-specific tweak for words separated only by commas.
      if (opensdg.language == 'en') {
        lunr.tokenizer.separator = /[\s\-,]+/
      }

      var searchIndex = lunr(function () {
        if (opensdg.language != 'en' && lunr[opensdg.language]) {
          this.use(lunr[opensdg.language]);
        }
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
    else {
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
    $('#search').css('visibility', 'hidden');
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
      Object.keys(result.matchData.metadata).forEach(function(matchedTerm) {
        matchedTerms[matchedTerm] = true;
      })
    });
    return Object.keys(matchedTerms);
  }

  // Helper function to get a boost score, if any.
  function getSearchFieldOptions(field) {
    var opts = {}
    // @deprecated start
    if (opensdg.searchIndexBoost && !Array.isArray(opensdg.searchIndexBoost)) {
      if (opensdg.searchIndexBoost[field]) {
        opts['boost'] = parseInt(opensdg.searchIndexBoost[field])
      }
      return opts;
    }
    // @deprecated end
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
$(function() {

  // @deprecated start
  if (typeof translations.search === 'undefined') {
    translations.search = { search: 'Search' };
  }
  if (typeof translations.general === 'undefined') {
    translations.general = { hide: 'Hide' };
  }
  // @deprecated end

  var topLevelSearchLink = $('.top-level span:eq(1), .top-level button:eq(1)');

  var resetForSmallerViewport = function() {
    topLevelSearchLink.text('Search');
    $('.top-level li').removeClass('active');
    $('.top-level span').removeClass('open');
  };

  var topLevelMenuToggle = document.querySelector("#menuToggle");

  topLevelMenuToggle.addEventListener("click", function(){
    setTopLevelMenuAccessibilityActions();
  });
  function setTopLevelMenuAccessibilityActions(){
    if(topLevelMenuIsOpen()){
      setAriaExpandedStatus(true);
      focusOnFirstMenuElement();
    }
    else{
      setAriaExpandedStatus(false);
    }
    function topLevelMenuIsOpen(){
      return topLevelMenuToggle.classList.contains("active");
    }
    function setAriaExpandedStatus(expandedStatus){
      topLevelMenuToggle.setAttribute("aria-expanded", expandedStatus.toString());
    }
    function focusOnFirstMenuElement(){
      var firstMenuElement = getFirstMenuElement();
      firstMenuElement.focus();
    }
    function getFirstMenuElement(){
      return document.querySelector("#menu .nav-link:first-child a");
    }
  }

  $('.top-level span, .top-level button').click(function() {
    var target = $(this).data('target');

    $('.top-level li').removeClass('active');
    topLevelSearchLink.text('Search');

    var targetEl = $('#' + target);
    var wasVisible = targetEl.is(':visible');

    // hide everything:
    $('.menu-target').hide();
    $(".top-level li button[data-target='" + target + "']").attr("aria-expanded", "false");

    if(target === 'search') {
      $(this).toggleClass('open');

      if($(this).hasClass('open') || !wasVisible) {
        $(this).text(translations.general.hide);
      } else {
        $(this).text(translations.search.search);
      }
    } else {
      // menu click, always hide search:
      topLevelSearchLink.removeClass('open');
      topLevelSearchLink.text(translations.search.search);
    }

    if(!wasVisible) {
      targetEl.show();
      $(".top-level li button[data-target='" + target + "']").attr("aria-expanded", "true");
      $(this).parent().addClass('active');
      $('#indicator_search').focus();
    }
  });

  $(window).on('resize', function(e) {
    var viewportWidth = window.innerWidth,
        previousWidth = $('body').data('vwidth'),
        breakpointWidth = 768;

    if(viewportWidth > breakpointWidth && previousWidth <= breakpointWidth) {
      // switched to larger viewport:
      $('.menu-target').show();
    } else if(previousWidth >= breakpointWidth && viewportWidth < breakpointWidth) {
      // switched to smaller viewport:
      $('.menu-target').hide();
      resetForSmallerViewport();
    }

    // update the viewport width:
    $('body').data('vwidth', viewportWidth);
  });
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
      var controlTpl = '' +
        '<ul id="selection-list"></ul>' +
        '<div class="legend-swatches">' +
          '{legendSwatches}' +
        '</div>' +
        '<div class="legend-values">' +
          '<span class="legend-value left">{lowValue}</span>' +
          '<span class="arrow left"></span>' +
          '<span class="legend-value right">{highValue}</span>' +
          '<span class="arrow right"></span>' +
        '</div>';
      var swatchTpl = '<span class="legend-swatch" style="width:{width}%; background:{color};"></span>';
      var swatchWidth = 100 / this.plugin.options.colorRange.length;
      var swatches = this.plugin.options.colorRange.map(function(swatchColor) {
        return L.Util.template(swatchTpl, {
          width: swatchWidth,
          color: swatchColor,
        });
      }).join('');
      var div = L.DomUtil.create('div', 'selection-legend');
      div.innerHTML = L.Util.template(controlTpl, {
        lowValue: this.plugin.alterData(opensdg.dataRounding(this.plugin.valueRange[0])),
        highValue: this.plugin.alterData(opensdg.dataRounding(this.plugin.valueRange[1])),
        legendSwatches: swatches,
      });
      return div;
    },

    update: function() {
      var selectionList = L.DomUtil.get('selection-list');
      var selectionTpl = '' +
        '<li class="{valueStatus}">' +
          '<span class="selection-name">{name}</span>' +
          '<span class="selection-value" style="left: {percentage}%;">{value}</span>' +
          '<span class="selection-bar" style="width: {percentage}%;"></span>' +
          '<i class="selection-close fa fa-remove"></i>' +
        '</li>';
      var plugin = this.plugin;
      var valueRange = this.plugin.valueRange;
      selectionList.innerHTML = this.selections.map(function(selection) {
        var value = plugin.getData(selection.feature.properties);
        var percentage, valueStatus;
        if (value) {
          valueStatus = 'has-value';
          var fraction = (value - valueRange[0]) / (valueRange[1] - valueRange[0]);
          percentage = Math.round(fraction * 100);
        }
        else {
          value = '';
          valueStatus = 'no-value';
          percentage = 0;
        }
        return L.Util.template(selectionTpl, {
          name: selection.feature.properties.name,
          valueStatus: valueStatus,
          percentage: percentage,
          value: plugin.alterData(opensdg.dataRounding(value)),
        });
      }).join('');

      // Assign click behavior.
      var control = this;
      $('#selection-list li').click(function(e) {
        var index = $(e.target).closest('li').index()
        var selection = control.selections[index];
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
    // Player options.
    playerOptions: {
      transitionTime: 1000,
      loop: false,
      startOver: true
    },
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

      knobElement.setAttribute('tabindex', '0');
      knobElement.setAttribute('role', 'slider');
      knobElement.setAttribute('aria-label', translations.indicator.map_year_slider);
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
      currentTime: new Date(years[0].time).getTime(),
    });
    // Create the player.
    options.player = new L.TimeDimension.Player(options.playerOptions, options.timeDimension);
    // Listen for time changes.
    if (typeof options.yearChangeCallback === 'function') {
      options.timeDimension.on('timeload', options.yearChangeCallback);
    };
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

      this._button.setAttribute('role', 'button');
      this._accessibleCollapse();
      this._button.innerHTML = '<i class="fa fa-search" aria-hidden="true"></i>';

      this._cancel.setAttribute('role', 'button');
      this._cancel.setAttribute('aria-label', this._cancel.title);
      this._cancel.innerHTML = '<i class="fa fa-close" aria-hidden="true"></i>';

      // Prevent the delayed collapse when tabbing out of the input box.
      L.DomEvent.on(this._cancel, 'focus', this.collapseDelayedStop, this);

      return container;
    },
    _accessibleExpand: function() {
      this._accessibleDescription(translations.indicator.map_search_hide);
      this._button.setAttribute('aria-expanded', 'true');
    },
    _accessibleCollapse: function() {
      this._accessibleDescription(translations.indicator.map_search_show);
      this._button.setAttribute('aria-expanded', 'false');
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
      return this;
    },
    showTooltip: function(records) {
      L.Control.Search.prototype.showTooltip.call(this, records);
      this._accessibleDescription(translations.indicator.map_search);
      this._button.removeAttribute('aria-expanded');
      return this._countertips;
    },
    _handleSubmit: function(e) {
      // Prevent the enter key from immediately collapsing the search bar.
      if ((typeof e === 'undefined' || e.type === 'keyup') && this._input.value === '') {
        return;
      }
      L.Control.Search.prototype._handleSubmit.call(this, e);
    },
    _createAlert: function(className) {
      var alert = L.Control.Search.prototype._createAlert.call(this, className);
      alert.setAttribute('role', 'alert');
      return alert;
    }
  });
}());
function initialiseGoogleAnalytics(){
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

    sendPageviewToGoogleAnalytics();
}

function sendPageviewToGoogleAnalytics(){
    ga('create', '', 'auto');
    ga('require', 'eventTracker', {
        attributePrefix: 'data-'
    });
    // anonymize user IPs (chops off the last IP triplet)
    ga('set', 'anonymizeIp', true);
    // forces SSL even if the page were somehow loaded over http://
    ga('set', 'forceSSL', true);
    ga('send', 'pageview');
}


