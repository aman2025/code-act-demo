const SandboxExecutor = require('./sandboxExecutor');

/**
 * Example usage of the SandboxExecutor
 * This demonstrates how AI-generated code would be executed safely
 */
async function demonstrateSandboxExecutor() {
  const executor = new SandboxExecutor();

  console.log('=== SandboxExecutor Demo ===\n');

  // Example 1: Simple calculator form
  console.log('1. Creating a loan calculator form:');
  const calculatorCode = `
    createForm({className: 'loan-calculator'}, [
      createElement('h3', {}, ['Loan Payment Calculator']),
      createInput({
        name: 'principal',
        type: 'number',
        placeholder: 'Loan amount ($)',
        min: 1000,
        max: 1000000
      }),
      createInput({
        name: 'rate',
        type: 'number',
        placeholder: 'Interest rate (%)',
        min: 0.1,
        max: 30,
        step: 0.1
      }),
      createInput({
        name: 'term',
        type: 'number',
        placeholder: 'Term (years)',
        min: 1,
        max: 50
      }),
      createButton({className: 'calculate-btn'}, 'Calculate Payment'),
      createElement('div', {id: 'result', className: 'result'}, ['Monthly Payment: $0'])
    ])
  `;

  const result1 = await executor.executeCode(calculatorCode);
  if (result1.success) {
    console.log('✅ Successfully created calculator form');
    console.log('Form structure:', JSON.stringify(result1.result, null, 2));
  } else {
    console.log('❌ Failed:', result1.error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Multiple components array
  console.log('2. Creating multiple UI components:');
  const multiComponentCode = `
    [
      createElement('h2', {}, ['Area Calculator']),
      createInput({name: 'length', type: 'number', placeholder: 'Length'}),
      createInput({name: 'width', type: 'number', placeholder: 'Width'}),
      createButton({}, 'Calculate Area'),
      createElement('p', {id: 'area-result'}, ['Area: 0 sq ft'])
    ]
  `;

  const result2 = await executor.executeCode(multiComponentCode);
  if (result2.success) {
    console.log('✅ Successfully created component array');
    console.log(`Created ${result2.result.length} components`);
  } else {
    console.log('❌ Failed:', result2.error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Security test - dangerous code
  console.log('3. Testing security - attempting dangerous code:');
  const dangerousCode = `require('fs').readFileSync('/etc/passwd')`;

  const result3 = await executor.executeCode(dangerousCode);
  if (!result3.success) {
    console.log('✅ Security working - dangerous code blocked');
    console.log('Error type:', result3.error.type);
    console.log('Error message:', result3.error.message);
  } else {
    console.log('❌ Security failed - dangerous code executed!');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: Invalid input type
  console.log('4. Testing validation - invalid input type:');
  const invalidInputCode = `createInput({type: 'file', name: 'upload'})`;

  const result4 = await executor.executeCode(invalidInputCode);
  if (!result4.success) {
    console.log('✅ Validation working - invalid input type rejected');
    console.log('Error type:', result4.error.type);
  } else {
    console.log('❌ Validation failed - invalid input accepted!');
  }

  console.log('\n=== Demo Complete ===');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateSandboxExecutor().catch(console.error);
}

module.exports = { demonstrateSandboxExecutor };