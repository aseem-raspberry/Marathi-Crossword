# Marathi Shabdakode (मराठी शब्दकोडे)

A crossword puzzle application for the Marathi language.

## Overview

This repository contains a Python/Flask based web application that generates and serves Marathi crossword puzzles.

### Word Bank
The application includes a `marathi_wordbank.json` file containing over 15,000 unique Marathi nouns scraped from the Indian Language WordNet. The words are categorized into `easy`, `medium`, and `complex` difficulties and include associated Marathi clues.

## Web Application

The web version operates with a Python backend using Flask, generating crossword puzzles on the fly using a backtracking algorithm. The frontend is built with HTML, CSS, and Vanilla JavaScript.

### Features
* Dynamic generation of 10x10 crossword grids.
* Three difficulty levels balancing different pools of words: Easy, Medium, Hard.
* Interactive board with features to reveal a letter, reveal a word, or check for errors.
* Local puzzle archiving and auto-saving of progress.

### Setup & Running Locally

1. Make sure you have Python installed.
2. Install the required dependencies from `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask application:
   ```bash
   python app.py
   ```
4. Access the application in your browser at `http://localhost:5050` (or `http://127.0.0.1:5050`).
