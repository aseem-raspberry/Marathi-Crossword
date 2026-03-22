# Marathi Shabdakode (मराठी शब्दकोडे)

A crossword puzzle application for the Marathi language.

## Overview

This repository contains two main components for the Marathi crossword project:
1. **Web Application (Python/Flask)**: A single-page application (SPA) that generates and serves Marathi crossword puzzles.
2. **Android App Specification**: A detailed plan for building a fully offline, senior-friendly Android version using Kotlin and Jetpack Compose.

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

## Android Application (Design Specification)

Detailed in the [`specification.md`](specification.md) file, the Android app design targets a robust, senior-friendly experience.

### Key Requirements
- **Fully Offline**: Relies on a Room (SQLite) database initialized with the provided word bank. No server or internet connection is required.
- **Localization**: Completely in the Marathi language, using Devanagari script for the grid and UI elements.
- **Accessibility Focus**: Designed for seniors (80+ years), employing high contrast colors, minimum 48dp touch targets, responsive cell sizes, and a fixed grid layout where only the clues are horizontally split and scrollable.
- **Tech Stack**: Kotlin, Jetpack Compose.

For complete implementation specifics, database schemas, and algorithms to handle Marathi characters and letter intersection logistics, please refer directly to the [Specification](specification.md).
