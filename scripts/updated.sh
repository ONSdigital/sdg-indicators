#!/bin/bash

cd _indicators

for i in $(ls *-*.md)
do
	date_updated=$(git log -n 1 --pretty=format:%ai -- ${i})
	sha_updated=$(git log -n 1 --pretty=format:%H -- ${i})
	echo $i: $date_updated " " $sha_updated
done
	
