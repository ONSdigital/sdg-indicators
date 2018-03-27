# -*- coding: utf-8 -*-
"""
Created on Mon Mar 26 13:32:35 2018

@author: dashton


"""

import re
import sys
import os
# None-standard library
import git
# Local modules
sys.path.append('scripts')
import sdg
import yamlmd
from sdg.path import indicator_path  # local package


# %% Get all new metadata


def build_meta(inid):
    """Perform pre-processing for the metadata files"""
    status = True
    # Read and write paths may be different
    fr = indicator_path(inid, ftype='meta', mode='r')
    fw = indicator_path(inid, ftype='meta', mode='w')

    meta = yamlmd.read_yamlmd(fr)

    git_update = sdg.git.get_git_updates(inid)

    for k in git_update.keys():
        meta[0][k] = git_update[k]

    yamlmd.write_yamlmd(meta, fw)

    return status

# %% Read each csv and run the checks


def main():
    """Process the metadata files ready for site build"""
    status = True
    ids = sdg.path.get_ids()

    print("Building " + str(len(ids)) + " metadata files...")

    for inid in ids:
        try:
            print(inid)
            status = status & build_meta(inid)
        except Exception as e:
            status = False
            print(inid, e)
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed to build metadata")
    else:
        print("Success")
