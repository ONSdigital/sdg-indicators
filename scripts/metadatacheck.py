# -*- coding: utf-8 -*-
"""
Created on Thu May  4 13:53:01 2017

@author: dougashton
"""

#%% setup

import yaml

status = True

#%% Checkinga single item 
def check_meta(meta):
    """Check an individual metadata and return logical status"""
    print(meta["sdg_goal"])
    return True

#%% Find all items

import glob
metas = glob.glob("_indicators/*.md")
    
#%% Get the yaml from the front matter

for met in metas:
    print(met)
    with open(met) as stream:
        meta = next(yaml.load_all(stream))
    status = status & check_meta(meta)

#%%

print(status)
