"""
Web server for the Language Translation Tool.
Run:  python app.py     then open  http://127.0.0.1:5000
"""
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory

from translator import LANGUAGES, TranslationError, translate

BASE = Path(__file__).parent
PUBLIC_FILES = {"style.css", "script.js"}
MAX_CHARS = 1000

app = Flask(__name__)


@app.route("/")
def home():
    return send_from_directory(BASE, "index.html")


@app.route("/<name>")
def public_file(name):
    if name not in PUBLIC_FILES:
        abort(404)
    return send_from_directory(BASE, name)


@app.route("/api/languages")
def api_languages():
    items = [{"code": code, "name": name} for code, name in LANGUAGES.items()]
    items.sort(key=lambda item: item["name"])
    return jsonify(items)


@app.route("/api/translate", methods=["POST"])
def api_translate():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    source = str(data.get("source", "auto"))
    target = str(data.get("target", ""))

    if not text:
        return jsonify(error="Please enter some text."), 400
    if len(text) > MAX_CHARS:
        return jsonify(error=f"Text is too long. The limit is {MAX_CHARS} characters."), 400
    if target not in LANGUAGES:
        return jsonify(error="Please choose a target language."), 400
    if source != "auto" and source not in LANGUAGES:
        return jsonify(error="Unknown source language."), 400
    if source == target:
        return jsonify(error="Please choose two different languages."), 400

    try:
        result = translate(text, source, target)
    except TranslationError as exc:
        print("Translation failed:", exc)
        return jsonify(error="Could not reach a translation service. Check your internet connection and try again."), 502

    detected = result.get("detected")
    return jsonify(
        translation=result["translation"],
        detected=detected,
        detected_name=LANGUAGES.get(detected),
        engine=result["engine"],
    )


if __name__ == "__main__":
    app.run(debug=True)
