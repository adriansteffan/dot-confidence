setwd(dirname(rstudioapi::getSourceEditorContext()$path))
library(tidyverse)

read_all <- function(pattern) {
  list.dirs("data", recursive = FALSE) %>%
    map_dfr(function(d) {
      f <- list.files(d, pattern = pattern, full.names = TRUE)
      if (length(f) != 1) return(tibble())
      parts <- strsplit(basename(f), "\\.")[[1]]
      read_csv(f, show_col_types = FALSE) %>%
        mutate(sessionID = parts[2])
    })
}

session  <- read_all("^session\\.")
rdk      <- read_all("^rdk\\.") %>% left_join(session, by = "sessionID")
feedback <- read_all("^feedback\\.") %>% left_join(session, by = "sessionID")

rdk %>%
  filter(!is.na(rt)) %>%
  ggplot(aes(x = rt, fill = condition)) +
  geom_histogram(binwidth = 50, alpha = 0.9) +
  facet_wrap(~condition, ncol = 1, labeller = labeller(condition = str_to_title)) +
  labs(title = "RT Distribution by Condition", x = "RT (ms)", y = "Count") +
  theme_minimal(base_size = 10) + theme(legend.position = "none")

rdk %>%
  filter(!is.na(rt)) %>%
  ggplot(aes(x = factor(coherence), y = rt, fill = condition)) +
  geom_boxplot(alpha = 0.9) +
  labs(title = "RT by Coherence and Condition", x = "Coherence", y = "RT (ms)") +
  theme_minimal(base_size = 10)

feedback %>%
  filter(!is.na(userConfidence)) %>%
  ggplot(aes(x = userConfidence, fill = condition)) +
  geom_histogram(binwidth = 2, alpha = 0.9) +
  facet_wrap(~condition, ncol = 1) +
  labs(title = "Confidence Distribution by Condition", x = "Confidence (%)", y = "Count") +
  theme_minimal(base_size = 10) + theme(legend.position = "none")

feedback %>%
  filter(!is.na(userConfidence)) %>%
  ggplot(aes(x = factor(isUserCorrect), y = userConfidence, fill = condition)) +
  geom_boxplot(alpha = 0.9) +
  labs(title = "Confidence by Correctness", x = "Correct", y = "Confidence (%)") +
  theme_minimal(base_size = 10)
