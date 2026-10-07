import secrets
import os
import json
import subprocess

def configure():
    env_path = '/home/ubuntu/acya-app/.env'
    workflow_path = '/home/ubuntu/acya-app/scripts/n8n/socofeb_p1_integration_test.json'
    
    # Generate 256-bit cryptographically secure random token (43-44 chars base64url)
    secret_value = secrets.token_urlsafe(32)
    
    # 1. Update .env
    with open(env_path, 'r') as f:
        env_lines = f.readlines()
        
    has_secret = False
    new_lines = []
    for line in env_lines:
        if line.startswith('AI_SERVICE_SECRET='):
            new_lines.append(f'AI_SERVICE_SECRET={secret_value}\n')
            has_secret = True
        else:
            new_lines.append(line)
            
    if not has_secret:
        if new_lines and not new_lines[-1].endswith('\n'):
            new_lines[-1] += '\n'
        new_lines.append('\n# AI Sales Agent Integration Secret\n')
        new_lines.append(f'AI_SERVICE_SECRET={secret_value}\n')
        
    with open(env_path, 'w') as f:
        f.writelines(new_lines)
    os.chmod(env_path, 0o600)
    print("Configured AI_SERVICE_SECRET in .env successfully (secret redacted)")
    
    # 2. Update workflow JSON with the same secret in Simulation Input
    with open(workflow_path, 'r') as f:
        workflow_data = json.load(f)
        
    for node in workflow_data['nodes']:
        if node.get('id') == 'e002-set-input':
            str_values = node.get('parameters', {}).get('values', {}).get('string', [])
            found = False
            for v in str_values:
                if v.get('name') == 'aiSecret':
                    v['value'] = secret_value
                    found = True
            if not found:
                str_values.append({'name': 'aiSecret', 'value': secret_value})
                
    with open(workflow_path, 'w') as f:
        json.dump(workflow_data, f, indent=2)
    print("Updated workflow JSON with matching secret (secret redacted)")

if __name__ == '__main__':
    configure()
