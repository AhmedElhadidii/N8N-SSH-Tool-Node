/**
 * Format a private key to ensure it's in the correct format for SSH connections
 */
export function formatPrivateKey(privateKey: string): string {
	// If the key already starts with '-----BEGIN', it's properly formatted
	if (privateKey.startsWith('-----BEGIN')) {
		return privateKey;
	}

	// Otherwise, add the OpenSSH header and footer
	return `-----BEGIN OPENSSH PRIVATE KEY-----\n${privateKey}\n-----END OPENSSH PRIVATE KEY-----`;
} 