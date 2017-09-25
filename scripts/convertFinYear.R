# A small script to convert data with financial years
# Remember to add a footnote to the dataset

path <- "data/indicator_5-2-1.csv"
fin <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)

# If you're nervous run the commented line below
#data.frame(Year = fin$Year, Year1 = stringr::str_extract(fin$Year, "(^[0-9]+)"), stringsAsFactors = FALSE) %>% View
fin$Year <- as.integer(stringr::str_extract(fin$Year, "(^[0-9]+)"))

write.csv(fin, file = path, row.names = FALSE, na = "")
