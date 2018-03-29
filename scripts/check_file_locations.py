# -*- coding: utf-8 -*-
"""
Look for files that are in the wrong place

@author: dougashton

It is easy to accidentally upload a file to the wrong place. This script is in
charge of keeping the repo clean and tidy and preventing accidental uploads.
"""

#%% setup

import pandas as pd
import glob
import os

# %% Check prose configs match

def check_file_pattern(pattern, dir='.'):
    """Check no files matching pattern exist in dir
    
    Args:
        dir: str. The directory to check
        pattern: regular expression
    
    Returns:
        True status if no files found. False if they are.
    """
    status = True
    
    files = pd.Series(glob.glob(os.path.join(dir, "*")))
    hits = files.str.contains(pattern)

    if hits.any():
        status = False
        print("Found unwanted files in "+dir+
        ": ", list(files[hits]))

    return status

# %% Read each yaml and run the checks

def main():

    status = True

    print("Checking file locations...")

    status = status & check_file_pattern(r"[0-9]+-.*\.md")
    status = status & check_file_pattern(r"indicator_[0-9].*\.csv")

    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed file location checks")
    else:
        print("Success")
