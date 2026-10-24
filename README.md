# CodeAlpha_LanguageTranslationTool

A language translation web app built for the **CodeAlpha Artificial Intelligence Internship (Task 1)**.

The browser page sends your text to a small **Python (Flask) server**, which calls a translation API and sends the translated text back to be shown on screen.

## Features
- Enter text, choose source and target languages (**109 languages**)
- **Automatic language detection** for the source language
- Translation through **Google Translate**, with the **MyMemory** API as an automatic backup
- Optional support for the official **Google Cloud Translation API** (see below)
- Translated text shown clearly next to the input, with RTL support (Arabic, Urdu, Hebrew...)
- **Copy** button, **text-to-speech** (Listen) and **voice input** (Speak)
- Translate as you type, language swap, character counter, Ctrl+Enter shortcut
- Download the translation as a `.txt` file
- Recent translations and a starred list, saved in the browser
- Dark theme with a responsive layout for phone and desktop

## How it works
1. `index.html`, `style.css` and `script.js` make the page
2. `script.js` sends the text and the chosen languages to `/api/translate`
3. `app.py` (Flask) checks the request and calls `translator.py`
4. `translator.py` tries the translation engines in order and returns the first successful result
5. The page shows the translated text, the detected language and which engine was used

## Project files
| File | Purpose |
|------|---------|
| `app.py` | Flask server and API routes |
| `translator.py` | Translation engines and the language list |
| `index.html`, `style.css`, `script.js` | User interface |
| `requirements.txt` | Python libraries (only Flask) |

## How to run
1. Install Python 3.9 or newer
2. Install Flask:
   ```
   pip install -r requirements.txt
   ```
3. Start the server:
   ```
   python app.py
   ```
4. Open http://127.0.0.1:5000 in your browser (Chrome or Edge recommended for voice input)

An internet connection is needed for translation.

## Using the official Google Cloud Translation API (optional)
If you have a Google Cloud API key, set it before starting the server and it will be used first:
```
set GOOGLE_TRANSLATE_API_KEY=your_key_here        (Windows Command Prompt)
$env:GOOGLE_TRANSLATE_API_KEY="your_key_here"     (Windows PowerShell)
export GOOGLE_TRANSLATE_API_KEY=your_key_here     (Mac / Linux)
python app.py
```
Never put your key inside the code or upload it to GitHub.

## Notes
- The input is limited to 1000 characters per translation
- Voice input and text-to-speech depend on the voices installed in your browser and computer

## Author
Rishita Kapoor - CodeAlpha AI Intern
