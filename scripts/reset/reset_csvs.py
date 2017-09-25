# Import standard libraries
import argparse
import os
import re

# Import third party libraries
import pandas as pd


# Define a function that identifies the list of indicators and generates
# new indicator files for each of them
def reset_csvs():
  """
  Reset the csv files with test data
  """
  # Perform checks to make sure the arguments were passed correctly
  try:
    df = pd.read_csv("../data/sdg_indicator_datasets.csv")
  except:
    if not os.path.exists(file):
      print("sdg_indicator_datasets.csv does not exist")
    else:
      print("Could not open sdg_indicator_datasets.csv, is it locked?")
  
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
    blank_df.to_csv(
      '../data/indicator_' + re.sub('\.', '-', i) + '.csv',
      index = False
    )


if __name__ == "__main__":
  filepath = os.path.dirname(os.path.realpath(__file__))
  os.chdir(filepath)
  reset_csvs()