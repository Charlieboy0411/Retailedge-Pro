# Retailedge Pro

## Overview

Retailedge‑Pro is a full‑stack learning‑management system built with a **Node.js/Express** backend and a **React (Vite)** frontend. It provides features such as:
- Program manager dashboards
- Offline quizzes for learners (mobile‑friendly)
- Project, training and report management
- Role‑based access control

The UI follows a modern, responsive design with dark‑mode capable components and custom icons.

## Prerequisites

- **Node.js** (v18 or later)
- **npm** (v9 or later)
- **Git**
- A running **MongoDB** instance (local or remote) – see `backend/config/database.js` for connection details.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Charlieboy0411/Retailedge-Pro.git
cd Retailedge-Pro

# Install dependencies for both backend and frontend
npm install            # installs root scripts (if any)
# Backend dependencies
cd backend && npm install && cd ..
# Frontend dependencies
cd frontend && npm install && cd ..

# Set up environment variables (optional)
# Create a .env file in the backend folder if you need custom DB credentials.
# Example:
# MONGODB_URI=mongodb://localhost:27017/retailedge

# Run the development servers
# Backend
npm run dev:backend   # defined in backend/package.json (starts node server.js)
# Frontend (in a separate terminal)
npm run dev:frontend  # starts Vite dev server (http://localhost:5173)
```

The frontend will be available at `http://localhost:5173`. The backend API runs on port `5000` by default (configured in `backend/server.js`).

## Building for Production

```bash
# Frontend build
cd frontend && npm run build && cd ..
# Backend can be run with Node directly
node backend/server.js
```

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes and push the branch.
4. Open a pull request.

Please follow the existing code style and run lint checks before submitting PRs.

## License

This project is licensed under the MIT License – see the `LICENSE` file for details.
