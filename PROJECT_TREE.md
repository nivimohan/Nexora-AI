NEXORA_AI/
├── frontend/                          # React + Vite + Tailwind app
│   ├── public/
│   │   └── nexora-icon.svg
│   ├── src/
│   │   ├── assets/                    # Static images, fonts
│   │   ├── components/                # Shared UI components
│   │   │   ├── ui/                    # Atoms: Button, Badge, Card, Modal…
│   │   │   ├── layout/                # AppShell, Sidebar, TopBar
│   │   │   └── charts/                # Recharts / custom SVG data viz
│   │   ├── features/                  # Feature-sliced modules
│   │   │   ├── onboarding/            # Role selection wizard
│   │   │   ├── dashboard/             # Main command center
│   │   │   ├── roadmap/               # Role-mapped learning roadmap
│   │   │   ├── quiz/                  # Adaptive MCQ engine
│   │   │   ├── challenges/            # Coding + aptitude challenges
│   │   │   ├── mock-interview/        # AI-simulated interview flow
│   │   │   └── analytics/             # Score trends, skill radar
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # axios instance, utility fns
│   │   ├── store/                     # Zustand / context state
│   │   ├── App.jsx                    # Root router
│   │   ├── main.jsx                   # ReactDOM entry
│   │   └── index.css                  # Global Tailwind + cosmic CSS
│   ├── index.html                     # SEO shell
│   ├── tailwind.config.js             # Cosmic palette + animations
│   ├── postcss.config.js
│   ├── vite.config.js                 # @/ alias + /api proxy
│   └── package.json
│
├── backend/                           # Express + Mongoose API
│   ├── config/
│   │   └── db.js                      # MongoDB connection (Mongoose)
│   ├── controllers/                   # Route handler logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── roleController.js
│   │   ├── quizController.js
│   │   └── analyticsController.js
│   ├── models/                        # Mongoose schemas
│   │   ├── User.js                    # Master user document
│   │   ├── Role.js                    # Job role + skill map
│   │   ├── Question.js                # Quiz question bank
│   │   └── Attempt.js                 # Test attempt records
│   ├── routes/                        # Express routers
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── roleRoutes.js
│   │   ├── quizRoutes.js
│   │   └── analyticsRoutes.js
│   ├── middleware/                    # Auth, error, validation
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── utils/                         # JWT helpers, validators
│   ├── server.js                      # Express app + middleware mount
│   ├── .env.example                   # Env template (copy → .env)
│   └── package.json
│
├── .gitignore
└── README.md
