# -*- coding: utf-8 -*-
"""
Created on 2017-10-04

@author: dougashton

This script builds the website csvs from the data repo
"""

# %% setup

import sdg.path
from sdg.path import indicator_path
import os
import shutil
import glob

# %% Write out edges for one csv


def build_csv(inid):
    """
    For a given ID pull in the raw data and write out the website csv

    Returns:
        bool: Status
    """
    status = True

    in_path = indicator_path(inid, ftype='data', mode='r')
    out_path = indicator_path(inid, ftype='data', mode='w')

    try:
        shutil.copy(in_path, out_path)
    except Exception as e:
        print(inid, e)
        return False

    return status


# %% Read each csv and run the checks


def main():
    """Run csv checks on all indicator csvs in the data directory"""
    status = True
    # Create the place to put the files
    os.makedirs("data", exist_ok=True)
    
    inids = sdg.path.get_ids()
    print("Building csvs for " + str(len(inids)) + " indicators...")
    for inid in inids:
        status = status & build_csv(inid)

    print("Copying goals info...")
    in_dir = indicator_path(ftype='data', mode = 'r')
    out_dir = indicator_path(ftype='data', mode = 'w')
    for f in glob.glob(os.path.join(in_dir, 'sdg*.csv')):
      shutil.copy(f, out_dir)

    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed edge detection")
    else:
        print("Success")
