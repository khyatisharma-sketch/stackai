# 🌤️ Weather Intelligence Dashboard

A highly polished, full-stack meteorological reasoning application built with React, Vite, Express, and Tailwind CSS. The app provides tailored weather insights, operational checklists, impact analysis, and active planners customized for specific user profiles (Athletes, Parents, Travelers, Gardeners, and Energy Managers).

---

## 🚀 Core Features

- **Tailored Persona Insights**: Adaptive meteorological analysis customized for different lifestyles (e.g., thermal limits for Athletes, dermal protections for Parents, transit friction for Travelers).
- **Dual-Engine Architecture**:
  - **Generative AI Engine**: Uses the Gemini API for advanced meteorological reasoning and voice briefs.
  - **Rule-Based Meteorological Engine**: An advanced, deterministic local fallback engine that ensures 100% application uptime and high-fidelity reports even without active API configurations.
- **Dynamic Speech Synthesis**:
  - Voice briefs powered by cloud-synthesized text-to-speech.
  - Automatic, low-latency fallback to the browser's native HTML5 Web Speech API.
- **Rich Visualizations**: Interactive air quality indices, ultraviolet radiation gauges, live dynamic clocks, and hourly activity suitabilities.

---

## 🔑 Configuration & Secrets

The application operates in a secure full-stack environment. Sensitive keys are processed entirely server-side (`server.ts`) and never exposed to the client browser.

### Configuring the Gemini API Key

To activate full generative AI summaries, advanced checklist reasoning, and cloud voice narration:

1. Obtain your API Key from the **[Google AI Studio Console](https://aistudio.google.com/)**.
2. Open the **Settings** menu at the top-right of your AI Studio workspace.
3. Click on **Secrets**.
4. Create a new secret named `GEMINI_API_KEY` and paste your key.
5. The application will automatically detect the key, hot-reload, and switch from the local Rule-Based engine to full AI reasoning.

---

## 🐙 GitHub Integration & Deployment

The application runs in a sandboxed, state-of-the-art Cloud Run environment managed by Google AI Studio. 

### Connecting Your Repository

Because the execution container is securely isolated, Git configurations and remote repositories are managed directly through the Google AI Studio platform interface rather than inside the running command-line environment:

1. **Direct GitHub Sync**: Use the **Share** or **Export** workflows in the top-right header menu of the Google AI Studio UI.
2. **Authorize Connection**: Connect your GitHub account and choose to either create a new repository or sync changes to an existing one.
3. **Continuous Deployment**: When you push code or complete an iteration, the platform automatically packages the workspace, updates the repository, and rebuilds the production application for deployment.
4. **Manual Export**: You can also download a self-contained `.zip` file of the complete project structure (including the pre-configured `package.json`, Tailwind config, and production Dockerfile configuration) at any time.

---

## 🛠️ Build & Development Commands

### Development Mode
Runs the backend Express server with integrated Vite middleware on port `3000`:
```bash
npm run dev
```

### Production Build
Compiles client-side assets to `/dist` and bundles the Express server to a standalone CJS file:
```bash
npm run build
```

### Production Start
Starts the production-optimized server:
```bash
npm start
```
