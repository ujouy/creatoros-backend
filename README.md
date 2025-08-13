# CreatorOS Navigator Backend

A comprehensive backend API for CreatorOS Navigator - an AI-powered business strategist for content creators.

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **OAuth Integrations**: Google/YouTube and X (Twitter) OAuth 2.0 flows
- **AI Analysis**: Gemini AI-powered business strategy generation
- **Platform Data**: Fetch and analyze data from connected platforms
- **Secure Architecture**: Protected routes with middleware authentication

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **OAuth**: Google OAuth 2.0 + X OAuth 2.0 with PKCE
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Google Cloud Console project with OAuth credentials
- X Developer account with OAuth 2.0 app
- Google Gemini API key

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:

- Set up MongoDB Atlas connection string
- Add Google OAuth credentials
- Add X OAuth credentials  
- Add Gemini API key
- Set a secure JWT secret

4. Start development server:

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Platform Integrations
- `GET /api/integrations/google` - Initiate Google OAuth
- `POST /api/integrations/google/callback` - Google OAuth callback
- `GET /api/integrations/x` - Initiate X OAuth
- `POST /api/integrations/x/callback` - X OAuth callback

### Analysis
- `GET /api/analysis/generate-roadmap` - Generate AI-powered business analysis

### User Management
- `GET /api/user/status` - Get platform connection status
- `GET /api/user/profile` - Get user profile
- `POST /api/user/disconnect/:platform` - Disconnect platform

## Security Features

- Password hashing with bcryptjs (12 salt rounds)
- JWT token authentication with 7-day expiration
- OAuth state validation to prevent CSRF attacks
- PKCE implementation for X OAuth 2.0
- Environment variable configuration for all secrets
- Input validation and error handling
- CORS configuration for frontend integration

## Deployment

This application is ready for deployment on Render:

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Web Service
4. Update OAuth redirect URIs to use production URLs

## Environment Variables

All sensitive configuration is handled through environment variables:

- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `X_CLIENT_ID` & `X_CLIENT_SECRET` - X OAuth credentials
- `GEMINI_API_KEY` - Google Gemini AI API key
- `FRONTEND_URL` - Frontend application URL for CORS

## Contributing

1. Follow the existing code structure and conventions
2. Add proper error handling and validation
3. Include JSDoc comments for new functions
4. Test OAuth flows thoroughly
5. Ensure all secrets use environment variables

## License

MIT License - see LICENSE file for details