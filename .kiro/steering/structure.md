# Project Structure & Organization

## Directory Layout

```
├── app/                    # Next.js App Router directory
│   ├── api/               # API routes
│   │   ├── chat/          # Main chat endpoint
│   │   └── calculate/     # Calculation processing endpoint
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.jsx         # Root layout component
│   └── page.jsx           # Home page component
├── components/            # Reusable React components
│   ├── ChatView.jsx       # Main chat interface
│   ├── Messages.jsx       # Message display component
│   ├── DynamicUIRenderer.jsx  # AI-generated component renderer
│   └── ComponentFactory.js    # Safe component creation utilities
├── core/                  # Core business logic
│   ├── aiService.js       # Mistral API integration
│   └── sandboxExecutor.js # VM2 code execution
├── store/                 # State management
│   └── chatStore.js       # Zustand store for chat state
├── utils/                 # Utility functions
│   └── cn.js             # Tailwind class merging utility
└── .kiro/                # Kiro configuration
    └── steering/         # AI assistant guidance documents
```

## Architectural Patterns

### Component Organization
- **Presentation Components**: UI-focused components in `/components`
- **Business Logic**: Core functionality in `/core`
- **API Layer**: Next.js API routes in `/app/api`
- **State Management**: Centralized in `/store` using Zustand

### File Naming Conventions
- **Components**: PascalCase with `.jsx` extension (e.g., `ChatView.jsx`)
- **Utilities**: camelCase with `.js` extension (e.g., `aiService.js`)
- **API Routes**: `route.js` files in named directories
- **Styles**: kebab-case for CSS files

### Code Organization Principles
- **Separation of Concerns**: UI, business logic, and data layers are distinct
- **Single Responsibility**: Each module has a focused purpose
- **Dependency Direction**: Components depend on stores, stores depend on services
- **Security Isolation**: AI-generated code execution is sandboxed in `/core`

## Key Architectural Decisions

### API Structure
- `/api/chat`: Handles initial AI response generation and UI creation
- `/api/calculate`: Processes user interactions with generated components

### State Management
- **Global State**: Chat messages and UI component states in Zustand
- **Local State**: Component-specific state using React hooks
- **Persistence**: UI component values persist across interactions

### Security Model
- **Sandboxed Execution**: VM2 isolates AI-generated code
- **Input Validation**: All user inputs are validated before processing
- **Safe Component Creation**: ComponentFactory ensures secure rendering

### Styling Approach
- **Utility-First**: Tailwind CSS for consistent styling
- **Component Variants**: CVA for type-safe component variations
- **Design System**: Shadcn/ui components for consistent UI patterns