# -*- coding: utf-8 -*-
"""
Remove leading and trailing whitespace from csv files

@author: dashton
"""
# %% setup

import glob
import pandas as pd
from pandas.api.types import is_string_dtype

# %% Strip trailing whitespace


def strip_outisde_whitespace(df, csv):
    """Loop over string columns and check for any trailing or leading
    whitespace"""
    changed = False
    for column in df:
        if is_string_dtype(df[column]):
            has_trailing_ws = df[column].str.endswith(' ', na=False)
            has_leading_ws = df[column].str.startswith(' ', na=False)
            has_ws = (has_trailing_ws | has_leading_ws).any()
            if has_ws:
                changed = True
                df[column] = df[column].str.strip()
    if changed:
        df.to_csv(csv, index=False, encoding='utf-8')
        print(csv, "changing")


def main():
    """Run csv checks on all indicator csvs in the data directory"""
    csvs = glob.glob("data/indicator*.csv")
    print("Checking " + str(len(csvs)) + " csv files...")

    for csv in csvs:
        try:
            df = pd.read_csv(csv)
            strip_outisde_whitespace(df, csv)
        except Exception as e:
            print(csv, e)

if __name__ == '__main__':
    main()
