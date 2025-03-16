import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SshPasswordApi implements ICredentialType {
        name = 'sshPasswordApi';

        displayName = 'SSH Password';

        documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/ssh/';

        properties: INodeProperties[] = [
                {
                        displayName: 'Host',
                        name: 'host',
                        required: true,
                        type: 'string',
                        default: '',
                        placeholder: 'localhost',
                },
                {
                        displayName: 'Port',
                        name: 'port',
                        required: true,
                        type: 'number',
                        default: 22,
                },
                {
                        displayName: 'Username',
                        name: 'username',
                        type: 'string',
                        default: '',
                },
                {
                        displayName: 'Password',
                        name: 'password',
                        type: 'string',
                        typeOptions: {
                                password: true,
                        },
                        default: '',
                },
        ];
} 