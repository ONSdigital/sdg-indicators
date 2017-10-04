# -*- coding: utf-8 -*-
"""
Created on Wed October 4

@author: dougashton
"""

# %% setup

import glob
import pandas as pd
from pandas.api.types import is_numeric_dtype

# %% Checkinga single item


def check_csv(csv):
    """Check an individual csv files and return logical status"""
    status = True

    try:
        df = pd.read_csv(csv)
    except Exception as e:
        print(e)
        return False

    cols = df.columns

    if cols[0] != 'Year':
        status = False
        print('First column not called "Year" in', csv)
    if cols[-1] != 'Value':
        status = False
        print('Last column not called "Value" in', csv)
    else:
        # Check the data type
        if not is_numeric_dtype(df['Value']):
            status = False
            print('Value column must be a numeric data type')
    return status


# %% Read each csv and run the checks

def main():
    """Run csv checks on all indicator csvs in the data directory"""
    status = True
    csvs = glob.glob("data/indicator*.csv")
    print("Checking " + str(len(csvs)) + " csv files...")

    for csv in csvs:
        status = status & check_csv(csv)
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed csv checks")
    else:
        print("Success")
