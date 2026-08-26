# Time Poverty Diary

A private, browser-based time diary designed for teachers and educators. It runs entirely in the browser and is suitable for GitHub Pages.

## Features

- Create unlimited activities with teacher-focused categories.
- Only one timer runs at a time; starting/resuming a task automatically pauses another running task.
- Paused activities persist indefinitely and can be resumed on a later day.
- Time is assigned to the calendar day on which it was actually worked, including automatic splitting at midnight.
- Completed activities remain available for corrections and can be resumed.
- Add manual entries for work you forgot to time.
- Browse previous/next days or select a date.
- Manage categories without editing code.
- End Workday pauses the currently running activity and records the end-of-day marker.
- Local browser storage keeps diary data off a server.
- JSON backup and restore.
- Daily Excel export named `Time_Poverty_Diary_YYYY-MM-DD.xlsx`, with an activity log, category summary, percentages, and an embedded pie-chart image.

## Files

- `index.html` — application structure
- `styles.css` — visual design
- `app.js` — timers, storage, reports, backup/restore, and Excel export

## Publish with GitHub Pages

1. Create or open your GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. Commit the files.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your main branch and `/ (root)`, then save.
7. GitHub will provide the public Pages address after deployment.

## Privacy and storage

Diary information is stored in your browser's `localStorage`. The GitHub Pages site contains the application code, not your diary records.

Browser storage can be erased if browser/site data is cleared. Use **Backup Data** periodically. The backup is a JSON file containing the full diary and can be restored with **Restore Data**.

Because storage is local to a browser profile, diary data does not automatically synchronize between computers or browsers.

## Excel export and internet access

The app loads **ExcelJS 4.4.0** from the jsDelivr CDN. ExcelJS is used to create `.xlsx` files in the browser. Therefore, Excel export requires the library to have loaded from the internet.

The workbook contains:
- **Daily Activity Log**
- **Category Summary**
- total time and category percentages
- a pie-chart image generated from the daily category chart

Note: ExcelJS can write Excel workbooks but does not create native editable Excel chart objects. The chart is embedded in the workbook as an image. The category summary data remains editable in Excel and can be used to create a native Excel chart manually if desired.

## Data model

Each activity stores individual timed segments rather than one lifetime duration. This is what allows a task to be paused on one day, resumed on another, and still report only the time worked on each individual date.

If a running segment crosses midnight, reporting clips the segment at the day boundary so each day's total receives only its own elapsed time.

## Important correction behavior

The **Correct** button on a completed activity edits its most recent completed time segment on the selected day. It allows changing the description, category, date, start/end times, and optionally overriding the calculated duration.

## Local testing

You can double-click `index.html` to try the app. For behavior closest to GitHub Pages, run it through a simple local web server or publish it to Pages.

## Version

Initial GitHub Pages-ready build — August 2026.
