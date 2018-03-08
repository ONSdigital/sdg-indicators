(function($, d3, window, document, undefined) {

  // Create the defaults once
  var pluginName = 'sdgMap',
    defaults = {
      serviceUrl: 'https://opendata.arcgis.com/datasets/686603e943f948acaa13fb5d2b0f1275_4.geojson',
      width: 350,
      height: 500
    };

  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.options = $.extend({}, defaults, options);

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  }

  Plugin.prototype = {
    init: function() {

      var svg = d3.select(this.element).append("svg")
        .attr("width", this.options.width)
        .attr("height", this.options.height); 
      
      var centered, projection, path,
        width = this.options.width,
        height = this.options.height;

      // Define color scale
      var color = d3.scaleLinear()
        .domain([1, 20])
        .clamp(true)
        .range(['#fff', '#409A99']);

      // Add background
      svg.append('rect')
        .attr('class', 'background')
        .attr('width', this.options.width)
        .attr('height', this.options.height)
        .on('click', clicked);

      var g = svg.append('g');

      var effectLayer = g.append('g')
        .classed('effect-layer', true);

      var mapLayer = g.append('g')
        .classed('map-layer', true);

      var dummyText = g.append('text')
        .classed('dummy-text', true)
        .attr('x', 10)
        .attr('y', 30)
        .style('opacity', 0);

      var bigText = g.append('text')
        .classed('big-text', true)
        .attr('x', 20)
        .attr('y', 45);

      var tooltip = $('<div />').attr('class', 'tooltip hidden');
      $(this.element).append(tooltip);

      //for tooltip 
      // var offsetLeft = $(this.element).offset().left + 10;
      // var offsetTop = $(this.element).offset().top + 10;
      
      // Load map data
      d3.json(this.options.serviceUrl, function(error, mapData) {
        var features = mapData.features;

        // Update color scale domain based on data
        color.domain([0, d3.max(features, nameLength)]);

        projection = d3.geoMercator().fitSize([width, height], mapData);
        path = d3.geoPath().projection(projection);

        // Draw each geographical area as a path
        mapLayer.selectAll('path')
          .data(features)
          .enter().append('path')
          .attr('d', path)
          .attr('vector-effect', 'non-scaling-stroke')
          .style('fill', getFill)
          .style('stroke', '#ccc')
          .on('mouseover', mouseover)
          .on('mouseout', mouseout)
          .on('mousemove', showTooltip)
          .on('click', clicked);
      });

      // Get area name
      function getName(d){
        return d && d.properties ? d.properties.lad16nm : null;
      }

      // Get area name length
      function nameLength(d){
        var n = getName(d);
        return n ? n.length : 0;
      }

      // Get area color
      function getFill(d){
        return color(nameLength(d));
      }

      // When clicked, zoom in
      function clicked(d) {
        var x, y, k;

        // Compute centroid of the selected path
        if (d && centered !== d) {
          var centroid = path.centroid(d);
          x = centroid[0];
          y = centroid[1];
          k = 4;
          centered = d;
        } else {
          x = width / 2;
          y = height / 2;
          k = 1;
          centered = null;
        }

        // Highlight the clicked area
        mapLayer.selectAll('path')
          .style('fill', function(d){return centered && d===centered ? '#D5708B' : getFill(d);});

        // Zoom
        g.transition()
          .duration(750)
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');
      }

      function mouseover(d){
        // Highlight hovered area
        d3.select(this).style('fill', 'orange');

        console.log(getName(d));
      }

      function mouseout(d){
        // Reset area color
        mapLayer.selectAll('path')
          .style('fill', function(d){return centered && d===centered ? '#D5708B' : getFill(d);});

        tooltip.addClass("hidden");

          // Clear area name
        // bigText.text('');
      }

      function showTooltip(d) {
        var mouse = d3.mouse(svg.node())
          .map( function(d) { return parseInt(d); } );

          console.log(mouse);

        tooltip.removeClass("hidden")
          .attr("style", "left:"+(mouse[0] + 10)+"px;top:"+(mouse[1] + 10)+"px")
          .html(d.properties.lad16nm);
      }
    },
  };

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, d3, window, document);
