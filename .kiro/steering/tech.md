# Technology Stack

## Framework & Runtime
- **Next.js 14**: App router with API routes and server-side processing
- **React 18**: Component-based UI with hooks for state management
- **Node.js**: Server-side JavaScript runtime

## Core Dependencies
- **VM2**: Secure JavaScript sandbox for AI-generated code execution
- **Zustand**: Lightweight state management for chat and UI state
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives (@radix-ui/react-*)
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class merging utility

## AI & Processing
- **Mistral API**: LLM integration for intelligent responses
- **CoffeeScript**: Alternative JavaScript syntax support

## Development Tools
- **TypeScript**: Type safety and development experience
- **ESLint**: Code linting with Next.js configuration
- **PostCSS**: CSS processing with Tailwind

## Build & Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture Patterns
- **Component Factory Pattern**: Dynamic UI component creation
- **Sandbox Execution**: Secure code execution with VM2
- **Agent System**: Integrated AI agent with tool execution
- **State Management**: Zustand for global state, React hooks for local state
- **API Routes**: Next.js API routes for backend processing

## Security Considerations
- VM2 sandbox for safe code execution
- Props sanitization in dynamic components
- Input validation and type checking
- Webpack externals configuration for Node.js modules