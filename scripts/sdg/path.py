# -*- coding: utf-8 -*-
"""
Utilities for paths in sdg-indicators project

Try to use this as the central location for path related functions

@author: dashton

"""

# %% Imports and globals

import glob
import os

# Paths to raw data and metadata relative to project root
# root_dir = os.path.dirname(os.path.realpath(__file__))
root_dir = ''
meta_dir = os.path.join(root_dir, '_indicators')
data_dir = os.path.join(root_dir, 'data')


# %% Get the IDs by scanning the metadata directory


def extract_id(md_path):
    md = os.path.basename(md_path)
    md_id = os.path.splitext(md)[0]

    return md_id


def get_ids():
    mds = glob.glob(os.path.join(meta_dir, '*-*.md'))
    ids = [extract_id(md) for md in mds]

    return ids


# %% From ID give file path


def indicator_path(inid=None, ftype='data', mode='r', must_work=False):
    """Convert an ID into a data, edge, headline, json, or metadata path

    Args:
        inid: str. Indicator ID with no extensions of paths, eg '1-1-1'. If it
          is None then return the directory path for this ftype
        ftype: str. Which file related to this ID? One of:
            1. data: The csv data path
            2. meta: The md page file
            3. edges: The edge file generated from data
            4. headlines: The headline csv file
            5. json: The json generated data
        mode: str. Is this for reading ('r') or writing ('w')? This can be
            different if the build reads raw data from one location and writes
            to another.
        must_work: bool. If True an IOError is thrown if the file is not found.

    Returns:
        path to the file. If the root_dir is set this will form the base.
    """
    # Check that the input makes sense
    expected_ftypes = ['data', 'meta', 'edges', 'headlines', 'json']
    if ftype not in expected_ftypes:
        raise ValueError("ftype must be on of: " + ", ".join(expected_ftypes))

    prefix = 'indicator_'
    ext = '.csv'
    if ftype == 'data':
        path = data_dir
    elif ftype == 'meta':
        prefix = ''
        ext = '.md'
        path = meta_dir
    elif ftype == 'edges':
        path = os.path.join(data_dir, 'edges')
        prefix = 'edges_'
    elif ftype == 'headlines':
        path = os.path.join(data_dir, 'headlines')
        prefix = 'headlines_'
    elif ftype == 'json':
        path = os.path.join(data_dir, 'json')
        ext = '.json'
    else:
        raise ValueError("Unknown ftype")

    # Get the directory path
    if inid is None:
        f = path
    else:
        f = os.path.join(path, prefix + inid + ext)
    
    if must_work:
        if not os.path.exists(f):
            raise IOError(f + ' not found.')
    return f
