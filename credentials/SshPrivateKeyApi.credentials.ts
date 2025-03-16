import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SshPrivateKeyApi implements ICredentialType {
        name = 'sshPrivateKeyApi';

        displayName = 'SSH Private Key';

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
                        displayName: 'Private Key',
                        name: 'privateKey',
                        type: 'string',
                        typeOptions: {
                                rows: 4,
                                password: true,
                        },
                        default: '',
                },
                {
                        displayName: 'Passphrase',
                        name: 'passphrase',
                        type: 'string',
                        default: '',
                        description: 'Passphase used to create the key, if no passphase was used leave empty',
                        typeOptions: { password: true },
                },
        ];
} 