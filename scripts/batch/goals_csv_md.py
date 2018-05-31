# -*- coding: utf-8 -*-
"""
Created on Thu May 31 09:24:35 2018

@author: dashton
"""

import glob
import yamlmd
import pandas as pd
# if you don't have yamlmd do
# pip install git+git://github.com/dougmet/yamlmd

goals = glob.glob('_goals/*.md')

goals_df = pd.read_csv('data/sdg_goals.csv')

for goal in goals:
    ymd = yamlmd.read_yamlmd(goal)
    ymd_head = dict(ymd[0])
    
    csv_info = goals_df[goals_df['goal']==ymd_head['sdg_goal']].to_dict('records')[0]
    
    out_header = {'title': csv_info['title'],
                  'short': csv_info['short'],
                  'sdg_goal': str(csv_info['goal']),
                  'color': csv_info['colorInfo/hex']
                }
    
    out_ymd = [out_header, ymd[1]]
    
    yamlmd.write_yamlmd(out_ymd, goal)
