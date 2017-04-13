var chartDataProcessor = {

    colors: ['e5243b', '4c9f38', 'ff3a21', '26bde2', 'dd1367', 'fd9d24', '3f7e44', '00689d'],

    getChartInfo: function(data, datasetObject) {
        var datasets = [];
        var labels = [];

        console.log('data: ', data);
        console.log('datasetObject: ', datasetObject);

        for(var loop = 1; loop < Object.keys(data[0]).length; loop++) {

            var dataset = {
                label: Object.keys(data[0])[loop],
                backgroundColor: '#' + this.colors[loop - 1],
                borderColor: '#' + this.colors[loop - 1],
                borderWidth: 1,
                data: _.pluck(data, Object.keys(data[0])[loop])
            };

            var ds2 = _.pluck(data, Object.keys(data[0])[loop]);
            ds2 = _.map(ds2, function(i) { return +i + 10; });

            var dataset2 = {
                label: Object.keys(data[0])[loop] + ' ds2',
                backgroundColor: '#' + this.colors[loop],
                borderColor: '#' + this.colors[loop],
                borderWidth: 1,
                data: ds2

            };

            datasets.push(_.isObject(datasetObject) ? _.extend(dataset, datasetObject) : dataset);
            datasets.push(_.isObject(datasetObject) ? _.extend(dataset2, datasetObject) : dataset2);
        }

        var res = {
            datasets: datasets,
            labels: _.pluck(data, Object.keys(data[0])[0])
        };

        console.log('res: ', res);

        return res;
    }
};
