# -*- coding: utf-8 -*-
"""
Created on 2017-10-04

@author: dougashton
"""

# %% setup

import glob
import pandas as pd
import numpy as np

# %% Utility


def is_numeric(col):
    """Guess whether a column is numeric"""
    dt = col.dtype
    return dt == np.dtype('float64') or dt == np.dtype('int64')


def is_string(col):
    """Guess whether a column is a string"""
    dt = col.dtype
    return dt == np.dtype('str') or dt == np.dtype('O')

# %% Checking a single item


def check_csv(csv):
    """Check an individual csv files and return logical status"""
    status = True

    try:
        df = pd.read_csv(csv)
    except Exception as e:
        print(csv, e)
        return False

    # Run through the check functions
    status = status & check_headers(df, csv)
    status = status & check_data_types(df, csv)
    status = status & check_trailing_whitespace(df, csv)
    status = status & check_leading_whitespace(df, csv)

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
        print(csv, ': Last column not called "Value", instead got ', cols[-1])
    # Check for whitespace in column names
    # series conversion seems necessary in pandas 0.13
    scol = pd.Series(df.columns)
    ends_white = scol.str.endswith(' ')
    if ends_white.any():
        status = False
        print(csv, ': Column names have trailing whitespace',
              str(df.columns[ends_white]))
    starts_white = scol.str.startswith(' ')
    if starts_white.any():
        status = False
        print(csv, ': Column names have leading whitespace',
              str(df.columns[starts_white]))

    return status

# %% Check data types


def check_data_types(df, csv):
    """Year and Value must be numeric"""
    status = True
    try:
        if not is_numeric(df['Value']):
            status = False
            print(csv, ': Value column must be a numeric data type')
        if not is_numeric(df['Year']):
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
        if is_string(df[column]):
            has_trailing_ws = df[column].str.endswith(' ', na=False).any()
            if has_trailing_ws:
                status = False
                print(csv, ': Trailing whitespace in column: ', column)
    return status

# %% Check for trailing whitespace in character columns


def check_leading_whitespace(df, csv):
    """Loop over string columns and check for any leading whitespace"""
    status = True
    for column in df:
        if is_string(df[column]):
            has_leading_ws = df[column].str.startswith(' ', na=False).any()
            if has_leading_ws:
                status = False
                print(csv, ': Leading whitespace in column: ', column)
    return status

# %% Read each csv and run the checks


def main():
    """Run csv checks on all indicator csvs in the data directory"""
    status = True
    csvs = glob.glob("data/indicator*.csv")
    print("Checking " + str(len(csvs)) + " csv files...")

    for csv in csvs:
        try:
            status = status & check_csv(csv)
        except Exception as e:
            status = False
            print(csv, e)
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed csv checks")
    else:
        print("Success")
