# Import standard libraries
import os
import re
import glob

# Import third party libraries
import pandas as pd


# Define a function that identifies the list of indicators and generates
# new indicator files for each of them
def reset_csvs():
    """
    Reset the csv files with test data
    """
    # Perform checks to make sure the arguments were passed correctly
    indicators = glob.glob("../data/indicator_*.csv")
    if len(indicators) == 0:
        raise RuntimeError("Didn't find any indicators in data directory")

    # Create the test data sets
    blank_df = {
      'Year': [2015, 2015, 2015, 2016, 2016, 2016],
      'Group': ['A', 'B', '', 'A', 'B', ''],
      'Value': [1, 3, 2, 1, 3, 2]
    }
    blank_df = pd.DataFrame(
        blank_df, columns=['Year', 'Group', 'Value']
    )
    # Overwrite the csvs
    for i in indicators:
        blank_df.to_csv(i, index=False)


if __name__ == "__main__":
    filepath = os.path.dirname(os.path.realpath(__file__))
    os.chdir(filepath)
    reset_csvs()
