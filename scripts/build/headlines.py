# -*- coding: utf-8 -*-
"""
Created on Wed Oct 18 16:26:09 2017

@author: dashton
"""

# %% Setup

import pandas as pd
import glob
import os


# %% Filter a dataset

def filter_headline(df):
    """Given a dataframe filter it down to just the headline data.

    In the case of multiple units it will keep all headline for each unit.
    """
    special_cols = ['Year', 'Units', 'Value']

    # Select the non-data rows and filter rows that are all missing (nan)
    disag = df.drop(special_cols, axis=1, errors='ignore')
    headline_rows = disag.apply(lambda x: x.isnull()).all(axis=1)

    headline = df.filter(special_cols, axis=1)[headline_rows]

    return headline


# %% Run for one csv


def run_headline(csv):
    """Create a filtered version of an indicator dataset that only includes \
    the headline data. For indicators with a Units column this will be \
    included.

    Args:
        csv (str): The file name that we want to check

    Returns:
        bool: Status
    """
    status = True

    try:
        df = pd.read_csv(csv)
    except Exception as e:
        print(csv, e)
        return False

    # Get the headline data
    try:
        headline = filter_headline(df)
    except Exception as e:
        print(csv, e)
        return False
    
    # Write out the edges
    try:
        # Build the new filename
        csv_file = os.path.split(csv)[-1]
        new_file = csv_file.replace('indicator', 'headlines')
        new_path = os.path.join('data', 'headlines', new_file)
        # Write out
        headline.to_csv(new_path, index=False, encoding='utf-8')
    except Exception as e:
        print(csv, e)
        return False

    return status

# %% Main script


def main():
    """Filter headline data for progressive enhancement"""
    status = True

    # Create the place to put the files
    os.makedirs("data/headlines", exist_ok=True)

    csvs = glob.glob("data/indicator*.csv")
    print("Creating headlines for " + str(len(csvs)) + " csv files...")

    for csv in csvs:
        status = status & run_headline(csv)
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed csv checks")
    else:
        print("Success")
