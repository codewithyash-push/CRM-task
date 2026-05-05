# Deployment Guide

## GitHub

This project is a standalone Node/Express app. Push this folder as the repository root.

```bash
git init
git branch -M main
git remote add origin https://github.com/codewithyash-push/CRM-task.git
git add .
git commit -m "Build app compiler platform"
git push -u origin main
```

## Render Deployment

1. Open [Render](https://render.com).
2. Create a new **Web Service** or choose **Blueprint** if Render detects `render.yaml`.
3. Connect the GitHub repository `codewithyash-push/CRM-task`.
4. If creating manually, use these settings:
   - Environment: `Node`
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: free is fine for demo
5. Deploy.

Render automatically provides `PORT`; the server already reads `process.env.PORT`.

## Railway Deployment

1. Open [Railway](https://railway.app).
2. Create a new project from GitHub.
3. Select `codewithyash-push/CRM-task`.
4. Railway will detect Node from `package.json`.
5. Set start command to:

```bash
npm start
```

## Local Run

```bash
npm install
npm start
```

Open `http://localhost:4100`.

## Required Demo Commands

Run the evaluation metrics:

```bash
npm run eval
```

Health check:

```bash
curl http://localhost:4100/api/health
```
