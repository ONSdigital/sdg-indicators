# -*- coding: utf-8 -*-
"""
Created on Wed Oct 11 21:23:48 2017

@author: dashton
"""

import pandas as pd
import os.path
import urllib.request
# this is a custom package
# pip install git+https://github.com/dougmet/yamlmd
import yamlmd

# # %% Download data files

# ind_url = "https://unstats.un.org/sdgs/indicators/Official%20Revised%20List%20of%20Global%20SDG%20Indicators_17.04.2017_Web.xlsx"
# ind_resp = urllib.request.urlretrieve(ind_url, "scripts/batch/revised_indicators.xlsx")

# tier_url = "https://unstats.un.org/sdgs/files/Tier%20Classification%20of%20SDG%20Indicators_20%20April%202017_web.xlsx"
# tier_resp = urllib.request.urlretrieve(tier_url, "scripts/batch/tier.xlsx")

# %% Read Raw Indicator Data

raw_df = pd.read_excel(
           "scripts/batch/revised_indicators.xlsx",
           names=["x", "GoalsAndTargets", "Indicators", "UNSDIndicatorCode"],
           sheetname=0, skiprows=2)

# %% Raw Tier Data

tier_raw = pd.read_excel(
        "scripts/batch/tier.xlsx",
        names=["UNSDIndicatorCode", "Target", "Indicator", "TierInit",
               "CustodianAgency", "PartnerAgency", "TierUpdated", "Notes"],
        sheetname=2, skiprows=1)

# %% Clean tier data

tier = (tier_raw
        .drop(["Target", "UNSDIndicatorCode","TierInit"], 1)
        .dropna(0, how='all')
        )

tier['Indicator'], tier['TierIndicatorTitle'] = tier['Indicator'].str.split(' ', 1).str

# %% Clean, be sure to run the whole cell

df = (
      raw_df
      .drop("x", 1)
      .dropna(0, how='any', subset=['UNSDIndicatorCode'])
      )
# Fill forwards the goals and targets
df = df.assign(GoalsAndTargets = df.GoalsAndTargets.fillna(method='ffill'))
# The separate steps
df['Indicator'], df['IndicatorTitle'] = df['Indicators'].str.split(' ', 1).str
df['Goal'], df['Target'], df['INDN'] = df['Indicator'].str.split('.').str
df['TargetID'], df['TargetDesc'] = df['GoalsAndTargets'].str.split(' ', 1).str

# Find if the file exists
df = df.assign(
        File=df.Goal + '-' +
        df.Target + '-' +
        df.INDN +
        '.md')
df = df.assign(New = [not os.path.isfile(os.path.join("_indicators", x)) for x in df.File])

# Derive features

df = (df
      .assign(Permalink="/" + df.Goal + "-" +
              df.Target + "-" + df.INDN + "/")
      )
      
# %% Joining all the data sets

df = df.set_index('Indicator')
tier = tier.set_index('Indicator')
# Create a lookup for the tier descriptions
unique_tiers = [
        'Tier I', 'Tier II', 'Tier III', 'Tier III (a)/\nTier II (b,c)',
        'Tier I/II/III depending on indice', 'Tier I (a)/\nTier III (b)',
        'Tier I (ODA)/    Tier II (FDI)', 'Tier I/III']
num_tier = ['1', '2', '3', '3/2', '1/2/3', '1/3', '1/2', '1/3']
tier_map = pd.DataFrame(data={'TierNum': num_tier}, index=unique_tiers)

dft = (df
       .join(tier, how='left')
       .join(tier_map, how='left', on='TierUpdated')
       )



# %% Build new metadata

def build_meta_data(index, row):
    
    row = row.where((pd.notnull(row)), None)
    
    meta = {
    "title": row['IndicatorTitle'],
    "indicator_name": row['IndicatorTitle'],
    "permalink": row['Permalink'],
    "sdg_goal": row['Goal'],
    "layout": "indicator",
    "indicator": index,
    "un_designated_tier": row['TierNum'],
    "un_custodian_agency": row['CustodianAgency'],
    "un_sd_indicator_code": row['UNSDIndicatorCode'],
    "un_notes": row['Notes'],
    "target_id": row['TargetID'],
    "target": row['TargetDesc'],
    }
    
    return meta

# %% Merge metadata

def merge_meta_data(md_meta, meta):
    for key, value in meta.items():
        md_meta[key] = value
    return md_meta

# %% Update metadata

def update_meta_data(index, row):
    
    meta = build_meta_data(index, row)
    
    if not row['New']:
        fname = os.path.join("_indicators", row['File'])
        md_data = yamlmd.read_yamlmd(fname)
    else:
        md_data = [
                {"graph_type": "line",
                 "graph_title": None,
                 "reporting_status": "notstarted"},
                 ['\n', 'We are still looking for a suitable data source for this indicator. Please contact us if you think you can help by emailing <a href="mailto:SustainableDevelopment@ons.gov.uk">SustainableDevelopment@ons.gov.uk</a>.']
                  ]
        
    md_meta = merge_meta_data(md_data[0], meta)
    
    return [md_meta, md_data[1]]

# %% Loop over all indicators
# for index, row in dft.iterrows():
#     new_md = update_meta_data(index, row)
#     new_file = os.path.join("_indicators", row['File'])
#     print(row['File'])
#     yamlmd.write_yamlmd(new_md, new_file)
    
# # %% Find the new files

# empty_data = pd.read_csv("data/indicator_1-1-1.csv")

# for index, row in dft.query('New').iterrows():
#     csv_file = (
#             'indicator_' +
#             row.Goal + '-' +
#             row.Target + '-' +
#             row.INDN + '.csv'
#             )
#     csv_path = os.path.join('data', csv_file)
#     if(not os.path.isfile(csv_path)):
#         empty_data.to_csv(os.path.join("data", csv_file), index=False)


# %% Update site metadata

sim = dft[['Goal', 'TargetID', 'TargetDesc', 'IndicatorTitle']]
sim.index.name = 'indicator_id'
sim.columns = ['goal', 'target_id', 'target', 'indicator']
sim.reset_index().to_csv('data/sdg_indicator_metadata.csv', encoding='utf-8-sig',
        #   index_label='indicator_id'
        )

# Currently this file gets rejected by Jekyll. Need to try from Linux
