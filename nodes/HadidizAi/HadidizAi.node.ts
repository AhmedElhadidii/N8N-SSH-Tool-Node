import { writeFile } from 'fs/promises';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import type { Config } from 'node-ssh';
import { NodeSSH } from 'node-ssh';
import type { Readable } from 'stream';
import { file as tmpFile } from 'tmp-promise';

import { formatPrivateKey } from '../../utils/utilities';

// Extend the INodeTypeDescription interface to include usableAsTool
interface IExtendedNodeTypeDescription extends INodeTypeDescription {
	usableAsTool?: boolean;
}

async function resolveHomeDir(
	this: IExecuteFunctions,
	path: string,
	ssh: NodeSSH,
	itemIndex: number,
) {
	if (path.startsWith('~/')) {
		let homeDir = (await ssh.execCommand('echo $HOME')).stdout;

		if (homeDir.charAt(homeDir.length - 1) !== '/') {
			homeDir += '/';
		}

		return path.replace('~/', homeDir);
	}

	if (path.startsWith('~')) {
		throw new NodeOperationError(
			this.getNode(),
			'Invalid path. Replace "~" with home directory or "~/"',
			{
				itemIndex,
			},
		);
	}

	return path;
}

export class HadidizAi implements INodeType {
	description: IExtendedNodeTypeDescription = {
		displayName: 'Hadidiz-AI',
		name: 'hadidizAi',
		icon: 'fa:robot',
		group: ['ai_tools'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'AI-powered SSH operations for remote server management',
		defaults: {
			name: 'Hadidiz-AI',
			color: '#3366ff',
		},
		usableAsTool: true,
		// This lets the AI Agent know what this tool does
		codex: {
			categories: ['AI Tools', 'System Administration'],
			subcategories: {
				'AI Tools': ['SSH', 'Remote Access'],
				'System Administration': ['Commands', 'File Transfer'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.ssh/',
					},
				],
			},
			alias: ['ssh', 'terminal', 'remote', 'command', 'hadidiz', 'ai'],
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sshPasswordApi',
				required: false,
				displayOptions: {
					show: {
						authentication: ['password'],
						connectionType: ['credentials'],
					},
				},
			},
			{
				name: 'sshPrivateKeyApi',
				required: false,
				displayOptions: {
					show: {
						authentication: ['privateKey'],
						connectionType: ['credentials'],
					},
				},
			},
		],
		// Tools need this special structure
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Command',
						value: 'executeCommand',
						description: 'Execute a command on a remote server',
						action: 'Execute a command on a remote server',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						description: 'Download a file from a remote server',
						action: 'Download a file from a remote server',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload a file to a remote server',
						action: 'Upload a file to a remote server',
					},
				],
				default: 'executeCommand',
			},
			{
				displayName: 'Connection Type',
				name: 'connectionType',
				type: 'options',
				options: [
					{
						name: 'Credentials',
						value: 'credentials',
						description: 'Use stored credentials',
					},
					{
						name: 'Dynamic Parameters',
						value: 'parameters',
						description: 'Use dynamic parameters for connection',
					},
				],
				default: 'parameters',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Password',
						value: 'password',
					},
					{
						name: 'Private Key',
						value: 'privateKey',
					},
				],
				default: 'password',
			},
			// Dynamic connection parameters
			{
				displayName: 'Host',
				name: 'host',
				type: 'string',
				default: '',
				placeholder: 'localhost',
				required: true,
				displayOptions: {
					show: {
						connectionType: ['parameters'],
					},
				},
				description: 'Hostname or IP address of the SSH server',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: 22,
				required: true,
				displayOptions: {
					show: {
						connectionType: ['parameters'],
					},
				},
				description: 'Port number of the SSH server',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						connectionType: ['parameters'],
					},
				},
				description: 'Username to use for authentication',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						connectionType: ['parameters'],
						authentication: ['password'],
					},
				},
				description: 'Password to use for authentication',
			},
			{
				displayName: 'Private Key',
				name: 'privateKey',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 4,
					password: true,
				},
				displayOptions: {
					show: {
						connectionType: ['parameters'],
						authentication: ['privateKey'],
					},
				},
				description: 'Private key to use for authentication',
			},
			{
				displayName: 'Passphrase',
				name: 'passphrase',
				type: 'string',
				default: '',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						connectionType: ['parameters'],
						authentication: ['privateKey'],
					},
				},
				description: 'Passphrase for the private key, if required',
			},

			// Command Specific Parameters
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['executeCommand'],
					},
				},
				description: 'The command to execute on the remote server',
				placeholder: 'ls -la',
			},
			{
				displayName: 'Working Directory',
				name: 'workingDirectory',
				type: 'string',
				default: '~',
				displayOptions: {
					show: {
						operation: ['executeCommand'],
					},
				},
				description: 'Directory where the command will be executed',
			},

			// Download Specific Parameters
			{
				displayName: 'Remote File Path',
				name: 'remotePath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['downloadFile'],
					},
				},
				placeholder: '/home/user/file.txt',
				description: 'Path to the file on the remote server',
			},
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: ['downloadFile'],
					},
				},
				description: 'Name of the binary property to store the downloaded file',
			},
			
			// Upload Specific Parameters
			{
				displayName: 'Upload From',
				name: 'uploadSource',
				type: 'options',
				options: [
					{
						name: 'Binary Data',
						value: 'binaryData',
						description: 'Use binary field data',
					},
					{
						name: 'Text Content',
						value: 'textContent',
						description: 'Use text content',
					},
				],
				default: 'textContent',
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
			},
			{
				displayName: 'Binary Input Field',
				name: 'binaryInputField',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
						uploadSource: ['binaryData'],
					},
				},
				description: 'The field with binary data to upload',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['uploadFile'],
						uploadSource: ['textContent'],
					},
				},
				description: 'The text content to upload as a file',
			},
			{
				displayName: 'Remote Directory',
				name: 'remoteDirectory',
				type: 'string',
				default: '~',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Directory on the remote server where the file will be uploaded',
			},
			{
				displayName: 'Remote Filename',
				name: 'remoteFilename',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadFile'],
					},
				},
				description: 'Name of the file on the remote server',
			},
		],
	};

	// This is important for tool nodes
	methods = {
		loadOptions: {
			// You can add dynamic loading options here if needed
		},
	};

	// This helps describe the node to AI Agent
	getImplementationDescription(operation: string): string {
		switch (operation) {
			case 'executeCommand':
				return 'Executes a command on a remote server via SSH and returns the output';
			case 'downloadFile':
				return 'Downloads a file from a remote server via SSH and returns it as binary data';
			case 'uploadFile':
				return 'Uploads a file to a remote server via SSH';
			default:
				return 'Performs SSH operations on a remote server';
		}
	}

	// This defines parameter descriptions for AI to understand
	getParameterDescription(parameter: string, operation: string): string {
		const descriptions: { [key: string]: { [key: string]: string } } = {
			host: {
				all: 'The hostname or IP address of the SSH server to connect to',
			},
			port: {
				all: 'The port number of the SSH server (default: 22)',
			},
			username: {
				all: 'The username to authenticate with on the SSH server',
			},
			password: {
				all: 'The password to authenticate with on the SSH server',
			},
			privateKey: {
				all: 'The private key to authenticate with on the SSH server',
			},
			passphrase: {
				all: 'The passphrase for the private key if required',
			},
			command: {
				executeCommand: 'The shell command to execute on the remote server',
			},
			workingDirectory: {
				executeCommand: 'The directory on the remote server where the command will be executed',
			},
			remotePath: {
				downloadFile: 'The full path to the file on the remote server that should be downloaded',
			},
			remoteDirectory: {
				uploadFile: 'The directory on the remote server where the file should be uploaded to',
			},
			remoteFilename: {
				uploadFile: 'The name of the file on the remote server',
			},
			fileContent: {
				uploadFile: 'The content of the file to upload to the remote server',
			},
		};

		if (parameter in descriptions) {
			if (operation in descriptions[parameter]) {
				return descriptions[parameter][operation];
			} else if ('all' in descriptions[parameter]) {
				return descriptions[parameter].all;
			}
		}
		
		return '';
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		
		// This should be 0 for tool nodes typically
		const itemIndex = 0;
		
		try {
			// Get basic parameters
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const connectionType = this.getNodeParameter('connectionType', itemIndex) as string;
			const authentication = this.getNodeParameter('authentication', itemIndex) as string;
			
			// Initialize SSH client
			const ssh = new NodeSSH();
			
			// Set up connection options based on connection type
			let connectionOptions: Config;
			
			if (connectionType === 'credentials') {
				if (authentication === 'password') {
					const credentials = await this.getCredentials('sshPasswordApi');
					connectionOptions = {
						host: credentials.host as string,
						username: credentials.username as string,
						port: credentials.port as number,
						password: credentials.password as string,
					};
				} else {
					const credentials = await this.getCredentials('sshPrivateKeyApi');
					connectionOptions = {
						host: credentials.host as string,
						username: credentials.username as string,
						port: credentials.port as number,
						privateKey: formatPrivateKey(credentials.privateKey as string),
					};
					
					if (credentials.passphrase) {
						connectionOptions.passphrase = credentials.passphrase as string;
					}
				}
			} else {
				// Dynamic parameters
				const host = this.getNodeParameter('host', itemIndex) as string;
				const port = this.getNodeParameter('port', itemIndex) as number;
				const username = this.getNodeParameter('username', itemIndex) as string;
				
				if (authentication === 'password') {
					const password = this.getNodeParameter('password', itemIndex) as string;
					connectionOptions = {
						host,
						port,
						username,
						password,
					};
				} else {
					const privateKey = this.getNodeParameter('privateKey', itemIndex) as string;
					const passphrase = this.getNodeParameter('passphrase', itemIndex, '') as string;
					
					connectionOptions = {
						host,
						port,
						username,
						privateKey: formatPrivateKey(privateKey),
					};
					
					if (passphrase) {
						connectionOptions.passphrase = passphrase;
					}
				}
			}
			
			// Connect to SSH server
			try {
				await ssh.connect(connectionOptions);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`SSH connection failed: ${error.message}`,
					{ itemIndex },
				);
			}
			
			try {
				// Perform the requested operation
				if (operation === 'executeCommand') {
					// Execute Command
					const command = this.getNodeParameter('command', itemIndex) as string;
					const workingDirectory = this.getNodeParameter('workingDirectory', itemIndex) as string;
					
					// Resolve home directory in working directory path
					const cwd = await resolveHomeDir.call(this, workingDirectory, ssh, itemIndex);
					
					// Execute command on the remote server
					const result = await ssh.execCommand(command, { cwd });
					
					// Format the result
					const output: IDataObject = {
						stdout: result.stdout,
						stderr: result.stderr,
						exitCode: result.code,
						success: result.code === 0,
						command,
						workingDirectory: cwd,
					};
					
					returnData.push({
						json: output,
					});
				} else if (operation === 'downloadFile') {
					// Download File
					const remotePath = this.getNodeParameter('remotePath', itemIndex) as string;
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
					
					// Resolve home directory in remote path
					const resolvedRemotePath = await resolveHomeDir.call(this, remotePath, ssh, itemIndex);
					
					// Create a temporary file to store the download
					const binaryFile = await tmpFile({ prefix: 'n8n-ssh-tool-' });
					
					try {
						// Download the file
						await ssh.getFile(binaryFile.path, resolvedRemotePath);
						
						// Create the output with the binary data
						const fileName = resolvedRemotePath.split('/').pop() || 'file';
						
						const newItem: INodeExecutionData = {
							json: {
								success: true,
								operation: 'downloadFile',
								remotePath: resolvedRemotePath,
								fileName,
							},
							binary: {},
						};
						
						newItem.binary![binaryPropertyName] = await this.nodeHelpers.copyBinaryFile(
							binaryFile.path,
							fileName,
						);
						
						returnData.push(newItem);
					} finally {
						await binaryFile.cleanup();
					}
				} else if (operation === 'uploadFile') {
					// Upload File
					const remoteDirectory = this.getNodeParameter('remoteDirectory', itemIndex) as string;
					const remoteFilename = this.getNodeParameter('remoteFilename', itemIndex) as string;
					const uploadSource = this.getNodeParameter('uploadSource', itemIndex) as string;
					
					// Resolve home directory in remote directory path
					const resolvedRemoteDir = await resolveHomeDir.call(this, remoteDirectory, ssh, itemIndex);
					
					// Full remote path including filename
					const remotePath = `${resolvedRemoteDir}${
						resolvedRemoteDir.charAt(resolvedRemoteDir.length - 1) === '/' ? '' : '/'
					}${remoteFilename}`;
					
					// Create temporary file for the upload
					const binaryFile = await tmpFile({ prefix: 'n8n-ssh-tool-' });
					
					try {
						// Prepare the file content
						if (uploadSource === 'binaryData') {
							// From binary data
							const binaryInputField = this.getNodeParameter('binaryInputField', itemIndex) as string;
							const binaryData = this.helpers.assertBinaryData(itemIndex, binaryInputField);
							
							let uploadData: Buffer | Readable;
							if (binaryData.id) {
								uploadData = await this.helpers.getBinaryStream(binaryData.id);
							} else {
								uploadData = Buffer.from(binaryData.data, BINARY_ENCODING);
							}
							
							await writeFile(binaryFile.path, uploadData);
						} else {
							// From text content
							const fileContent = this.getNodeParameter('fileContent', itemIndex) as string;
							await writeFile(binaryFile.path, fileContent);
						}
						
						// Upload the file
						await ssh.putFile(binaryFile.path, remotePath);
						
						// Return success
						returnData.push({
							json: {
								success: true,
								operation: 'uploadFile',
								remotePath,
							},
						});
					} finally {
						await binaryFile.cleanup();
					}
				}
			} finally {
				// Always close the SSH connection
				ssh.dispose();
			}
			
			return [returnData];
		} catch (error) {
			if (this.continueOnFail()) {
				return [
					[
						{
							json: {
								success: false,
								error: error.message,
							},
						},
					],
				];
			}
			throw error;
		}
	}
} 