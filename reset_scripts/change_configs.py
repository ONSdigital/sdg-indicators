# Import the libraries
import yaml
import pandas as pd 
import re
import os
import argparse

# Define a function to change the repository name
def reset_yaml(file, repo = None, name = None, adjective = None, org = None):
  
  # Load the config file needed to be changed
  try:
    data = yaml.load(open(file, "r"))
  except:
    if not os.path.exists(file):
      print("{} does not exist".format(file))
    else:
      print("Could not open {}, is it locked?".format(file))

  # Change the relevant parts of the yaml
  if repo != None:
    data["repo_name"] = repo
    data["baseurl"] = "/" + repo
  if name != None:
    if adjective == None:
      adjective = name
      print("Setting adjective to be {}".format(name))
    data["country"]["name"] = name
    data["country"]["adjective"] = adjective
  if org != None:
    data["org_name"] = org

  # Save the yaml
  with open(file, 'w') as outfile:
    yaml.dump(data, outfile, default_flow_style = False)

if __name__ == '__main__':
  # Ensure the path is relative
  filepath = os.path.dirname(os.path.realpath(__file__))
  os.chdir(filepath)
  # Define the argument parse and its arguments
  parser = argparse.ArgumentParser(
    prog = "reset_yaml",
    description = """A function to change the repository name, country name, 
    country adjective and organisation name in the yaml config files.
    """
  )
  parser.add_argument('-f', '--file', type = str, required = True,
                      help = "str: The file name.")
  parser.add_argument('-r', '--repo', type = str, 
                      help = "str: The new repository name")
  parser.add_argument('-n', '--name', type = str, 
                      help = "str: The new country name")
  parser.add_argument('-a', '--adjective', type = str, 
                      help = "str: The new country adjective")
  parser.add_argument('-o', '--org', type = str, 
                      help = "str: The new organisation name")
  args = parser.parse_args()
  # Run the functions
  reset_yaml(
    file = args.file, 
    repo = args.repo, 
    name = args.name, 
    adjective = args.adjective, 
    org = args.org
  )