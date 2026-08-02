# 🛡️ GitVulnScan AI

> **AI-Powered GitHub Repository Vulnerability Scanner**

GitVulnScan AI is a full-stack AI-powered security platform that analyzes public GitHub repositories for known vulnerabilities, insecure dependencies, and Common Vulnerabilities and Exposures (CVEs). It combines dependency analysis with AI-generated explanations and remediation guidance to help developers secure their applications faster.

---

## ✨ Key Features

- 🔍 **GitHub Repository Scanner** – Analyze any public GitHub repository by simply providing its URL.
- 🛡️ **CVE & Dependency Detection** – Identifies vulnerable packages and known security issues.
- 🤖 **AI-Powered Security Analysis** – Uses Google Gemini to explain vulnerabilities in simple language.
- 💡 **AI Fix Suggestions** – Provides remediation recommendations and secure coding guidance.
- 📊 **Modern Security Dashboard** – Displays scan results, severity levels, and vulnerability summaries.
- ⚡ **FastAPI Backend** – High-performance REST API for repository analysis.
- 🌐 **Next.js Frontend** – Responsive user interface with real-time scan progress.
- 📁 **OWASP-Inspired Security Checks** – Follows secure software development practices.
- 🔐 **Environment-Based API Key Management** – Sensitive credentials are stored securely using environment variables.

---

## 🛠️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- Python 3.11
- Uvicorn

### AI
- Google Gemini API

### Security
- Dependency Analysis
- CVE Database
- OWASP Security Principles

---

## 🚀 Quick Start

### Clone Repository

```bash
git clone https://github.com/soniya-a/gitvulnscan-ai.git
cd gitvulnscan-ai
```

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

### Frontend

```bash
cd ..
npm install
npm run dev
```

Open:

```
http://localhost:4028
```

---

## 📸 Screenshots

### Home

![Home](docs/screenshots/home.png)

### Scan Results

![Results](docs/screenshots/results.png)

---

## 📄 License

This project is licensed under the MIT License.