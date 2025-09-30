/**
 * Secure sandbox executor for AI-generated UI code
 * Uses VM2 to safely execute code with restricted access
 */
class SandboxExecutor {
  constructor() {
    this.executionTimeout = 5000; // 5 seconds
    this.memoryLimit = 32 * 1024 * 1024; // 32MB
    this.VM = null;
  }

  /**
   * Dynamically import VM2 when needed
   */
  async getVM() {
    if (!this.VM) {
      const { VM } = await import('vm2');
      this.VM = VM;
    }
    return this.VM;
  }

  /**
   * Safe function library exposed to the sandbox
   * These are the only functions AI-generated code can use
   */
  getSafeFunctions() {
    return {
      createElement: (tag, props = {}, children = []) => {
        // Validate tag name
        if (typeof tag !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(tag)) {
          throw new Error('Invalid element tag');
        }

        // Sanitize props
        const sanitizedProps = this.sanitizeProps(props);

        // Ensure children is an array
        const sanitizedChildren = Array.isArray(children) ? children : [children];

        return {
          type: 'element',
          tag: tag.toLowerCase(),
          props: sanitizedProps,
          children: sanitizedChildren,
          id: this.generateId()
        };
      },

      createInput: (props = {}) => {
        // Validate input props
        const allowedTypes = ['text', 'number', 'email', 'password', 'tel', 'url'];
        const inputType = props.type || 'text';

        if (!allowedTypes.includes(inputType)) {
          throw new Error(`Invalid input type: ${inputType}`);
        }

        const sanitizedProps = this.sanitizeInputProps(props);

        return {
          type: 'input',
          props: sanitizedProps,
          id: this.generateId()
        };
      },

      createButton: (props = {}, text = '') => {
        // Sanitize button props
        const sanitizedProps = this.sanitizeProps(props);

        // Ensure text is a string
        const buttonText = typeof text === 'string' ? text : String(text);

        return {
          type: 'button',
          props: sanitizedProps,
          text: buttonText,
          id: this.generateId()
        };
      },

      createForm: (props = {}, children = []) => {
        // Sanitize form props
        const sanitizedProps = this.sanitizeProps(props);

        // Ensure children is an array
        const sanitizedChildren = Array.isArray(children) ? children : [children];

        return {
          type: 'form',
          props: sanitizedProps,
          children: sanitizedChildren,
          id: this.generateId()
        };
      }
    };
  }

  /**
   * Sanitize general props object
   */
  sanitizeProps(props) {
    if (!props || typeof props !== 'object') {
      return {};
    }

    const sanitized = {};
    const allowedProps = [
      'id', 'className', 'style', 'name', 'value', 'placeholder',
      'disabled', 'required', 'min', 'max', 'step', 'title', 'type'
    ];

    for (const [key, value] of Object.entries(props)) {
      // Only allow whitelisted props
      if (allowedProps.includes(key)) {
        // Sanitize specific prop types
        if (key === 'className' && typeof value === 'string') {
          // Allow only safe CSS class names
          sanitized[key] = value.replace(/[^a-zA-Z0-9\s\-_]/g, '');
        } else if (key === 'style' && typeof value === 'object') {
          // Skip style objects for security - use className instead
          continue;
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize input-specific props
   */
  sanitizeInputProps(props) {
    const sanitized = this.sanitizeProps(props);

    // Ensure type is preserved for inputs
    if (props.type) {
      sanitized.type = props.type;
    }

    // Additional input-specific validations
    if (sanitized.type === 'number') {
      if (sanitized.min !== undefined) {
        sanitized.min = Number(sanitized.min) || 0;
      }
      if (sanitized.max !== undefined) {
        sanitized.max = Number(sanitized.max) || 100;
      }
      if (sanitized.step !== undefined) {
        sanitized.step = Number(sanitized.step) || 1;
      }
    }

    return sanitized;
  }

  /**
   * Generate unique ID for components
   */
  generateId() {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Execute AI-generated code safely in VM2 sandbox
   */
  async executeCode(code) {
    try {
      // Validate code input
      if (typeof code !== 'string' || code.trim().length === 0) {
        throw new Error('Invalid code input');
      }

      // Check for potentially dangerous patterns
      this.validateCodeSafety(code);

      // Get VM2 class dynamically
      const VM = await this.getVM();

      // Create VM2 instance with security restrictions
      const vm = new VM({
        timeout: this.executionTimeout,
        sandbox: {
          ...this.getSafeFunctions(),
          // Add some basic utilities
          console: {
            log: () => { }, // Disable console output
            error: () => { },
            warn: () => { }
          }
        },
        // Security settings
        wasm: false,
        fixAsync: false,
        eval: false,
        require: false
      });

      // Execute the code and return result
      const result = vm.run(code);

      // Validate the result
      this.validateResult(result);

      return {
        success: true,
        result: result,
        error: null
      };

    } catch (error) {
      console.error('Sandbox execution error:', error);

      return {
        success: false,
        result: null,
        error: {
          type: this.categorizeError(error),
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Validate code for dangerous patterns before execution
   */
  validateCodeSafety(code) {
    // List of dangerous patterns to reject
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./,
      /location\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /WebSocket/,
      /__proto__/,
      /constructor/,
      /prototype/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Potentially dangerous code pattern detected: ${pattern.source}`);
      }
    }

    // Check code length to prevent resource exhaustion
    if (code.length > 10000) {
      throw new Error('Code too long - maximum 10,000 characters allowed');
    }
  }

  /**
   * Validate the execution result
   */
  validateResult(result) {
    if (result === null || result === undefined) {
      return; // Allow null/undefined results
    }

    // Ensure result is a valid component definition or array of definitions
    if (Array.isArray(result)) {
      result.forEach(item => this.validateComponentDefinition(item));
    } else if (typeof result === 'object') {
      this.validateComponentDefinition(result);
    } else {
      throw new Error('Invalid result type - expected component definition or array');
    }
  }

  /**
   * Validate individual component definitions
   */
  validateComponentDefinition(component) {
    if (!component || typeof component !== 'object') {
      throw new Error('Invalid component definition');
    }

    const allowedTypes = ['element', 'input', 'button', 'form'];
    if (!allowedTypes.includes(component.type)) {
      throw new Error(`Invalid component type: ${component.type}`);
    }

    // Validate required fields
    if (!component.id || typeof component.id !== 'string') {
      throw new Error('Component must have a valid ID');
    }

    // Validate props if present
    if (component.props && typeof component.props !== 'object') {
      throw new Error('Component props must be an object');
    }

    // Validate children if present
    if (component.children && !Array.isArray(component.children)) {
      throw new Error('Component children must be an array');
    }
  }

  /**
   * Categorize errors for better error handling
   */
  categorizeError(error) {
    if (error.message.includes('timeout') || error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      return 'timeout_error';
    } else if (error.message.includes('dangerous')) {
      return 'security_error';
    } else if (error.message.includes('Invalid')) {
      return 'validation_error';
    } else if (error.name === 'VMError') {
      return 'execution_error';
    } else {
      return 'unknown_error';
    }
  }
}

export default SandboxExecutor;