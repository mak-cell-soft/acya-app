import json
with open("/tmp/nodes.json") as f:
    nodes = json.load(f)
m = [n for n in nodes if n.get("name") == "@n8n/n8n-nodes-langchain.memoryBufferWindow"]
if m:
    for p in m[0].get("properties", []):
        if p.get("name") == "sessionIdType":
            print(json.dumps(p.get("options"), indent=2))
