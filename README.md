![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-sshv2

This package provides enhanced SSH functionality for n8n, including an AI-powered SSH tool node.

## Features

### 1. Hadidiz-AI Node
An AI-powered SSH tool that can be used with n8n's AI Agent for:
- Executing remote commands
- Downloading files
- Uploading files
- Dynamic connection parameters
- Support for both password and private key authentication

### 2. SSHv2 Node
A standard SSH node with enhanced capabilities for:
- Command execution
- File transfers
- Credential management
- Dynamic parameters

## Installation

### Local Installation
```bash
npm install n8n-nodes-sshv2
```

### n8n.cloud Installation
1. Go to Settings > Community Nodes
2. Select "Install"
3. Enter `n8n-nodes-sshv2`
4. Click "Install"

## Usage with AI Agent

To use the Hadidiz-AI node with the AI Agent, you need to:

1. Set the following environment variables:
```bash
export N8N_CUSTOM_EXTENSIONS=/path/to/custom/nodes
export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

2. Add the AI Agent node to your workflow
3. Select "Tools Agent" as the agent type
4. Add "Hadidiz-AI" from the available tools

## Configuration

### SSH Credentials
The package supports two types of authentication:
- Password-based authentication
- Private key authentication

### Dynamic Parameters
Both nodes support dynamic parameters, allowing you to:
- Use different servers in the same workflow
- Pass credentials from previous nodes
- Use environment variables

## License

[MIT](LICENSE.md)
