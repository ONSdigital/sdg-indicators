var chartDataProcessor = {

    colors: ['e5243b', '4c9f38', 'ff3a21', '26bde2', 'dd1367', 'fd9d24', '3f7e44', '00689d'],

    getChartInfo: function(data, datasetObject) {
        var datasets = [];
        var labels = [];

        for(var loop = 1; loop < Object.keys(data[0]).length; loop++) {

            var dataset = {
                label: Object.keys(data[0])[loop],
                backgroundColor: '#' + this.colors[loop - 1],
                borderColor: '#' + this.colors[loop - 1],
                borderWidth: 1,
                data: _.pluck(data, Object.keys(data[0])[loop])
            };

            datasets.push(_.isObject(datasetObject) ? _.extend(dataset, datasetObject) : dataset);
        }

        return {
            datasets: datasets,
            labels: _.pluck(data, Object.keys(data[0])[0])
        };
    }
};
