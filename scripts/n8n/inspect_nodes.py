import json

with open('/tmp/nodes.json', 'r') as f:
    nodes = json.load(f)

targets = [
    '@n8n/n8n-nodes-langchain.agent',
    '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    '@n8n/n8n-nodes-langchain.toolHttpRequest',
    '@n8n/n8n-nodes-langchain.toolCode',
    '@n8n/n8n-nodes-langchain.memoryBufferWindow'
]

for name in targets:
    m = [n for n in nodes if n.get('name') == name]
    if m:
        node = m[0]
        print(f"Node: {name}, defaultVersion: {node.get('defaultVersion')}")
        # print inputs
        print(f"  inputs: {node.get('inputs')}")
        print(f"  outputs: {node.get('outputs')}")
