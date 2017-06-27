# reset_csvs.py

import argparse
import pandas as pd
import re
import os

def reset_csvs():
  """
  Reset the csv files with test data
  """
  # Perform checks to make sure the arguments were passed correctly
  df = pd.read_csv("../data/sdg_indicator_datasets.csv")
  indicators = df['indicator'].dropna()
  # Create the test data sets
  blank_df = {
    'Year': [2015, 2015, 2015, 2016, 2016, 2016],
    'Group': ['A', 'B', '', 'A', 'B', ''],
    'Value': [1, 3, 2, 1, 3, 2]
  }
  blank_df = pd.DataFrame(
    blank_df, columns = ['Year', 'Group', 'Value']
  )
  # Overwrite the csvs
  for i in indicators:
    blank_df.to_csv('../data/indicator_' + re.sub('\.', '-', i) + '.csv')

if __name__ == "__main__":
  filepath = os.path.dirname(os.path.realpath(__file__))
  os.chdir(filepath)
  reset_csvs()