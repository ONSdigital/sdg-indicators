opensdg.annotationPresets = {
    common: {
        // This "common" preset is applied to all annotations automatically.
        borderColor: '#505a5f',
        type: 'line',
        label: {
            backgroundColor: 'black',
            fontColor: 'white',
        },
        // This "highContrast" overrides colors when in high-contrast mode.
        highContrast: {
            label: {
                backgroundColor: 'white',
                fontColor: 'black'
            }
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
        borderDash: [5, 5],
        label: {
            position: 'right',
            content: translations.indicator.annotation_2030_target,
        },
    },
    series_break: {
      mode: 'vertical',
      borderColor: '#949494',
      borderDash: [10, 5],
      borderWidth: 2,
      highContrast: {
          borderColor: 'white',
      },
      label: {
          position: 'top',
          xAdjust: 6,
          content: ['series break:', 'see footnote for details'],
          fontColor: '#666',
          backgroundColor: 'rgba(255,255,255,1)'
      }
    }
};
