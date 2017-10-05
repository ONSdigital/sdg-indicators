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
            print(met)


if __name__ == '__main__':
    main()
