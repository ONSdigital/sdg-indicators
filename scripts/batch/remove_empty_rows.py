# -*- coding: utf-8 -*-
"""
Remove leading and trailing whitespace from csv files

@author: dashton
"""
# %% setup

import glob
import pandas as pd

# %% Strip trailing whitespace


def remove_empty_rows(df, csv):
    """Find rows with all missing and remove"""
    empty_rows = df.isnull().all(axis=1)
    if empty_rows.any():
        df = df.loc[~empty_rows, ]  # remove empty rows
        df.to_csv(csv, index=False, encoding='utf-8')
        print(csv, "changing")


def main():
    """Run csv checks on all indicator csvs in the data directory"""
    csvs = glob.glob("data/indicator*.csv")
    print("Checking " + str(len(csvs)) + " csv files...")

    for csv in csvs:
        try:
            df = pd.read_csv(csv)
            remove_empty_rows(df, csv)
        except Exception as e:
            print(csv, e)

if __name__ == '__main__':
    main()
