# -*- coding: utf-8 -*-
"""
A bulk metadata update script to add pdf information to metadata link

@author: Doug Ashton
"""

import yamlmd
import glob
import urllib

# %%

def get_pdf_size(url):
    """Get the size for goal i"""
    url = url.replace("http:", "https:") # Force https
    d = urllib.request.urlopen(url)
    return int(d.info()['Content-Length'])

# %% Add goal pdf information


def add_goal_pdf_info(md, meta):
    """For a given goal find out how big the UN metadata pdf is and add the 
    info to the metadata"""
    pdf_size = get_pdf_size(md[0]['goal_meta_link'])
    goal_meta_text = ('United Nations Sustainable Development Goals Metadata' +
                      ' (pdf ' + str(int(pdf_size / 1024)) + 'kB)')

    md[0]['goal_meta_link_text'] = goal_meta_text
    
    return md

# %% Main


def main():
    """Add pdf info to all indicator metadata"""
    metas = glob.glob('_indicators/*.md')
    print('Processing ' + str(len(metas)) + ' metadata files...')

    for meta in metas:
        try:
            md = yamlmd.read_yamlmd(meta)
            md = add_goal_pdf_info(md, meta)
            yamlmd.write_yamlmd(md, meta)
        except Exception as e:
            print(meta, e)

if __name__ == '__main__':
    main()
