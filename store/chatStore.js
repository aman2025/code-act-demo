import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  // Message state
  messages: [],
  
  // UI state
  isLoading: false,
  currentInput: '',
  
  // Dynamic UI component states
  uiState: {},
  
  // Actions for message management
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...message
    }]
  })),
  
  addUserMessage: (content) => {
    const { addMessage } = get();
    addMessage({
      type: 'user',
      content
    });
  },
  
  addAIMessage: (content, uiComponents = null) => {
    const { addMessage } = get();
    addMessage({
      type: 'ai',
      content,
      uiComponents
    });
  },
  
  // Actions for loading state
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Actions for input management
  setCurrentInput: (input) => set({ currentInput: input }),
  
  clearCurrentInput: () => set({ currentInput: '' }),
  
  // Actions for UI state management
  updateUIState: (componentId, value) => set((state) => ({
    uiState: {
      ...state.uiState,
      [componentId]: value
    }
  })),
  
  getUIState: (componentId) => {
    const { uiState } = get();
    return uiState[componentId];
  },
  
  // Actions for form values management
  updateFormValue: (formId, fieldName, value) => set((state) => ({
    uiState: {
      ...state.uiState,
      [formId]: {
        ...state.uiState[formId],
        [fieldName]: value
      }
    }
  })),
  
  getFormValues: (formId) => {
    const { uiState } = get();
    return uiState[formId] || {};
  },
  
  // Clear all form values for a specific form
  clearFormValues: (formId) => set((state) => ({
    uiState: {
      ...state.uiState,
      [formId]: {}
    }
  })),
  
  // Clear all messages (for new chat sessions)
  clearMessages: () => set({ messages: [] }),
  
  // Clear all UI state
  clearUIState: () => set({ uiState: {} }),
  
  // Reset entire store to initial state
  reset: () => set({
    messages: [],
    isLoading: false,
    currentInput: '',
    uiState: {}
  })
}));

export default useChatStore;