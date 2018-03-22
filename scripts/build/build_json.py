# -*- coding: utf-8 -*-
"""
Created on Wed Mar 21 13:29:46 2018

@author: dashton

The script will combine the main csv data and the edge data and write out in
JSON format to be loaded directly by the site
"""


# %% setup
import pandas as pd
import glob
import os.path
import math
import json
import gzip

# %% NaNs to None


def nan_to_none(x):
    """Replace nans with None and pass through everything else"""

    if x is None:
        return None

    if(isinstance(x, float)):
        try:
            if math.isnan(x):
                return None
        except Exception as e:
            print("nan_to_none error", e)
    return str(x)


def dict_col_nan_to_none(d):
    """Take a dictionary of lists and replace all nans with None"""
    out = {col: [nan_to_none(x) for x in d[col]] for col in d.keys()}
    return out


def dict_row_nan_to_none(df):
    """Take a list of dicts and replace all nans with None"""
    out = [{k: nan_to_none(row[k]) for k in row.keys()} for row in df]
    return out


def df_nan_to_none(df, orient):
    """Convert a DataFrame to a dictionary into JSON ready nan-less data.

    Args:
        df --- pandas DataFrame
        orient --- either 'records' for rowwise, or 'list' for colwise

    Return:
        A dict of lists or a list of dicts depending on orient"""
    if pd.__version__ < '0.17':
        d = df.to_dict(outtype=orient)
    else:
        d = df.to_dict(orient=orient)
    if(orient == 'list'):
        return dict_col_nan_to_none(d)
    elif(orient == 'records'):
        return dict_row_nan_to_none(d)
    else:
        raise ValueError("orient must be a list or a records")


# %% Get the edge data if it's there


def get_edge_data(csv, orient):
    """Read the edge file associated with a main data csv and return as a
    json ready object

    Args:
        csv --- path to the relevant main data csv
        orient --- either 'records' for rowwise, or 'list' for colwise

    Return:
        Depending on orient either a list of dicts (rowwise) or dict of lists
        (colwise)
    """
    # Write out the edges
    try:
        # Build the new filename
        csv_file = os.path.split(csv)[-1]
        edge_file = csv_file.replace('indicator', 'edges')
        edge_path = os.path.join('data', 'edges', edge_file)
        # Read in
        edges = pd.read_csv(edge_path, encoding='utf-8')
    except Exception as e:
        print(csv, e)
        return False

    if edges.shape[0] < 1:
        return list()
    else:
        return df_nan_to_none(edges, orient=orient)

# %% Get the main data


def get_main_data(csv, orient='records'):
    """Read the main csv data and return as a json ready object

    Args:
        csv --- path to the relevant main data csv
        orient --- either 'records' for rowwise, or 'list' for colwise

    Return:
        Depending on orient either a list of dicts (rowwise) or dict of lists
        (colwise)
    """
    try:
        df = pd.read_csv(csv, encoding='utf-8')
    except Exception as e:
        print(csv, e)
        return False

    if df.shape[0] < 1:
        return list()
    else:
        return df_nan_to_none(df, orient=orient)

# %% Build JSON data


def write_json(csv, orient='list', gz=False):
    """Write out the main csv and edge data as a single json file. This can
    either be as records (orient='records') or as columns (orient='list').

    Args:
        csv --- str: path to the relevant main data csv
        orient --- str: either 'records' for rowwise, or 'list' for colwise
        gz -- bool: if True then compress the output with gzip

    Return:
        status. bool.
    """

    try:
        all_data = {'data': get_main_data(csv, orient=orient),
                    'edges': get_edge_data(csv, orient=orient)}
        all_json = json.dumps(all_data)

        # Build the new filename
        csv_file = os.path.split(csv)[-1]
        json_file = csv_file.replace('.csv', '.json')
        json_path = os.path.join('data', 'json', json_file)
        # Write out
        if gz:
            json_bytes = all_json.encode('utf-8')
            with gzip.open(json_path + '.gz', 'w') as outfile:
                outfile.write(json_bytes)
        else:
            with open(json_path, 'w', encoding='utf-8') as outfile:
                outfile.write(all_json)
    except Exception as e:
        print(csv, e)
        return False

    return True


# %% Read each csv and dump out to json

def main():
    """Read each csv and edge file and write out json"""
    status = True
    # Create the place to put the files
    os.makedirs("data/json", exist_ok=True)

    csvs = glob.glob("data/indicator*.csv")
    print("Building json for " + str(len(csvs)) + " csv files...")

    # For by record use orient='records'
    # For column format use orient='list'
    for csv in csvs:
        status = status & write_json(csv, orient='list', gz=False)
    return(status)


if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed json dump")
    else:
        print("Success")
