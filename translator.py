"""
Translation engines for the Language Translation Tool (CodeAlpha AI Internship, Task 1).

The server tries these engines in order and uses the first one that works:
  1. Google Cloud Translation API   (only if the GOOGLE_TRANSLATE_API_KEY environment variable is set)
  2. Google Translate               (free web endpoint, no key needed)
  3. MyMemory                       (free backup service)
Only the Python standard library is used, so nothing extra needs to be installed.
"""
import html
import json
import os
import urllib.parse
import urllib.request

# language code -> language name
LANGUAGES = {
    "af": "Afrikaans", "sq": "Albanian", "am": "Amharic", "ar": "Arabic", "hy": "Armenian",
    "az": "Azerbaijani", "eu": "Basque", "be": "Belarusian", "bn": "Bengali", "bs": "Bosnian",
    "bg": "Bulgarian", "ca": "Catalan", "ceb": "Cebuano", "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)", "co": "Corsican", "hr": "Croatian", "cs": "Czech",
    "da": "Danish", "nl": "Dutch", "en": "English", "eo": "Esperanto", "et": "Estonian",
    "fi": "Finnish", "fr": "French", "fy": "Frisian", "gl": "Galician", "ka": "Georgian",
    "de": "German", "el": "Greek", "gu": "Gujarati", "ht": "Haitian Creole", "ha": "Hausa",
    "haw": "Hawaiian", "he": "Hebrew", "hi": "Hindi", "hmn": "Hmong", "hu": "Hungarian",
    "is": "Icelandic", "ig": "Igbo", "id": "Indonesian", "ga": "Irish", "it": "Italian",
    "ja": "Japanese", "jv": "Javanese", "kn": "Kannada", "kk": "Kazakh", "km": "Khmer",
    "rw": "Kinyarwanda", "ko": "Korean", "ku": "Kurdish", "ky": "Kyrgyz", "lo": "Lao",
    "la": "Latin", "lv": "Latvian", "lt": "Lithuanian", "lb": "Luxembourgish", "mk": "Macedonian",
    "mg": "Malagasy", "ms": "Malay", "ml": "Malayalam", "mt": "Maltese", "mi": "Maori",
    "mr": "Marathi", "mn": "Mongolian", "my": "Myanmar (Burmese)", "ne": "Nepali", "no": "Norwegian",
    "ny": "Nyanja (Chichewa)", "or": "Odia (Oriya)", "ps": "Pashto", "fa": "Persian", "pl": "Polish",
    "pt": "Portuguese", "pa": "Punjabi", "ro": "Romanian", "ru": "Russian", "sm": "Samoan",
    "gd": "Scots Gaelic", "sr": "Serbian", "st": "Sesotho", "sn": "Shona", "sd": "Sindhi",
    "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian", "so": "Somali", "es": "Spanish",
    "su": "Sundanese", "sw": "Swahili", "sv": "Swedish", "tl": "Filipino (Tagalog)", "tg": "Tajik",
    "ta": "Tamil", "tt": "Tatar", "te": "Telugu", "th": "Thai", "tr": "Turkish",
    "tk": "Turkmen", "uk": "Ukrainian", "ur": "Urdu", "ug": "Uyghur", "uz": "Uzbek",
    "vi": "Vietnamese", "cy": "Welsh", "xh": "Xhosa", "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu",
}

# Google sometimes reports older codes
CODE_ALIASES = {"iw": "he", "jw": "jv", "fil": "tl", "zh": "zh-CN"}

USER_AGENT = "Mozilla/5.0 (compatible; CodeAlphaTranslator/1.0)"
TIMEOUT = 10


class TranslationError(Exception):
    pass


def normalize_code(code):
    return CODE_ALIASES.get(code, code) if code else None


def _request_json(url, data=None, headers=None):
    request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


# ---------- engine 1: official Google Cloud Translation API ----------

def _google_cloud(text, source, target):
    key = os.environ["GOOGLE_TRANSLATE_API_KEY"]
    body = {"q": text, "target": target, "format": "text"}
    if source != "auto":
        body["source"] = source
    url = "https://translation.googleapis.com/language/translate/v2?key=" + urllib.parse.quote(key)
    data = _request_json(url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"})
    item = data["data"]["translations"][0]
    return {"translation": item["translatedText"], "detected": item.get("detectedSourceLanguage")}


# ---------- engine 2: free Google Translate endpoint ----------

def parse_google_free(data):
    """Response looks like [[["translated text", "original text", ...], ...], null, "detected-lang", ...]"""
    segments = data[0] or []
    text = "".join(seg[0] for seg in segments if seg and seg[0])
    if not text:
        raise ValueError("empty response")
    detected = data[2] if len(data) > 2 and isinstance(data[2], str) else None
    return {"translation": text, "detected": detected}


def _google_free(text, source, target):
    params = urllib.parse.urlencode({"client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text})
    data = _request_json("https://translate.googleapis.com/translate_a/single?" + params)
    return parse_google_free(data)


# ---------- engine 3: MyMemory backup ----------

def _mymemory(text, source, target):
    pair = ("Autodetect" if source == "auto" else source) + "|" + target
    url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode({"q": text[:500], "langpair": pair})
    data = _request_json(url)
    if int(data.get("responseStatus", 0)) != 200:
        raise ValueError(data.get("responseDetails") or "request failed")
    translated = html.unescape(data["responseData"]["translatedText"])
    if "MYMEMORY WARNING" in translated.upper():
        raise ValueError("daily free limit reached")
    return {"translation": translated, "detected": None}


def translate(text, source, target):
    """Translate text. source can be 'auto'. Returns {translation, detected, engine}."""
    engines = []
    if os.environ.get("GOOGLE_TRANSLATE_API_KEY"):
        engines.append(("Google Cloud Translation API", _google_cloud))
    engines += [("Google Translate", _google_free), ("MyMemory", _mymemory)]

    problems = []
    for name, engine in engines:
        try:
            result = engine(text, source, target)
            result["detected"] = normalize_code(result.get("detected"))
            result["engine"] = name
            return result
        except Exception as exc:  # try the next engine
            problems.append(f"{name}: {exc}")
    raise TranslationError(" | ".join(problems))
