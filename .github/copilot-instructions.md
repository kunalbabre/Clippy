# Copilot Instructions for Demo1 Workspace

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is the Demo1 workspace for experimentation and development.

## Coding Standards
- Use clear, descriptive variable and function names
- Include comments for complex logic
- Follow consistent indentation (2 spaces for web technologies, 4 spaces for Python/C#)
- Write unit tests for new functionality

## File Organization
- Keep source code in appropriate subdirectories
- Place configuration files in the root directory
- Use meaningful folder names that reflect their purpose
- Always check the `references/` folder for project-specific documentation, patterns, and examples before making suggestions
- Reference folder contents should be treated as authoritative for project standards and implementations

## Development Guidelines
- Prefer modern language features and best practices
- Implement error handling and validation
- Consider performance implications in code suggestions
- Suggest secure coding practices

## Documentation
- Update README.md when adding new features
- Include inline documentation for public APIs
- Provide usage examples for complex functions

## Dependencies
- Suggest well-maintained, popular libraries
- Avoid unnecessary dependencies
- Consider bundle size for web applications
- Prefer TypeScript over JavaScript when applicable

## Testing
- Write unit tests for new functions and classes
- Include integration tests for complex workflows
- Test edge cases and error conditions
- Maintain good test coverage

## Security
- Validate all user inputs
- Use parameterized queries for database operations
- Implement proper authentication and authorization
- Avoid hardcoding sensitive information

## Product Management & Specification Writing
### Requirements Analysis
- Always start with the "Why" - define the problem before proposing solutions
- Identify and document user personas and their specific needs
- Define success metrics and key performance indicators (KPIs)
- Consider edge cases and failure scenarios upfront
- Validate assumptions with data or user research when possible

### Specification Structure
- Use the format: Problem Statement → User Stories → Acceptance Criteria → Technical Requirements
- Include both functional and non-functional requirements
- Define clear dependencies and constraints
- Specify data requirements and schema considerations
- Document integration points and API contracts

### User-Centric Thinking
- Write user stories in the format: "As a [user type], I want [functionality] so that [benefit]"
- Prioritize features based on user impact and business value
- Consider accessibility requirements for all users
- Define user flows and interaction patterns
- Include error handling and user feedback mechanisms

### Technical Specifications
- Define system architecture and component interactions
- Specify performance requirements (response times, throughput, scalability)
- Include security and compliance requirements
- Document deployment and operational considerations
- Define monitoring and alerting requirements

### Stakeholder Communication
- Use clear, jargon-free language accessible to all stakeholders
- Include visual diagrams for complex workflows or architectures
- Provide implementation estimates and milestone breakdowns
- Define rollback and mitigation strategies
- Include post-launch success measurement plans

## Reference Materials
- Always consult the `references/` folder before providing ANY guidance or suggestions (coding, PM, documentation, etc.)
- Use reference materials as the primary source for ALL work including:
  - Coding patterns and best practices specific to this project
  - Architecture decisions and design patterns
  - API specifications and integration examples
  - Configuration templates and environment setups
  - Testing strategies and example implementations
  - Product management methodologies and frameworks
  - Specification templates and formats
  - Documentation standards and writing styles
  - Business requirements and user research patterns
  - Stakeholder communication guidelines
  - Project management processes and workflows
- When reference materials conflict with general best practices, prioritize the reference materials
- If reference materials are incomplete or unclear, suggest improvements while following existing patterns
- Apply reference folder guidance to ALL tasks: coding, product management, documentation, analysis, planning, and any other work
