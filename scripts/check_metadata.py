# -*- coding: utf-8 -*-
"""
Created on Thu May  4 13:53:01 2017

@author: dougashton
"""

#%% setup

import yaml
import glob


# %% Checking a single item 
def check_meta(meta, fname):
    """Check an individual metadata and return logical status"""
    
    # As the number of checks increase you may want to think of a more scalable way to do this

    status = True
    
    status = status & check_required(meta, fname)
    status = status & check_reporting_status(meta, fname)

    # Should this indicator have a chart?
    meta['check_graph'] = (
      meta['reporting_status'] == 'complete' and
      meta['published'] and 
      not meta['data_non_statistical']
    )

    status = status & check_graph(meta, fname)

    return status

# %% Check required

def check_required(meta, fname):

    required = ['reporting_status', 'published']

    status = True
    
    for req in required:
          if(req not in meta):
              print(req + " missing in " + fname)
              status = False

    if (meta['reporting_status'] == 'complete'):
        if('data_non_statistical' not in meta):
            print("data_non_statistical" + " missing in " + fname + " for published reported indicator")
            status = False
        
    return status


# %% Check for reporting status


def check_reporting_status(meta, fname):
    """Check an individual metadata and return logical status"""
    
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

# %% Check graph type


def check_graph(meta, fname):
    """Check that the graph_type field is valid if it is published"""

    status = True

    if(meta['check_graph']):

        if ('graph_title' not in meta):
            print('graph_title missing for published statistical indicator in ' + fname)
            status = False

        if ('graph_type' not in meta):
            print('graph_type missing for published statistical indicator in ' + fname)
            return False

        valid_graph_types = ['line', 'bar']

        if(meta["graph_type"] not in valid_graph_types):
            err_str = "invalid graph_type in " + fname + ": " \
                      + meta["graph_type"] + " must be one of " \
                      + str(valid_graph_types)
            print(err_str)
            status = False
        
    return status
        

def check_reporting_status(meta, fname):
    """Check an individual metadata and return logical status"""
    
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
    

# %% Read each yaml and run the checks

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
