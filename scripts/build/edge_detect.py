# -*- coding: utf-8 -*-
"""
Created on 2017-10-04

@author: dougashton

This is one of the more complicated scripts in the suite. It does he following\
 for every csv file:
    1. For each column decide a parent child relationship with every other.
    2. Column A is a parent of column B if:
        a. B is only present when A is present
        b. A is sometimes present when B is not present
        c. If A and B are only seen together then the left-most column in the\
         data frame is the parent
    3. Once edges have been defined they are pruned so that grand parents are\
    not mistaken for parents
"""

# %% setup

import pandas as pd
import numpy as np
import glob
import itertools
import os.path

# %% Check correct columns - copied from csvcheck


def check_headers(df, csv):
    """This is copied from csv check but the primary goal is to check that
    the csv headers are appropriate for edge detection"""
    status = True
    cols = df.columns

    if cols[0] != 'Year':
        status = False
        print(csv, ': First column not called "Year"')
    if cols[-1] != 'Value':
        status = False
        print(csv, ': Last column not called "Value"')

    return status

# %% Detect the edges


def x_without_y(x, y):
    """
     Args:
        x (pandas Series): Left hand column
        y (pandas Series): Right hand column
    """
    return np.any(np.logical_and(
                y.isnull(),
                np.logical_not(x.isnull())
               ))


def detect_all_edges(df, csv):
    """Loop over the data frame and try all pairs"""
    cols = df.columns
    # Remove the protected columns
    cols = cols[[x not in ['Year', 'Units', 'Value'] for x in cols]]

    edges = pd.DataFrame(columns=['From', 'To'])

    # Loop over all pairs
    for a, b in itertools.combinations(cols, 2):
        # Check if a and b are ever present without each other
        a_without_b = x_without_y(df[a], df[b])
        b_without_a = x_without_y(df[b], df[a])

        if a_without_b and not b_without_a:
            # A is a parent of B
            edges = edges.append(pd.DataFrame({'From': [a], 'To': [b]}))
        elif b_without_a and not a_without_b:
            # B is a parent of A
            edges = edges.append(pd.DataFrame({'From': [b], 'To': [a]}))
        elif not a_without_b and not b_without_a:
            # Co-Depedent. Choose A as left-most.
            edges = edges.append(pd.DataFrame({'From': [a], 'To': [b]}))

    return edges


# %% Remove Grand Parents


def prune_grand_parents(edges):
    """Prune edges that shortcut a parent-child relationship

    Args:
        edges (DataFrame): The edges data frame

    Returns:
        The data frame with grand parent edges removed
    """
    for group in edges['To'].unique():

        parents0 = list(edges['From'][edges['To'] == group])

        grand_parents = list()

        while len(parents0) > 0:
            for p in parents0:
                parents = list(edges['From'][edges['To'] == p])
                if len(parents) > 0:
                    grand_parents = grand_parents + parents
                parents0 = parents

        keep = np.logical_not(
                np.logical_and(
                        edges['From'].isin(grand_parents),
                        edges['To'] == group
                        )
                )

        edges = edges[keep]
    return edges


# %% Write out edges for one csv


def run_edge_detection(csv):
    """Check dependencies between columns and write out the edges

    If there are any problems return False as this is part of the build.

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

    # Run through the check functions
    if not check_headers(df, csv):
        return False

    # Get the edges
    try:
        edges = detect_all_edges(df, csv)
        edges = prune_grand_parents(edges)
    except Exception as e:
        print(csv, e)
        return False

    # Write out the edges
    try:
        # Build the new filename
        csv_file = os.path.split(csv)[-1]
        edge_file = csv_file.replace('indicator', 'edges')
        edge_path = os.path.join('data', 'edges', edge_file)
        # Write out
        edges.to_csv(edge_path, index=False, encoding='utf-8')
    except Exception as e:
        print(csv, e)
        return False

    return status


# %% Read each csv and run the checks


def main():
    """Run csv checks on all indicator csvs in the data directory"""
    status = True
    # Create the place to put the files
    os.makedirs("data/edges", exist_ok=True)
    
    csvs = glob.glob("data/indicator*.csv")
    print("Running edge detection for " + str(len(csvs)) + " csv files...")

    for csv in csvs:
        status = status & run_edge_detection(csv)
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed edge detection")
    else:
        print("Success")
