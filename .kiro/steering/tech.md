# Technology Stack & Build System

## Framework & Runtime

- **Next.js 14**: React framework with App Router for full-stack development
- **React 18**: Component library with hooks and modern patterns
- **Node.js**: Server-side runtime for API routes and AI integration

## Key Dependencies

### UI & Styling
- **Tailwind CSS 4.x**: Utility-first CSS framework for styling
- **Radix UI**: Headless component primitives for accessible UI
- **Shadcn/ui**: Pre-built component system built on Radix
- **class-variance-authority**: Type-safe component variants
- **tailwind-merge**: Intelligent Tailwind class merging

### State Management
- **Zustand**: Lightweight state management for chat and UI state
- **React Hooks**: Built-in state management for component-level state

### AI & Security
- **Mistral API**: LLM integration for intelligent responses
- **VM2**: Secure JavaScript sandbox for executing AI-generated code
- **CoffeeScript**: Additional scripting language support

### Development
- **TypeScript**: Type safety and better developer experience
- **ESLint**: Code linting with Next.js configuration
- **PostCSS**: CSS processing and optimization

## Common Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint code analysis

# Package Management
npm install          # Install all dependencies
npm ci              # Clean install from package-lock.json
```

## Environment Setup

Required environment variables:
- `MISTRAL_API_KEY`: API key for Mistral LLM integration

## Build Configuration

- **Webpack**: Custom configuration for VM2 and Node.js modules
- **PostCSS**: Tailwind CSS processing with autoprefixer
- **TypeScript**: Configured for Next.js with strict type checking