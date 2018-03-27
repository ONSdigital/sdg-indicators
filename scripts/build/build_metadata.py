# -*- coding: utf-8 -*-
"""
Created on Mon Mar 26 13:32:35 2018

@author: dashton


"""

import re
import sys
import os
# None-standard library
import git
# Local modules
sys.path.append('scripts')
import sdg
import yamlmd
from sdg.path import indicator_path  # local package

# %% Faster but not using right now
# 
# def get_last_update(obj, repo):
#     commit = next(repo.iter_commits(paths=obj.path, max_count=1))
#     git_date = str(commit.committed_datetime.date())
#     return {'file': obj.path, 'sha':commit.hexsha, 'date': git_date}
# 
# repo = git.Repo("data", search_parent_directories=True) 
# tree = repo.tree()
# 
# %time git_update = [get_last_update(obj, repo) for obj in tree['data']]
# 
# %% Get file updates


def get_git_update(inid, ftype):
    """Change into the working directory of the file (it might be a submodule)
    and get the latest git history"""
    f = indicator_path(inid, ftype=ftype, mode='r')
    f_dir, f_name = os.path.split(f)
    
    repo = git.Repo(f_dir, search_parent_directories=True)
    
    commit = next(repo.iter_commits(paths=f, max_count=1))
    git_date = str(commit.committed_datetime.date())
    git_sha = commit.hexsha
    # Turn the remote URL into a commit URL
    remote = repo.remote().url
    remote_bare = re.sub('^.*github\.com(:|\/)', '', remote).replace('.git','')
    commit_url = 'https://github.com/'+remote_bare+'/commit/'+git_sha
    
    return {'date': git_date,
            'sha': git_sha,
            'file': f,
            'id': inid,
            'commit_url': commit_url}
 



def get_git_updates(inid):
    meta_update = get_git_update(inid=inid, ftype='meta')
    data_update = get_git_update(inid=inid, ftype='data')
    
    return {'national_data_update_url_text': data_update['date'],
            'national_data_update_url': data_update['commit_url'],
            'national_metadata_update_url_text': meta_update['date'],
            'national_metadata_update_url': meta_update['commit_url']
            }


# %% Get all new metadata


def build_meta(inid):
    """Perform pre-processing for the metadata files"""
    status = True
    # Read and write paths may be different
    fr = indicator_path(inid, ftype='meta', mode='r')
    fw = indicator_path(inid, ftype='meta', mode='w')

    meta = yamlmd.read_yamlmd(fr)

    git_update = get_git_updates(inid)

    for k in git_update.keys():
        meta[0][k] = git_update[k]

    yamlmd.write_yamlmd(meta, fw)

    return status

# %% Read each csv and run the checks


def main():
    """Process the metadata files ready for site build"""
    status = True
    ids = sdg.path.get_ids()

    print("Building " + str(len(ids)) + " metadata files...")

    for inid in ids:
        try:
            print(inid)
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
