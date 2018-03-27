# -*- coding: utf-8 -*-
"""
Created on Mon Mar 26 13:32:35 2018

@author: dashton
"""

from sdg.path import indicator_path # local package
from subprocess import getstatusoutput
import git

# %% Get file updates


def get_git_update(f):
    """Change into the working directory of the file (it might be a submodule)
    and get the latest git history"""
    
    f_dir, f_name = os.path.split(f)
    g = git.Git(f_dir)

    git_date = g.log('--pretty=%ai', '-n', '1', '--', f_name)
    git_sha = g.log('--pretty=%H', '-n', '1', '--', f_name)
        
    return {'date': git_date,
            'sha': git_sha,
            'file': f,
            'remote': 'pass'}   



def get_git_updates(inid):
    print(inid)
    meta_update = get_git_update(indicator_path(inid, ftype='meta', mode='r'))
    data_update = get_git_update(indicator_path(inid, ftype='data', mode='r'))
    
    return {'admin_release_date': data_update['date'],
            'admin_release_sha': data_update['sha'],
            'admin_meta_release_date': meta_update['date'],
            'admin_meta_release_sha': meta_update['sha'],
            }


# %% Read each csv and run the checks


def main():
    """Process the metadata files ready for site build"""
    status = True
    ids = sdg.path.get_ids()
    
    print("Building " + str(len(ids)) + " metadata files...")

    for inid in ids:
        try:
            status = status & build_meta(inid)
        except Exception as e:
            status = False
            print(inid, e)
    return(status)

if __name__ == '__main__':
    status = main()
    if(not status):
        raise RuntimeError("Failed to build metadata")
    else:
        print("Success")
