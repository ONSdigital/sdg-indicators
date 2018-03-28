# -*- coding: utf-8 -*-
"""
Created on Tue Oct 10 13:43:17 2017

@author: dashton
"""

from ruamel.yaml import YAML
import io

# %% The yaml header part


def write_yaml_header(x):
    """Write the yaml header to a string"""
    # Need a string as a file to write to
    strio = io.StringIO()
    # Set the yaml object for pretty printing
    yaml = YAML(typ='rt')
    yaml.default_flow_style = False
    # Write out
    yaml.dump(x, strio)
    yaml_lines = strio.getvalue()
    strio.close()

    header_lines = ["---\n", yaml_lines, "---\n"]

    return header_lines

# %% Combine


def write_yamlmd(yamlmd, fname):
    """Doug docstrings!"""
    header_lines = write_yaml_header(yamlmd[0])

    output = header_lines + yamlmd[1]
    with open(fname, 'w', encoding='UTF-8') as f:
        f.writelines(output)
