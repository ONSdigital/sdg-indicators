# -*- coding: utf-8 -*-
"""
Created on Tue Oct 10 16:54:09 2017

@author: dashton
"""

from yamlmd import write_yamlmd
import ruamel.yaml
import os
import pytest

base_path = os.path.dirname(os.path.realpath(__file__))

# %% read test


def test_read(tmpdir):
    """Check that the main write function works"""
    test_header = ruamel.yaml.comments.CommentedMap({"a": 1})
    test_md = ["\n", "the first thing\n"]

    tmp_file = tmpdir.mkdir("md").join("test.md").strpath

    write_yamlmd([test_header, test_md], tmp_file)

    with open(tmp_file) as f:
        tmp_lines = f.readlines()

    assert tmp_lines[0] == "---\n"
    assert len(tmp_lines) == 5
