# PixelForge AI - Neural Image Synthesis Platform

A modern, high-performance AI Image Generator crafted with pure **HTML5**, **CSS3**, and **Vanilla JavaScript** on the frontend, powered by a **Node.js Express** backend with **Gemini AI** and **Flux Neural Diffusion**.

---

## 🚀 Project Architecture (Pure HTML5, CSS & JS + Node.js)

```
├── index.html        # Pure HTML5 semantic interface
├── style.css         # Modern dark theme styles & animations
├── app.js            # Vanilla JavaScript engine (dual-mode: API + Static Fallback)
├── server.js         # Node.js Express backend server (Standard JS)
├── server.ts         # TypeScript Express backend
├── package.json      # Dependencies and execution scripts
└── README.md         # Deployment & GitHub Pages instructions
```

---

## 💻 How to Run Locally with Node.js Backend

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables (Optional):**
   Create a `.env` file with your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ADMIN_KEY=admin123
   ```

3. **Start the Node.js Server:**
   ```bash
   node server.js
   ```
   Or via npm:
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   Visit `http://localhost:3000` in your web browser.

---

## 🌐 How to Host on GitHub Pages (Static Hosting)

GitHub Pages hosts static files (`index.html`, `style.css`, `app.js`) directly:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - PixelForge AI pure HTML5/CSS/JS"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub.
   - Click **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select **Branch**: `main` and folder `/ (root)`.
   - Click **Save**.

3. **Automatic Client-Side Fallback:**
   - `app.js` is equipped with an **intelligent dual-mode engine**:
     - When running with Node.js backend: Uses high-performance `/api/*` endpoints.
     - When running standalone on GitHub Pages: Automatically falls back to high-resolution client-side neural synthesis (Flux AI model) and rule-based prompt expansion without any errors!

---

## 🛡️ Admin Panel & Credentials

- **Default Passcode**: `admin123`
- Inspect server health, uptime, latency, and model metrics.
