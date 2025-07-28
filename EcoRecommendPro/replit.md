# Eco-Friendly Product Recommendation System

## Overview

This is a full-stack TypeScript application that provides personalized eco-friendly product recommendations using AI-powered scoring systems. The system features a React frontend with shadcn/ui components, an Express.js backend with session-based authentication, and a PostgreSQL database managed through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom eco-friendly color palette
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Express sessions with bcrypt for password hashing
- **File Processing**: CSV parsing for product dataset uploads
- **AI Integration**: Python scripts for eco-scoring using Mistral-7B and LLaMA-2 models

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with migrations support
- **Schema**: Relational design with users, products, cart items, wishlist items, and activity tracking

## Key Components

### Authentication System
- Session-based authentication using express-session
- User registration with demographic information (age, gender) for personalization
- Password hashing with bcryptjs
- Protected routes and middleware for authorization

### Product Management
- Product catalog with eco-scoring metrics
- CSV/JSON dataset upload functionality for admins
- Search and filtering capabilities by category, price range, and eco-score
- Product view tracking for recommendation improvement

### Recommendation Engine
- **Cold Start Strategy**: Demographic-based recommendations for new users
- **Personalized Recommendations**: Activity-based suggestions using cart, wishlist, and viewing history
- **Hybrid Eco-Scoring**: Two-stage AI scoring system (Mistral-7B for initial scoring, LLaMA-2 for refinement)

### User Features
- Shopping cart management with quantity controls
- Wishlist functionality for saving favorite products
- User profile management
- Product search with real-time suggestions

## Data Flow

1. **Admin Upload**: Admins upload product datasets (CSV/JSON format)
2. **AI Processing**: Python scripts process products through hybrid eco-scoring pipeline
3. **Database Storage**: Scored products stored in PostgreSQL with full metadata
4. **User Interaction**: Users browse, search, and interact with products
5. **Activity Tracking**: System tracks user behavior for personalization
6. **Recommendations**: Engine generates personalized suggestions based on user profile and activity

## External Dependencies

### Frontend Dependencies
- React ecosystem: react, react-dom, react-hook-form
- UI Components: @radix-ui/* components, lucide-react icons
- Styling: tailwindcss, class-variance-authority, clsx
- Data Fetching: @tanstack/react-query
- Form Validation: zod, @hookform/resolvers

### Backend Dependencies
- Express.js with TypeScript support
- Database: @neondatabase/serverless, drizzle-orm
- Authentication: express-session, bcryptjs
- File Processing: csv-parser for dataset uploads
- Build Tools: esbuild, tsx for TypeScript execution

### AI/ML Dependencies
- Python environment for running Mistral-7B and LLaMA-2 models
- CSV processing libraries for dataset handling

## Deployment Strategy

### Development
- Vite dev server for frontend hot reloading
- tsx for TypeScript execution in development
- Replit-specific plugins for development environment integration

### Production Build
- Vite builds frontend to static assets
- esbuild bundles backend TypeScript to JavaScript
- Single deployment artifact with both frontend and backend

### Database Management
- Drizzle Kit for schema migrations
- Environment-based configuration for different deployment stages
- PostgreSQL hosting on Neon for serverless scaling

### Environment Configuration
- Session secrets for authentication security
- Database connection strings for different environments
- Support for both development and production modes

The system is designed to be scalable and maintainable, with clear separation of concerns between frontend presentation, backend business logic, and data persistence layers. The AI-powered eco-scoring system provides the core value proposition while the recommendation engine ensures personalized user experiences.