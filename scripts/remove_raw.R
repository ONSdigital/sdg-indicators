# Script to remove all non-specified fields

library(purrr)
library(magrittr)

prose <- yaml::yaml.load_file("_config.yml")
prose <- prose$prose$metadata$`_indicators`
allowed_names <- map_chr(prose, "name")

# not using this now
remove_nulls <- function(x, replace = "") {
  if(is.list(x)) {
    lapply(x, remove_nulls, replace = replace)
  } else {
    if(is.null(x)) replace else x
  }
}

# filter out the ones we don't want
keep_allowed <- function(x, allowed) {
  x[names(x) %in% allowed]
}

read_yaml <- function(x) {
  
  yaml_lines <- readLines(x, encoding = "UTF-8")
  ends <- grep("^---", yaml_lines)
  
  stopifnot(length(ends) == 2)
  
  yaml_lines_inner <- yaml_lines[(ends[1]+1):(ends[2]-1)]
  
  yaml::yaml.load(paste(yaml_lines_inner, collapse = "\n"))
}

write_yaml <- function(x) {
  
  
  #x <- lapply(x, remove_nulls, "")
  
  out <- paste("---",
               gsub("\\n$", "", yaml::as.yaml(x)),
               "---", sep = "\n")
  
  out
}


md_files <- Sys.glob("_indicators/*.md")

for (f in md_files) {
  cat(f, fill = TRUE)
  f %>% read_yaml() %>%
    keep_allowed(allowed_names) %>%
    write_yaml() %>%
    writeLines(con = f)
}
