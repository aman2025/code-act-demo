# Design Document

## Overview

The AI-Chat Dynamic UI application is a Next.js 14 web application that enables users to ask mathematical questions and receive both explanatory responses and interactive UI components. The system leverages Mistral LLM for intelligent responses, VM2 for secure code execution, and modern React patterns for dynamic UI rendering.

The architecture follows a clear separation between the chat interface, AI integration, secure code execution, and dynamic UI rendering, ensuring both security and extensibility.

### Core Features

- **Conversational Interface**: Chat-based interaction for asking mathematical questions
- **Dynamic UI Generation**: AI creates interactive forms, calculators, and input components
- **Secure Code Execution**: VM2 sandbox ensures safe execution of AI-generated code
- **Real-time Calculations**: Interactive components perform calculations with user inputs
- **State Persistence**: Component states are maintained across interactions

### User Flow

1. User asks a mathematical question (e.g., "Create a loan calculator")
2. AI generates both explanatory text and interactive UI components
3. User interacts with generated forms and calculators
4. System processes calculations and displays results inline
5. Component states persist for continued interaction

## Architecture

### High-Level Architecture

```mermaid
graph TB
    A[User Types Question] --> B[Chat Interface]
    B --> C[API Route /api/chat]
    C --> D[Mistral LLM]
    D --> E[Structured Response<br/>thought + ui code]
    E --> F[VM2 Sandbox Executor]
    F --> G[Parse & Execute UI Code]
    G --> H[Generate Component Definitions]
    H --> I[Return to Frontend]
    I --> J[Dynamic UI Renderer]
    J --> K[Render Interactive Components]
    K --> L[User Interacts with Generated UI]
    L --> M[Update State & Calculations]
    
    N[Zustand Store] --> B
    N --> J
    N --> M
```

### Dynamic UI Rendering Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Interface
    participant A as API Route
    participant L as Mistral LLM
    participant V as VM2 Sandbox
    participant R as UI Renderer
    
    Note over U,R: Phase 1: Initial UI Generation
    U->>C: "Create a loan calculator"
    C->>A: POST /api/chat
    A->>L: Send prompt with question
    L->>A: Return structured response:<br/><thought>reasoning</thought><br/><ui>createForm(...)</ui>
    A->>V: Execute UI code safely
    V->>A: Return component definitions
    A->>C: Send reasoning + components
    C->>R: Render dynamic components
    R->>U: Display interactive calculator
    
    Note over U,R: Phase 2: User Interaction & Calculation
    U->>R: Input values (principal: 100000, rate: 5%, term: 30)
    U->>R: Click "Calculate Payment"
    R->>C: Capture form values
    C->>A: POST /api/calculate with values
    A->>L: Send calculation request with user inputs
    L->>A: Return calculation result:<br/><thought>calculation process</thought><br/><solution>$536.82</solution>
    A->>C: Send solution result
    C->>R: Update result display
    R->>U: Show "Monthly Payment: $536.82"
```

### Enhanced API Endpoints

The system now supports two API endpoints:

1. **POST /api/chat** - Initial UI generation
2. **POST /api/calculate** - Process user inputs and return calculations

### Technology Stack Integration

- **Next.js 14**: App router for API routes and server-side processing
- **React 18**: Component-based UI with hooks for state management
- **Zustand**: Lightweight state management for chat and UI state
- **Tailwind CSS + Shadcn/ui**: Styling and pre-built components
- **VM2**: Secure JavaScript sandbox for AI-generated code execution
- **Mistral API**: LLM integration for intelligent responses 
