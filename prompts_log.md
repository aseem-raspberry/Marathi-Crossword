# Conversation Prompts — Marathi Shabdakode Development

A log of all user prompts from the development session for this project, in chronological order.

---

## Session 1 — Initial Build

**Prompt 1 — Project Kickoff**
> Role: You are an expert Full-Stack Developer and UI/UX Designer specializing in accessibility for seniors (80+ years old).
>
> Objective: Build a responsive web application for a "Marathi Shabdakode" (Crossword) generator and player. The app must be optimized for mobile/tablet portrait mode and hosted on a Raspberry Pi using a lightweight backend (SQLite).
>
> **1. Visual Design & UI (Senior-Focused)**
> - Language: The entire interface (buttons, labels, hints, messages) must be in Marathi using a clear, bold Unicode font (e.g., Tiro Devanagari Marathi).
> - Layout: Use a Vertical Split View. Top 50%: Fixed Crossword Grid. Bottom 50%: Scrollable Hints area.
> - Contrast: Use a high-contrast theme (e.g., dark black text on a soft cream or white background). No small icons; use large, labeled buttons.
> - Zero-Scrolling Play: The grid must remain static at the top so the user never loses sight of the puzzle while reading hints.
>
> **2. Core Functionality & Logic**
> - Input: Support the native mobile Marathi keyboard.
> - Three difficulty levels: Easy (5×5), Medium (8×8), Hard (12×12).
> - Generate crosswords using a proper backtracking algorithm so words intersect correctly.
> - Auto-save progress in SQLite.
> - Archive of previously played puzzles.
> - Help tools: Reveal Letter, Reveal Word, Check Errors.

---

## Session 2 — UI Improvements

**Prompt 2 — UI Enhancement Requests**
> A couple of further improvements:
> 1. The bottom panel can be split further vertically so that horizontal and vertical hints can be displayed there.
> 2. In 12×12 mode there were a lot of empty rows at the bottom. Ensure that you do not keep any row or column where there is not a single letter to be guessed.
> 3. Also include a scrollbar at the side just to go back to the top or bottom because the interface is moving vertically.

---

## Session 3 — Word Bank Expansion

**Prompt 3 — First Word Bank Request**
> The existing word bank is too small. increase it to at least 10000+ words and hints by scrapping from multiple newspaper websites like sakal, lokmat etc. Also try to optimize the size of the word bank by potentially compressing it.

**Prompt 4 — Continue (after scraper ran)**
> Continue

**Prompt 5 — Revised Word Bank Request**
> The existing word bank is too small. increase it to at least 1000+ words and hints by scrapping from shabdakode section of multiple newspaper websites like sakal, lokmat etc. Also try to optimize the size of the word bank by potentially compressing it.

**Prompt 6 — Switch to WordNet Word Bank**
> Please use the wordbank from file "marathi_wordbank_cleaned.json". remove all other word_bank python and json files.

---

## Session 4 — Data Cleanup

**Prompt 7 — Spaces in Words**
> I am still getting word with spaces. how to get rid of it

**Prompt 8 — Underscores in Words**
> There are many words where space is simply replaced by _. remove all such words too

---

## Session 5 — Layout Bug (Scrolling)

**Prompt 9 — Grid Scrolling Issue**
> Especially during the 12×12 grid when we select the hints which are towards the bottom, the whole screen moves up. Ideally the top crossword section should always remain fixed. What should move is the bottom split section where the top hints can scroll up and be out of view if required. Show a scrollbar for both horizontal and vertical clues.

**Prompt 10 — Stop Server**
> stop the server

**Prompt 11 — Question: Why a Database?**
> explain why the database is used

**Prompt 12 — Continue**
> Continue

**Prompt 13 — Word Bank Rebuild**
> I have modified the marathi_wordbank.json but still somehow words from old wordbank are being suggested. please rebuild

---

## Session 6 — Layout Refinement

**Prompt 14 — Grid Scrolling Issue (Repeated)**
> Especially during the 12×12 grid when we select the hints which are towards the bottom, the whole screen moves up. Ideally the top crossword section should always remain fixed. What should move is the bottom split section where the top hints can scroll up and be out of view if required. Show a scrollbar for both horizontal and vertical clues.

**Prompt 15 — Responsive Layout**
> Do not use absolutes in the split view. Reduce the size of board and below fonts as per the window size. Make it responsive. But ensure that the entire board is always visible on the screen while the two lists of clues below is scrollable.

---

## Session 7 — Publish to GitHub

**Prompt 16 — GitHub Push**
> Help me push this code to a new github repository

**Prompt 17 — Repository URL**
> Publish it to https://github.com/aseem-raspberry/Marathi-Crossword

---

## Session 8 — Android App Planning

**Prompt 18 — Android App Question**
> Would it be possible to rewrite this exact same functionality as an android app? or should I start a new folder and repository for that?

**Prompt 19 — Offline Requirement**
> I don't want a separate server for the android app. it should work locally without internet.

**Prompt 20 — Specification File**
> Create a specification.md file based on the current status which I will copy to new folder along with the marathi_wordbank.json. Everything else should get generated in the new folder.

**Prompt 21 — Prompts Log**
> Can you also push all my prompts in this conversation in a md file and push it to git?
