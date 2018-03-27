# -*- coding: utf-8 -*-
"""
Created on Tue Oct 10 12:30:57 2017

@author: dashton
"""
# %% Imports

from ruamel.yaml import YAML

# %% Yaml header


def read_yaml_header(fname):
    """Read the first document from yaml file"""
    yaml=YAML(typ='rt')
    with open(fname, encoding="UTF-8") as f:
        meta = next(yaml.load_all(f))
    return meta

# %% Markdown


def read_markdown(fname):
    """Extract the markdown component under the yaml header"""
    with open(fname, encoding="UTF-8") as f:
        content = f.readlines()
    yaml_delim = [i for i, x in enumerate(content) if x.startswith("---")]
    assert len(yaml_delim) > 1

    start_line = yaml_delim[1]+1

    return content[start_line:]

# %% Read everything


def read_yamlmd(fname):
    """ Read a Markdown file that has a yaml header.
        
    Args:
        fname: Path to the file
        
    Returns:
        A tuple containing
        
        - The yaml header as a CommentedMap (similar to dict)
        - The Mardown content as a list of strings (one per line)
        
    Notes
    --------
    
    A typical Markdown file might look like::
        
        ----
        title: Some title
        ----

        # Markdown Content
                
        And text
        
    """
    return (read_yaml_header(fname), read_markdown(fname))
