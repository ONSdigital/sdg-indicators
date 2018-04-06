# -*- coding: utf-8 -*-
"""
Created on Tue Oct 10 16:54:09 2017

@author: dashton
"""

from yamlmd import read_yamlmd
import ruamel.yaml
import os
import pytest

base_path = os.path.dirname(os.path.realpath(__file__))

# %% read test


def test_read():
    """Check that the main read function works"""
    lorum_file = os.path.join(base_path, "data", "lorum.md")
    lorum = read_yamlmd(lorum_file)

    assert len(lorum) == 2
    assert isinstance(lorum[0], ruamel.yaml.comments.CommentedMap)
    assert isinstance(lorum[1], list)
