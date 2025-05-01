# Rho (ρ) - Terminal AI Agent

Rho is a terminal-based AI agent powered by Google Gemini that helps you understand and modify codebases.

## Features

- Chat with Rho about your code to understand how it works
- Ask Rho to explore your codebase and explain code structure  
- Create new files with Rho's help
- Make edits to existing files
- Works in any directory on your system

## Installation

### Global Installation (Recommended)

Install Rho globally to use it from any directory:

```bash
# Clone the repository
git clone https://github.com/yourusername/rho-agent.git
cd rho-agent

# Install dependencies
npm install

# Build the project
npm run build

# Install globally
npm install -g .
```

### Set up your API key

Rho requires a Google API key to function. You can either:

1. Create a `.rho-agent.env` file in your home directory:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

2. Set the environment variable before running:
   ```bash
   export GOOGLE_API_KEY=your_api_key_here
   ```

3. Create a `.env` file in the directory where you run Rho:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

## Usage

Once installed globally, simply run `rho` in any directory:

```bash
cd your-project
rho
```

Rho will start analyzing your code and answering your questions.

## Developing Rho

To work on Rho itself:

```bash
# Clone the repository 
git clone https://github.com/yourusername/rho-agent.git
cd rho-agent

# Install dependencies
npm install

# Run in development mode
npm run dev
```
