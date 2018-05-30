# -*- coding: utf-8 -*-
"""
Created on Wed May 30 15:47:21 2018

@author: dashton
"""

import glob
import yamlmd
# if you don't have yamlmd do
# pip install git+git://github.com/dougmet/yamlmd

page_only_vars = ['layout',
                  'permalink',
                  'indicator']

metas = glob.glob('_indicators/*.md')

for meta in metas:
    ymd = yamlmd.read_yamlmd(meta)
    
    ymd_head = dict(ymd[0])
    
    out_header = {k: v for (k,v) in ymd_head.items() if k in page_only_vars}
    
    out_ymd = [out_header, ymd[1]]
    
    yamlmd.write_yamlmd(out_ymd, meta)
