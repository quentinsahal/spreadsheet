// ***********************************************
// Custom Cypress Commands
// ***********************************************
//
// For more comprehensive examples of custom commands:
// https://on.cypress.io/custom-commands
//
// Example:
// Cypress.Commands.add('login', (email, password) => { ... })

declare global {
  namespace Cypress {
    interface Chainable {
      // Add custom command types here
      // login(email: string, password: string): Chainable<void>
    }
  }
}

export {};
