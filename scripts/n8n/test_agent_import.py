import json

test_wf = {
  "id": "TestAgentImport",
  "name": "Test Agent Import",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [-600, 0],
      "id": "t-001",
      "name": "When clicking ‘Execute workflow’"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "Hello test",
        "options": {
          "systemMessage": "You are a helpful assistant."
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [-300, 0],
      "id": "t-002",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "model": {
          "__rl": True,
          "mode": "list",
          "value": "gpt-4o"
        },
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1.2,
      "position": [-300, 200],
      "id": "t-003",
      "name": "OpenAI Chat Model",
      "credentials": {
        "openAiApi": {
          "id": "qw8s8R2QNerWTt1T",
          "name": "OpenAI account"
        }
      }
    }
  ],
  "connections": {
    "When clicking ‘Execute workflow’": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}

with open('/tmp/test_agent_wf.json', 'w') as f:
    json.dump(test_wf, f, indent=2)
print('Generated test agent workflow')
