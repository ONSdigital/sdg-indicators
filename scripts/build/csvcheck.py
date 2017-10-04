# -*- coding: utf-8 -*-
"""
Created on Wed October 4

@author: dougashton
"""

# %% setup

import glob
import pandas as pd
from pandas.api.types import is_numeric_dtype, is_string_dtype

# %% Checking a single item


def check_csv(csv):
    """Check an individual csv files and return logical status"""
    status = True

    try:
        df = pd.read_csv(csv)
    except Exception as e:
        print(e)
        return False

    # Run through the check functions
    status = status & check_headers(df, csv)
    status = status & check_data_types(df, csv)
    status = status & check_trailing_whitespace(df, csv)

    return status


# %% Check correct columns


def check_headers(df, csv):
    status = True
    cols = df.columns

    if cols[0] != 'Year':
        status = False
        print(csv, ': First column not called "Year"')
    if cols[-1] != 'Value':
        status = False
        print(csv, ': Last column not called "Value"')

    return status

# %% Check data types


def check_data_types(df, csv):
    """Year and Value must be numeric"""
    status = True
    try:
        if not is_numeric_dtype(df['Value']):
            status = False
            print(csv, ': Value column must be a numeric data type')
        if not is_numeric_dtype(df['Year']):
            status = False
            print(csv, ': Year column must be a numeric data type')
    except Exception as e:
        print(e)
        return False

    return status

# %% Check for trailing whitespace in character columns


def check_trailing_whitespace(df, csv):
    """Loop over string columns and check for any trailing whitespace"""
    status = True
    for column in df:
        if is_string_dtype(df[column]):
            has_trailing_ws = df[column].str.endswith(' ', na=False).any()
            if has_trailing_ws:
                status = False
                print(csv, ': Trailing whitespace in column: ', column)
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
