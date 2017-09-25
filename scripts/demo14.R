# A redo of the planet fruit test data

library(dplyr)
library(tidyr)

years <- 2010:2016
grades <- c("A", "B")
planets <- c("Earth", "Mercury", "Venus")
fruits <- c("Apples", "Lemons", "Oranges")



continents <- c("Earth.America", "Earth.Asia", "Earth.Africa", "Earth.Australia",
                "Earth.Europe", "Mars.Dawes", "Mars.Madler", "Mars.Herschel I",
                "Venus.Ishtar Terra", "Venus.Aphrodite Terra")

combos <- expand.grid(Year = years, Grade = grades, PC = continents, Fruit = fruits)

all <- separate(combos, PC, c("Planet", "Continent"), sep = "\\.")

set.seed(17)
all$Value <- rnorm(nrow(all), 5, 5) + as.numeric(as.factor(all$Planet))


all0 <- filter(all, FALSE)

groups <- c("Year", "Planet")

summarise_combo <- function(groups, alldat) {
  
  if(!("Year" %in% groups))  groups <- c("Year", groups)
  
  alldat %>%
    dplyr::group_by_(.dots = groups) %>%
    dplyr::summarise(Value = round(mean(Value),3)) %>%
    dplyr::ungroup()
}


combos <- list("Year","Grade", "Planet", "Fruit", 
               c("Grade", "Planet"),
               c("Planet", "Continent"),
               c("Grade", "Planet", "Continent"))

combos_data <- lapply(combos, summarise_combo, alldat = all)

combos_data_cols <- lapply(combos_data, function(x) full_join(all0, x))

final <- do.call("bind_rows", combos_data_cols)

write.csv(final, file = "data/indicator_14-1-1.csv", row.names = FALSE, na = "")
