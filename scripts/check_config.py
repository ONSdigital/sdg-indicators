# -*- coding: utf-8 -*-
"""
Check the Jekyll Config Files

@author: dougashton

The purpose of this script is to check that the _config.yml does not contain
errors that might pass the Jekyll build but cause issues on the website
"""

#%% setup

import yaml

# %% Check prose configs match

def check_same(stage, prod):
    """Check elements of staging and prod that should be the same"""
    status = True
    # Check following elements:
    items = ['prose', 'country', 'markdown', 'exclude', 'collections']
    for item in items:
        if stage[item] != prod[item]:
            print("Config must match between staging/production for: " + item)
            status = False

    return status

# %% Read each yaml and run the checks

def main():

    status = True

    print("Checking Jekyll config files...")

    # Read the config files
    with open('_config.yml', encoding = "UTF-8") as stream:
        staging = next(yaml.safe_load_all(stream))
    with open('_config_prod.yml', encoding = "UTF-8") as stream:
        production = next(yaml.safe_load_all(stream))

    status = status & check_same(staging, production)

    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed config checks")
    else:
        print("Success")
