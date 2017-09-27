# -*- coding: utf-8 -*-
"""
Created on Thu May  4 13:53:01 2017

@author: dougashton
"""

#%% setup

import yaml
import glob


#%% Checkinga single item 
def check_meta(meta, fname):
    """Check an individual metadata and return logical status"""
    
    # As the number of checks increase you may want to think of a more scalable way to do this

    status = True
    
    if("reporting_status" not in meta):
        print("reporting_status missing in " + fname)
        status = False
    else:
        valid_statuses = ['notstarted', 'inprogress', 'complete']
        
        if(meta["reporting_status"] not in valid_statuses):
            err_str = "invalid reporting_status in " + fname + ": " \
                      + meta["reporting_status"] + " must be one of " \
                      + str(valid_statuses)
            print(err_str)
            status = False
        
    return status

    
#%% Read each yaml and run the checks

def main():

    status = True
    
    metas = glob.glob("_indicators/*.md")
    
    print("Checking " + str(len(metas)) + " metadata files...")
    
    for met in metas:
        with open(met, encoding = "UTF-8") as stream:
            meta = next(yaml.safe_load_all(stream))
        status = status & check_meta(meta, fname = met)
    
  
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed metadata checks")
    else:
        print("Success")
