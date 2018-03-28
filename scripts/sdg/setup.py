# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

setup(name='sdg',
      version='0.0.1',
      description='Utilities for building the sdg-indicators site',
      url='https://github.com/datasciencecampus/scripts/build/sdg',
      author='Doug Ashton',
      author_email='dashton@mango-solutions.com',
      license='OGL-3',
      packages=find_packages(exclude=['contrib', 'docs', 'tests*']),
      zip_safe=False,
      install_requires=[])
