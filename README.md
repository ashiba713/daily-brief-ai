# Daily Brief AI

Daily Brief AI is a clean, modern, AI-powered daily planning assistant built with **Python/Flask** and the **Google Gemini API**. Enter your goals, tasks, meetings, deadlines, notes, and worries, and the AI generates a structured daily brief with priorities, schedule, productivity tips, motivation, reflection questions, and more.

---

## ✨ Features

- **AI-generated daily brief** with 10 structured sections:
  1. Executive Summary
  2. Priority Tasks
  3. Suggested Schedule
  4. Time Blocks
  5. Productivity Tips
  6. Risk Analysis
  7. Motivation Message
  8. Estimated Completion Time
  9. Suggested Breaks
  10. End-of-Day Reflection Questions
- Beautiful **glassmorphism UI** with soft gradients
- **Dark/Light theme** toggle
- **Responsive** and mobile-friendly layout
- **Character counters** on every textarea
- **Local history** of generated briefs
- **Copy** and **download** response as Markdown
- **Clear form**, **auto-resize textareas**, and **keyboard shortcuts**
- **Toast notifications** for feedback
- Production-ready **error handling** and input validation

---

## 🚀 Live Demo

> Add your deployed URL here after publishing to Render/Vercel.

---

## 📁 Folder Structure

```
DailyBriefAI/
├── app.py                 # Flask backend + Gemini integration
├── requirements.txt       # Python dependencies
├── .env.example           # Example environment variables
├── README.md              # Project documentation
├── templates/
│   └── index.html         # Main dashboard page
├── static/
│   ├── style.css          # Modern responsive styles
│   └── script.js          # Frontend logic and interactions
└── assets/
    └── .gitkeep           # Placeholder for screenshots/images
```

---

## 🛠️ Installation

### 1. Clone or download the project

```bash
cd DailyBriefAI
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up your Gemini API key

Copy the example environment file and add your key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## ▶️ Running Locally

```bash
python app.py
```

Open your browser and navigate to:

```
http://localhost:5000
```

The Flask server runs on `0.0.0.0` so it is also accessible from other devices on your network.

---

## 🧪 API Endpoints

| Method | Endpoint      | Description                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/`           | Serve the main dashboard                     |
| POST   | `/api/generate` | Generate a daily brief from user input       |
| GET    | `/api/health` | Health check for monitoring                  |

### Example `POST /api/generate` payload

```json
{
  "goals": "Ship landing page",
  "todos": "- Draft copy\n- Review design",
  "meetings": "10:00 Standup",
  "notes": "Focus on mobile layout",
  "deadlines": "Client demo Friday",
  "worries": "Tight timeline"
}
```

---

## 🌐 Deployment

### Deploy to Render

1. Push the `DailyBriefAI/` folder to a Git repository.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the build command: `pip install -r requirements.txt`
4. Set the start command: `gunicorn app:app`
5. Add the `GOOGLE_API_KEY` environment variable.
6. Deploy.

### Deploy to Vercel (serverless)

This project is built for a traditional Python server. To deploy on Vercel, wrap the Flask app with `vercel-python` or migrate to a Vercel-compatible serverless function. For the easiest path, use **Render**.

---

## 📸 Screenshots

> Place screenshots in the `assets/` folder and update the paths below.

| Dashboard (Dark) | Dashboard (Light) |
|------------------|-------------------|
| `assets/dark.png` | `assets/light.png` |

---

## ⌨️ Keyboard Shortcuts

| Key | Action                      |
|-----|-----------------------------|
| `G` | Generate daily brief        |
| `C` | Clear form                  |
| `T` | Toggle dark/light theme     |
| `H` | Open brief history          |
| `Esc` | Close history modal       |

---

## 🔮 Future Improvements

- User authentication and cloud-synced history
- Calendar integration (Google Calendar, Outlook)
- Recurring daily briefs via email
- Voice input support
- Export to PDF and Notion
- Custom prompt templates
- Team/enterprise collaboration features

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

Built with ❤️ using Flask, Google Gemini, and modern frontend technologies.
