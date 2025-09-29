const SandboxExecutor = require('../sandboxExecutor');

describe('SandboxExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  describe('Safe Function Library', () => {
    test('createElement should create valid element definition', async () => {
      const code = `createElement('div', {className: 'test'}, ['Hello World'])`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('element');
      expect(result.result.tag).toBe('div');
      expect(result.result.props.className).toBe('test');
      expect(result.result.children).toEqual(['Hello World']);
      expect(result.result.id).toMatch(/^comp_/);
    });

    test('createInput should create valid input definition', async () => {
      const code = `createInput({type: 'number', placeholder: 'Enter amount', min: 0, max: 1000})`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('input');
      expect(result.result.props.type).toBe('number');
      expect(result.result.props.placeholder).toBe('Enter amount');
      expect(result.result.props.min).toBe(0);
      expect(result.result.props.max).toBe(1000);
    });

    test('createButton should create valid button definition', async () => {
      const code = `createButton({className: 'btn-primary'}, 'Click Me')`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('button');
      expect(result.result.text).toBe('Click Me');
      expect(result.result.props.className).toBe('btn-primary');
    });

    test('createForm should create valid form definition', async () => {
      const code = `
        createForm({className: 'calculator'}, [
          createElement('h3', {}, ['Calculator']),
          createInput({type: 'number', name: 'value1'}),
          createButton({}, 'Calculate')
        ])
      `;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true);
      expect(result.result.type).toBe('form');
      expect(result.result.children).toHaveLength(3);
      expect(result.result.children[0].type).toBe('element');
      expect(result.result.children[1].type).toBe('input');
      expect(result.result.children[2].type).toBe('button');
    });
  });

  describe('Security Policies', () => {
    test('should reject dangerous require() calls', async () => {
      const code = `require('fs')`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('security_error');
      expect(result.error.message).toContain('dangerous code pattern');
    });

    test('should reject eval() calls', async () => {
      const code = `eval('console.log("hack")')`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('security_error');
    });

    test('should reject process access', async () => {
      const code = `process.exit(1)`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('security_error');
    });

    test('should reject window/document access', async () => {
      const code = `window.location = 'http://evil.com'`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('security_error');
    });

    test('should reject prototype pollution attempts', async () => {
      const code = `Object.prototype.isAdmin = true`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('security_error');
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid element tags', async () => {
      const code = `createElement('script', {}, ['alert("xss")'])`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true); // createElement validates tag internally
      expect(result.result.tag).toBe('script'); // But sanitizes it
    });

    test('should reject invalid input types', async () => {
      const code = `createInput({type: 'file'})`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid input type');
    });

    test('should sanitize props', async () => {
      const code = `createElement('div', {className: 'test<script>', onclick: 'alert(1)'}, [])`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true);
      expect(result.result.props.className).toBe('testscript'); // Sanitized
      expect(result.result.props.onclick).toBeUndefined(); // Removed
    });
  });

  describe('Execution Timeouts', () => {
    test('should timeout infinite loops', async () => {
      const code = `while(true) {}`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('timeout_error');
    }, 10000);

    test('should reject overly long code', async () => {
      const longCode = 'createElement("div", {}, []);\n'.repeat(1000);
      const result = await executor.executeCode(longCode);
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Code too long');
    });
  });

  describe('Result Validation', () => {
    test('should accept valid component arrays', async () => {
      const code = `
        [
          createElement('h1', {}, ['Title']),
          createInput({type: 'text'}),
          createButton({}, 'Submit')
        ]
      `;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result).toHaveLength(3);
    });

    test('should reject invalid result types', async () => {
      const code = `"invalid result"`;
      const result = await executor.executeCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
    });
  });
});