import { 
  sanitizeProps, 
  sanitizeInputProps, 
  validateComponentDefinition,
  ComponentFactory 
} from '../ComponentFactory';

describe('ComponentFactory', () => {
  describe('sanitizeProps', () => {
    it('should allow safe props', () => {
      const props = {
        id: 'test-id',
        className: 'test-class',
        placeholder: 'Enter text',
        type: 'text'
      };
      
      const sanitized = sanitizeProps(props);
      expect(sanitized).toEqual(props);
    });

    it('should remove dangerous props', () => {
      const props = {
        id: 'test-id',
        onClick: 'alert("xss")',
        onLoad: 'maliciousFunction()',
        dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' }
      };
      
      const sanitized = sanitizeProps(props);
      expect(sanitized).toEqual({ id: 'test-id' });
    });

    it('should sanitize className to remove special characters', () => {
      const props = {
        className: 'valid-class <script>alert("xss")</script>'
      };
      
      const sanitized = sanitizeProps(props);
      expect(sanitized.className).toBe('valid-class scriptalertxssscript');
    });

    it('should sanitize style object to only allow safe properties', () => {
      const props = {
        style: {
          color: 'red',
          backgroundColor: 'blue',
          position: 'absolute', // Should be removed
          fontSize: '16px'
        }
      };
      
      const sanitized = sanitizeProps(props);
      expect(sanitized.style).toEqual({
        color: 'red',
        backgroundColor: 'blue',
        fontSize: '16px'
      });
    });
  });

  describe('sanitizeInputProps', () => {
    it('should allow safe input types', () => {
      const props = { type: 'number', name: 'amount' };
      const sanitized = sanitizeInputProps(props);
      expect(sanitized.type).toBe('number');
    });

    it('should default unsafe input types to text', () => {
      const props = { type: 'file', name: 'upload' };
      const sanitized = sanitizeInputProps(props);
      expect(sanitized.type).toBe('text');
    });
  });

  describe('validateComponentDefinition', () => {
    it('should validate correct component definitions', () => {
      const definition = {
        type: 'element',
        tag: 'div',
        props: { className: 'test' },
        children: ['Hello World']
      };
      
      expect(validateComponentDefinition(definition)).toBe(true);
    });

    it('should reject invalid component types', () => {
      const definition = {
        type: 'script',
        props: {}
      };
      
      expect(validateComponentDefinition(definition)).toBe(false);
    });

    it('should validate nested children', () => {
      const definition = {
        type: 'form',
        children: [
          {
            type: 'input',
            props: { name: 'test' }
          },
          'Some text'
        ]
      };
      
      expect(validateComponentDefinition(definition)).toBe(true);
    });

    it('should reject definitions with invalid children', () => {
      const definition = {
        type: 'form',
        children: [
          {
            type: 'invalid-type',
            props: {}
          }
        ]
      };
      
      expect(validateComponentDefinition(definition)).toBe(false);
    });
  });

  describe('ComponentFactory.create', () => {
    it('should create valid React elements', () => {
      const definition = {
        type: 'element',
        tag: 'div',
        props: { className: 'test' },
        children: ['Test content']
      };
      
      const element = ComponentFactory.create(definition);
      expect(element).toBeTruthy();
      expect(element.type).toBe('div');
    });

    it('should return null for invalid definitions', () => {
      const definition = {
        type: 'invalid-type'
      };
      
      const element = ComponentFactory.create(definition);
      expect(element).toBeNull();
    });
  });

  describe('ComponentFactory.createMultiple', () => {
    it('should create multiple components', () => {
      const definitions = [
        {
          type: 'element',
          tag: 'div',
          children: ['First']
        },
        {
          type: 'element',
          tag: 'span',
          children: ['Second']
        }
      ];
      
      const elements = ComponentFactory.createMultiple(definitions);
      expect(elements).toHaveLength(2);
    });

    it('should filter out invalid definitions', () => {
      const definitions = [
        {
          type: 'element',
          tag: 'div',
          children: ['Valid']
        },
        {
          type: 'invalid-type'
        }
      ];
      
      const elements = ComponentFactory.createMultiple(definitions);
      expect(elements).toHaveLength(1);
    });
  });
});