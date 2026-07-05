"""
Daily Brief AI - Flask Backend
A clean, production-ready backend that uses the Google Gemini API to generate
personalized daily planning briefs.
"""

import os
import re
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Load environment variables from .env file (for local development)
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Flask application setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for API endpoints

# ---------------------------------------------------------------------------
# Configure Google Gemini API
# ---------------------------------------------------------------------------
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError(
        "GOOGLE_API_KEY environment variable is not set. "
        "Please copy .env.example to .env and add your Gemini API key."
    )

genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MODEL_NAME = "gemini-2.5-flash"  # Fast, capable model for daily planning
MAX_INPUT_LENGTH = 4000
REQUIRED_FIELDS = ["goals", "todos", "meetings", "notes", "deadlines", "worries"]

# ---------------------------------------------------------------------------
# Prompt engineering - the system prompt that shapes Gemini's output
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are "Daily Brief AI," an expert productivity coach and
executive assistant. Your job is to analyze the user's day and create a
structured, actionable daily brief.

Use the information the user provides below to generate a response in Markdown.
Be concise but thorough. Use bullet points, numbered lists, and headers.
Do not include raw HTML.

Return EXACTLY the following sections (use the heading levels shown):

## 1. Executive Summary
A 3-5 sentence overview of the user's day, highlighting the most important
objectives and constraints.

## 2. Priority Tasks
Rank the user's to-do items by impact and urgency. Label each as:
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Low
Provide a one-line rationale for each ranking.

## 3. Suggested Schedule
Build a chronological schedule that includes meetings, focus work, and breaks.
Use a 24-hour time format (e.g., 09:00 - 10:30).

## 4. Time Blocks
Recommend 2-4 deep-focus time blocks with a label, duration, and the task(s)
to work on.

## 5. Productivity Tips
Share 3-4 practical tips tailored to the user's specific tasks and deadlines.

## 6. Risk Analysis
Identify potential risks (missed deadlines, meeting conflicts, overloaded
schedule, worries) and suggest mitigations.

## 7. Motivation Message
Write a short, genuine, and energizing motivation paragraph.

## 8. Estimated Completion Time
Estimate the total focused work hours needed and when the user is likely to
finish if they start now.

## 9. Suggested Breaks
Suggest 2-3 breaks with timing, duration, and activity ideas.

## 10. End-of-Day Reflection Questions
Provide 3-5 reflection questions the user can answer at the end of the day.

Today's date: {today_date}.
"""


def sanitize_input(text: str) -> str:
    """
    Strip excessive whitespace and limit input length.
    """
    if not isinstance(text, str):
        return ""
    text = text.strip()
    if len(text) > MAX_INPUT_LENGTH:
        text = text[:MAX_INPUT_LENGTH]
    return text


def validate_request(data: dict) -> list[str]:
    """
    Validate the incoming JSON payload.
    Returns a list of error messages (empty if valid).
    """
    errors = []

    if not isinstance(data, dict):
        errors.append("Request body must be a JSON object.")
        return errors

    for field in REQUIRED_FIELDS:
        value = data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            errors.append(f"'{field}' is required.")

    return errors


def build_user_prompt(data: dict) -> str:
    """
    Build the user-facing portion of the prompt from form data.
    """
    return f"""
### Today's Goals
{sanitize_input(data.get('goals', ''))}

### To-Do List
{sanitize_input(data.get('todos', ''))}

### Meetings
{sanitize_input(data.get('meetings', ''))}

### Notes
{sanitize_input(data.get('notes', ''))}

### Deadlines
{sanitize_input(data.get('deadlines', ''))}

### Things Worrying Me
{sanitize_input(data.get('worries', ''))}
"""


@app.route("/", methods=["GET"])
def index():
    """
    Serve the main dashboard page.
    """
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate_brief():
    """
    Receive daily planning input, validate it, call Gemini, and return Markdown.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON body."}), 400

    # Validate user input
    validation_errors = validate_request(data)
    if validation_errors:
        return jsonify({"errors": validation_errors}), 400

    # Build the complete prompt
    today_date = datetime.now().strftime("%A, %B %d, %Y")
    system_prompt = SYSTEM_PROMPT.format(today_date=today_date)
    user_prompt = build_user_prompt(data)

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=system_prompt + "\n\n" + user_prompt)
            ],
        )
    ]

    try:
        response = genai_client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=2048,
                top_p=0.95,
                top_k=40,
            ),
        )

        markdown_text = response.text.strip() if response.text else ""

        # Basic safety fallback
        if not markdown_text:
            return jsonify({"error": "AI returned an empty response."}), 502

        return jsonify({"brief": markdown_text})

    except Exception as exc:
        app.logger.exception("Gemini API request failed")
        return jsonify({"error": f"Failed to generate brief: {str(exc)}"}), 502


@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Simple health check endpoint for monitoring and deployment.
    """
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "model": MODEL_NAME,
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") == "development")
