# -*- coding: utf-8 -*-
"""
Created on Thu Oct  5 14:15:46 2017

@author: dashton
"""

import glob
import yaml

# %% Checkinga single item


def is_unreported(meta, fname):
    """Check if it's reported"""

    if("reporting_status" not in meta):
        print("reporting_status missing in " + fname)

    return meta["reporting_status"] != 'complete'

# %% Read each yaml and run the checks


def main():

    metas = glob.glob("_indicators/*.md")

    print("Checking " + str(len(metas)) + " metadata files...")

    for met in metas:
        with open(met, encoding="UTF-8") as stream:
            meta = next(yaml.safe_load_all(stream))
        # Load in md content as well?
        if is_unreported(meta, met):
            if meta["reporting_status"] == "notstarted":
                txt = "\nWe are still looking for a suitable data source for this indicator. Please contact us if you think you can help by emailing <a href=\"mailto:SustainableDevelopment@ons.gov.uk\">SustainableDevelopment@ons.gov.uk</a>.\n\nIn the future we plan to split this category so we can show you which indicators represent data gaps are currently in development and which are still left to look at.\n"
            else:
                txt = "\nWe have found a suitable source of data for this indicator or relevant proxy at national level. We are currently quality assuring the data and preparing it for publication.\n"
            with open(met, "a") as metafile:
                metafile.write(txt)

if __name__ == '__main__':
    main()
