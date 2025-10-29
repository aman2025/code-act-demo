/**
 * Tool Registry - Centralized management of available tools
 * Implements tool registration, validation, and discovery
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.categories = new Set();
    this.initialized = false;
  }

  /**
   * Initialize the tool registry
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Initializing Tool Registry');
    this.initialized = true;
  }

  /**
   * Register a new tool in the registry
   * @param {Tool} tool - Tool instance to register
   * @throws {Error} - If tool validation fails
   */
  registerTool(tool) {
    if (!this.validateTool(tool)) {
      throw new Error(`Tool validation failed for: ${tool.name}`);
    }

    if (this.tools.has(tool.name)) {
      console.warn(`Tool '${tool.name}' already registered, overwriting`);
    }

    this.tools.set(tool.name, tool);
    this.categories.add(tool.category);
    
    console.log(`Tool registered: ${tool.name} (${tool.category})`);
  }

  /**
   * Retrieve a tool by name
   * @param {string} name - Tool name
   * @returns {Tool|null} - Tool instance or null if not found
   */
  getTool(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Get all available tools, optionally filtered by category
   * @param {string} category - Optional category filter
   * @returns {Tool[]} - Array of available tools
   */
  getAvailableTools(category = null) {
    const allTools = Array.from(this.tools.values());
    
    if (category) {
      return allTools.filter(tool => tool.category === category);
    }
    
    return allTools;
  }

  /**
   * Search tools by name or description
   * @param {string} query - Search query
   * @returns {Tool[]} - Array of matching tools
   */
  searchTools(query) {
    if (!query || query.trim() === '') {
      return this.getAvailableTools();
    }

    const searchTerm = query.toLowerCase().trim();
    const allTools = Array.from(this.tools.values());
    
    return allTools.filter(tool => {
      const nameMatch = tool.name.toLowerCase().includes(searchTerm);
      const descMatch = tool.description.toLowerCase().includes(searchTerm);
      const categoryMatch = tool.category.toLowerCase().includes(searchTerm);
      
      return nameMatch || descMatch || categoryMatch;
    });
  }

  /**
   * Get all available categories
   * @returns {string[]} - Array of category names
   */
  getCategories() {
    return Array.from(this.categories).sort();
  }

  /**
   * Get tool documentation for a specific tool
   * @param {string} toolName - Name of the tool
   * @returns {Object|null} - Tool documentation or null
   */
  getToolDocumentation(toolName) {
    const tool = this.getTool(toolName);
    if (!tool) return null;

    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      parameters: tool.parameters,
      examples: tool.examples || [],
      usage: tool.getUsageInstructions ? tool.getUsageInstructions() : null
    };
  }

  /**
   * Get registry statistics
   * @returns {Object} - Registry statistics
   */
  getStatistics() {
    const toolsByCategory = {};
    
    for (const category of this.categories) {
      toolsByCategory[category] = this.getAvailableTools(category).length;
    }

    return {
      totalTools: this.tools.size,
      totalCategories: this.categories.size,
      toolsByCategory,
      initialized: this.initialized
    };
  }

  /**
   * Validate tool definition
   * @param {Tool} tool - Tool to validate
   * @returns {boolean} - Whether tool is valid
   */
  validateTool(tool) {
    try {
      // Check if tool is a valid object
      if (!tool || typeof tool !== 'object') {
        console.error('Tool validation failed: tool must be an object');
        return false;
      }

      // Check required properties (including inherited ones)
      const requiredProperties = ['name', 'description', 'category'];
      
      for (const prop of requiredProperties) {
        if (!(prop in tool)) {
          console.error(`Tool validation failed: missing property '${prop}'`);
          return false;
        }
      }

      // Check execute method separately with more detailed logging
      if (!('execute' in tool)) {
        console.error('Tool validation failed: missing execute method');
        console.error('Tool prototype chain:', tool.constructor.name);
        console.error('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(tool)));
        return false;
      }

      if (typeof tool.execute !== 'function') {
        console.error('Tool validation failed: execute must be a function');
        console.error('Execute property type:', typeof tool.execute);
        console.error('Execute property value:', tool.execute);
        return false;
      }

      // Validate property types
      if (typeof tool.name !== 'string' || tool.name.trim() === '') {
        console.error('Tool validation failed: name must be a non-empty string');
        return false;
      }

      if (typeof tool.description !== 'string' || tool.description.trim() === '') {
        console.error('Tool validation failed: description must be a non-empty string');
        return false;
      }

      if (typeof tool.category !== 'string' || tool.category.trim() === '') {
        console.error('Tool validation failed: category must be a non-empty string');
        return false;
      }

      // Validate parameters if present
      if (tool.parameters && !Array.isArray(tool.parameters)) {
        console.error('Tool validation failed: parameters must be an array');
        return false;
      }

      if (tool.parameters) {
        for (const param of tool.parameters) {
          if (!this.validateParameter(param)) {
            return false;
          }
        }
      }

      return true;
      
    } catch (error) {
      console.error('Tool validation error:', error);
      console.error('Tool object:', tool);
      return false;
    }
  }

  /**
   * Validate parameter schema
   * @param {Object} parameter - Parameter to validate
   * @returns {boolean} - Whether parameter is valid
   */
  validateParameter(parameter) {
    const requiredProps = ['name', 'type', 'required'];
    
    for (const prop of requiredProps) {
      if (!parameter.hasOwnProperty(prop)) {
        console.error(`Parameter validation failed: missing property '${prop}'`);
        return false;
      }
    }

    if (typeof parameter.name !== 'string' || parameter.name.trim() === '') {
      console.error('Parameter validation failed: name must be a non-empty string');
      return false;
    }

    const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
    if (!validTypes.includes(parameter.type)) {
      console.error(`Parameter validation failed: invalid type '${parameter.type}'`);
      return false;
    }

    if (typeof parameter.required !== 'boolean') {
      console.error('Parameter validation failed: required must be a boolean');
      return false;
    }

    return true;
  }

  /**
   * Remove a tool from the registry
   * @param {string} toolName - Name of tool to remove
   * @returns {boolean} - Whether tool was removed
   */
  removeTool(toolName) {
    const removed = this.tools.delete(toolName);
    
    if (removed) {
      console.log(`Tool removed: ${toolName}`);
      
      // Update categories if no tools remain in a category
      this.updateCategories();
    }
    
    return removed;
  }

  /**
   * Update categories based on current tools
   */
  updateCategories() {
    this.categories.clear();
    
    for (const tool of this.tools.values()) {
      this.categories.add(tool.category);
    }
  }

  /**
   * Clear all tools from registry
   */
  clear() {
    this.tools.clear();
    this.categories.clear();
    console.log('Tool registry cleared');
  }

  /**
   * Export registry configuration
   * @returns {Object} - Registry configuration
   */
  exportConfiguration() {
    const tools = {};
    
    for (const [name, tool] of this.tools) {
      tools[name] = {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameters: tool.parameters || []
      };
    }

    return {
      tools,
      categories: Array.from(this.categories),
      statistics: this.getStatistics()
    };
  }

  /**
   * Get registry status for debugging
   * @returns {Object} - Registry status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      toolCount: this.tools.size,
      categoryCount: this.categories.size,
      tools: Array.from(this.tools.keys()),
      categories: Array.from(this.categories)
    };
  }
}

export default ToolRegistry;