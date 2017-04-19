library(reshape2)
library(dplyr)

oldDefault <- structure(list(year = 2015L, var_1 = 0L, var_2 = 0L),
                        .Names = c("year", "var_1", "var_2"),
                        class = "data.frame", row.names = c(NA, -1L))  

newDefault <- data.frame(Year = c(2015L, 2015L, 2015L, 2016L, 2016L, 2016L),
                         Group = c("A", "B", NA, "A", "B", NA), 
                         Value = c(1, 3, 2, 1, 3, 2),
                         stringsAsFactors = FALSE)


# Read in -----------------------------------------------------------------


csvfiles <- Sys.glob("data/indicator*.csv")
names(csvfiles) <- gsub("\\.csv$", "", gsub("^data/indicator_", "", csvfiles))

csvs <- lapply(csvfiles, read.csv, stringsAsFactors = FALSE,
               na.strings = c("", " ", "NA", "N/A", "NULL"))


# Copy the new default ----------------------------------------------------


newcsvs <- lapply(csvs, function(x) newDefault)


# Override for 3-3-1 ------------------------------------------------------

ind <- "3-3-1"
csv <- csvs[[ind]]
csv <- data.frame(Year = csv$Year, Group = NA_character_, 
                     Value = csv$People.diagnosed.with.HIV.in.2015..Number.per.100.000,
                     stringsAsFactors = FALSE)
newcsvs[[ind]] <- csv

# 3-2-1 -----------------
ind <- "3-2-1"
csv <- csvs[[ind]]
csv <- data.frame(Year = csv$year,
                  Group = NA_character_,
                  Value = csv$under5_mortalityrate,
                  stringsAsFactors = FALSE)
newcsvs[[ind]] <- csv

# 3-2-2 ----------------------------
ind <- "3-2-2"
csv <- read.csv("data/indicator_3-2-2.csv", skip = 1, stringsAsFactors = FALSE)
csvStage <- csv[,1:4]
names(csvStage) <- gsub("^X", "", gsub("\\.", "", names(csvStage)))
csvStageL <- melt(csvStage, id.var = "Year", variable.name = "Stage", value.name = "Value")

csvSex <- csv[,c(1,5:6)]
names(csvSex) <- gsub("^X", "", gsub("\\.", "", names(csvSex)))
csvSexL <- melt(csvSex, id.var = "Year", variable.name = "Sex", value.name = "Value")

# Birth Place
csvBP <- csv[,c(1,8:(length(csv)-1))]
names(csvBP) <- gsub("^X", "", gsub("\\.", "", names(csvBP)))
names(csvBP)[2] <- "All"
csvBP <- csvBP[,!vapply(csvBP, function(x) all(is.na(x)), logical(1))]
csvBPL <- melt(csvBP, id.var = "Year", variable.name = "BirthPlaceOfMother", value.name = "Value")
csvBPL$BirthPlaceOfMother[csvBPL$BirthPlaceOfMother == "All"] <- NA_character_

csvNew <- csvSexL %>%
  full_join(csvStageL, by = c("Year", "Value")) %>%
  full_join(csvBPL, by = c("Year", "Value")) %>%
  select(Year, Stage, Sex, BirthPlaceOfMother, Value) %>%
  arrange(Year)

newcsvs[[ind]] <- csvNew

# 3-4-2 ------------------
ind <- "3-4-2"
csv <- read.csv("data/indicator_3-4-2.csv", skip = 1, stringsAsFactors = FALSE)
csvSex <- csv[,1:4]
names(csvSex)[1:4] <- c("Year", "All", "Male", "Female")
csvSexL <- melt(csvSex, id.var = "Year", variable.name = "Sex", value.name = "Value")
csvSexL$Sex[csvSexL$Sex == "All"] <- NA_character_

csvAge <- csv[,c(1,5:length(csv))]
csvAgeL <- melt(csvAge, id.var = "Year", variable.name = "Age", value.name = "Value")
csvAgeL$Age <- gsub("^X", "", gsub("\\.", "-", csvAgeL$Age))

csvNew <- csvSexL %>%
  full_join(csvAgeL, by = c("Year", "Value")) %>%
  select(Year, Sex, Age, Value) %>%
  arrange(Year, Age)

newcsvs[[ind]] <- csvNew


# Write all ---------------------------------------------------------------

for (i in seq_along(newcsvs)) {
  file <- file.path("data", paste0("indicator_", names(newcsvs)[i], ".csv"))
  cat(file, fill = TRUE)
  
  write.csv(newcsvs[[i]], file = file, na = "", row.names = FALSE)
}

