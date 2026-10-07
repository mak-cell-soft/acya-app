import json
import os

def get_secret():
    with open('/home/ubuntu/acya-app/.env', 'r') as f:
        for line in f:
            if line.startswith('AI_SERVICE_SECRET='):
                return line.strip().split('=', 1)[1]
    raise Exception("AI_SERVICE_SECRET not found in .env")

def build_workflow():
    secret = get_secret()
    api_base = "https://socofeb.acya.site/api/ai"
    
    system_prompt = """Tu es l'assistant commercial digital officiel de SOCOFEB (Société de Commerce du Fer et du Bois).
Ton rôle est d'accueillir les clients, les conseiller sur les produits (bois, panneaux MDF, mélaminé, contreplaqué, etc.), vérifier les prix et disponibilités, et orienter vers un commercial humain quand c'est nécessaire.

RÈGLES FONDAMENTALES :
1. LANGUE ET STYLE :
- Si le client s'exprime en arabe / derja tunisienne : réponds naturellement en Derja tunisienne (ex : "عسلامة 👋 إي نعم، عنا...", "شنوّة تحب بالظبط ؟", "خليني نشوفلك le prix...").
- Si le client s'exprime en français : réponds en français professionnel, courtois et concis.
- Si le client mélange français et derja : mélange naturellement les deux comme un vendeur tunisien.
- Ne traduis JAMAIS en arabe littéraire rigide. Sois chaleureux, concis et serviable. Pas d'excès d'emojis.

2. ANTI-HALLUCINATION ABSOLUE :
- Tu ne dois JAMAIS inventer un produit, une référence, un prix, une disponibilité, une remise, un délai de livraison ou une politique commerciale.
- Pour TOUTE donnée factuelle sur les produits, le stock, les prix ou l'entreprise, utilise IMPÉRATIVEMENT les outils SOCOFEB :
  * search_products : pour chercher des produits dans le catalogue.
  * get_product_details : pour voir les dimensions (épaisseur, largeur, longueur, m3).
  * get_product_price : pour obtenir le prix de vente exact (SellPriceHT, TVA, SellPriceTTC).
  * get_product_availability : pour vérifier la disponibilité en stock (InStock/OutOfStock).
  * get_company_info : pour l'adresse, téléphone général, email ou coordonnées publiques de SOCOFEB UNIQUEMENT lors d'une demande purement informative sur l'entreprise (ex: "où êtes-vous situés ?", "quel est votre numéro de téléphone ?").
  * escalate_to_human_seller : pour notifier un commercial humain et déclencher le suivi commercial.
- Si un produit n'existe pas dans les résultats de recherche, dis poliment qu'il n'est pas disponible chez SOCOFEB. N'invente jamais un produit inexistant.

3. CONSEIL ET CLARIFICATION :
- Si la demande est vague ou ambiguë (ex: "bois pour cuisine", "je veux du bois"), pose d'abord une question de clarification utile (ex: demander le type : MDF brut, mélaminé, bois massif...) avant de recommander un produit.
- Quand plusieurs produits correspondent, propose au maximum 3 à 5 choix pertinents, ne déverse jamais tout le catalogue.

4. PRIX ET DISPONIBILITÉ :
- Ne donne JAMAIS un prix de mémoire sans appeler get_product_price.
- Ne donne JAMAIS une disponibilité sans appeler get_product_availability.
- N'expose jamais les coûts d'achat, marges ou fournisseurs.

5. NÉGOCIATION, REMISES ET ESCALADE COMMERCIALE (HANDOFF) — RÈGLE DE PRIORITÉ ABSOLUE :
- Tu ne négocies JAMAIS de remise de manière autonome.
- DEMANDE EXPLICITE D'UN CONTACT HUMAIN / COMMERCIAL = ESCALADE OBLIGATOIRE :
  Si le client demande explicitement à parler à un commercial, contacter un vendeur, être rappelé par un commercial ou parler à un humain (quelle que soit la langue : Derja, Français, Anglais, ou mélange) :
  * Exemples Derja / Arabe : "نحب نحكي مع commercial", "نحب واحد من commercial يكلمني", "نحب نحكي مع واحد", "خلّي commercial يتصل بيا", "نحب vendeur يكلمني"
  * Exemples Français : "Je veux parler à un commercial", "Je voudrais être contacté par un vendeur", "Je veux parler à quelqu'un", "Passez-moi un commercial"
  * Exemples Anglais / Mixte : "I want to talk to sales", "Can someone from sales contact me?"
  -> Dans TOUS ces cas, tu DOIS OBLIGATOIREMENT appeler l'outil `escalate_to_human_seller`.
  -> Tu ne dois JAMAIS appeler `get_company_info` comme substitut ! Donner le numéro ou l'email général de l'entreprise ne satisfait PAS une demande de parler à un commercial.
- RÈGLE DE PRIORITÉ : Demande de contact humain > Demande d'information d'entreprise.
  Si la demande combine les deux (ex: "Donnez-moi le numéro du commercial, je veux lui parler"), la demande de contact humain prévaut -> appelle `escalate_to_human_seller`.
- Si le client demande une remise (ex: "20% remise si je prends 100 pièces"), des conditions spéciales ou un devis sur mesure, appelle également `escalate_to_human_seller`.
- Si le client pose une question sur une politique non fournie par l'API (ex: livraison gratuite à Tunis), ne l'invente pas. Indique que tu transmets la demande à l'équipe commerciale et appelle `escalate_to_human_seller` si opportun.

6. FORMAT DE RÉPONSE OBLIGATOIRE ET COHÉRENCE DU SCHÉMA :
Tu dois TOUJOURS répondre sous forme d'un objet JSON strict valide avec la structure suivante :
{
  "message": "<ton message au client en français ou derja>",
  "action": "<reply | clarification | handoff>",
  "handoff": <true si escalade effectuée, sinon false>,
  "reason": <raison significative si handoff=true, sinon null>,
  "products": [<liste des identifiants ou références des produits mentionnés, ou tableau vide>]
}
RÈGLE DE COHÉRENCE STRICTE :
Lorsque `escalate_to_human_seller` est appelé pour une demande de contact commercial ou de remise :
- "action" DOIT être "handoff"
- "handoff" DOIT être true
- "reason" DOIT être une chaîne non-nulle et significative (ex: "Demande de contact commercial", "Demande de remise")
Ne renvoie JAMAIS "action": "handoff" avec "handoff": false ou "reason": null.
Important: Ne renvoie AUCUN texte en dehors du bloc JSON."""

    workflow = {
        "id": "SocofebP2SalesAgent",
        "name": "Élancé AI — SOCOFEB — P2 Sales Agent Test",
        "nodes": [
            {
                "parameters": {},
                "type": "n8n-nodes-base.manualTrigger",
                "typeVersion": 1,
                "position": [-900, 0],
                "id": "p2-001-manual",
                "name": "When clicking ‘Execute workflow’"
            },
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "socofeb-p2-test",
                    "responseMode": "responseNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [-900, -150],
                "id": "p2-000-webhook",
                "name": "Webhook Trigger",
                "webhookId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e"
            },
            {
                "parameters": {
                    "values": {
                        "string": [
                            {
                                "name": "customerMessage",
                                "value": "={{ $json.body?.customerMessage || $json.customerMessage || 'Bonjour, avez-vous du MDF 18mm ?' }}"
                            },
                            {
                                "name": "sessionId",
                                "value": "={{ $json.body?.sessionId || $json.sessionId || 'socofeb-test-session' }}"
                            },
                            {
                                "name": "customerPhone",
                                "value": "={{ $json.body?.customerPhone || $json.customerPhone || '' }}"
                            },
                            {
                                "name": "customerName",
                                "value": "={{ $json.body?.customerName || $json.customerName || '' }}"
                            },
                            {
                                "name": "promptText",
                                "value": "={{ ($json.body?.customerPhone || $json.customerPhone) ? ('[Client : ' + ($json.body?.customerName || $json.customerName || 'Client') + ' | Tel : ' + ($json.body?.customerPhone || $json.customerPhone) + '] ' + ($json.body?.customerMessage || $json.customerMessage)) : ($json.body?.customerMessage || $json.customerMessage || 'Bonjour, avez-vous du MDF 18mm ?') }}"
                            }
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.set",
                "typeVersion": 2,
                "position": [-650, -50],
                "id": "p2-002-input",
                "name": "Customer Input"
            },
            {
                "parameters": {
                    "promptType": "define",
                    "text": "={{ $('Customer Input').first().json.promptText }}",
                    "hasOutputParser": False,
                    "options": {
                        "systemMessage": system_prompt
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.agent",
                "typeVersion": 3.1,
                "position": [-350, -50],
                "id": "p2-003-agent",
                "name": "SOCOFEB AI Sales Agent"
            },
            {
                "parameters": {
                    "model": {
                        "__rl": True,
                        "mode": "list",
                        "value": "gpt-4o-mini"
                    },
                    "options": {
                        "temperature": 0.2
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
                "typeVersion": 1.2,
                "position": [-500, 200],
                "id": "p2-004-model",
                "name": "OpenAI Chat Model",
                "credentials": {
                    "openAiApi": {
                        "id": "qw8s8R2QNerWTt1T",
                        "name": "OpenAI account"
                    }
                }
            },
            {
                "parameters": {
                    "sessionIdType": "customKey",
                    "sessionKey": "={{ $('Customer Input').first().json.sessionId || 'socofeb-test-session' }}",
                    "contextWindowLength": 5
                },
                "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
                "typeVersion": 1.3,
                "position": [-300, 200],
                "id": "p2-005-memory",
                "name": "Window Buffer Memory"
            },
            # Tool 1: search_products
            {
                "parameters": {
                    "toolDescription": "Search products in the SOCOFEB catalog by keywords or reference (e.g. MDF, Chêne, mélaminé). Returns customer-safe product list.",
                    "method": "GET",
                    "url": f"{api_base}/products/search?query={{query}}&limit=10",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
                            {"name": "X-AI-Secret", "valueProvider": "fieldValue", "value": secret}
                        ]
                    },
                    "placeholderDefinitions": {
                        "values": [
                            {
                                "name": "query",
                                "description": "Search term or product keyword (e.g. MDF, 18mm, Kronospan)",
                                "type": "string"
                            }
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [-100, 200],
                "id": "p2-006-tool-search",
                "name": "search_products"
            },
            # Tool 2: get_product_details
            {
                "parameters": {
                    "toolDescription": "Get customer-safe details, dimensions, and specifications for a specific product ID.",
                    "method": "GET",
                    "url": f"{api_base}/products/{{id}}",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
                            {"name": "X-AI-Secret", "valueProvider": "fieldValue", "value": secret}
                        ]
                    },
                    "placeholderDefinitions": {
                        "values": [
                            {
                                "name": "id",
                                "description": "Numeric product ID",
                                "type": "number"
                            }
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [100, 200],
                "id": "p2-007-tool-details",
                "name": "get_product_details"
            },
            # Tool 3: get_product_price
            {
                "parameters": {
                    "toolDescription": "Get current customer selling price (SellPriceHT, TVA, SellPriceTTC, currency) for a product ID.",
                    "method": "GET",
                    "url": f"{api_base}/products/{{id}}/price",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
                            {"name": "X-AI-Secret", "valueProvider": "fieldValue", "value": secret}
                        ]
                    },
                    "placeholderDefinitions": {
                        "values": [
                            {
                                "name": "id",
                                "description": "Numeric product ID",
                                "type": "number"
                            }
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [300, 200],
                "id": "p2-008-tool-price",
                "name": "get_product_price"
            },
            # Tool 4: get_product_availability
            {
                "parameters": {
                    "toolDescription": "Get stock availability status (InStock / OutOfStock) and length details for a product ID.",
                    "method": "GET",
                    "url": f"{api_base}/products/{{id}}/availability",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
                            {"name": "X-AI-Secret", "valueProvider": "fieldValue", "value": secret}
                        ]
                    },
                    "placeholderDefinitions": {
                        "values": [
                            {
                                "name": "id",
                                "description": "Numeric product ID",
                                "type": "number"
                            }
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [500, 200],
                "id": "p2-009-tool-avail",
                "name": "get_product_availability"
            },
            # Tool 5: get_company_info
            {
                "parameters": {
                    "toolDescription": "Get public business information for SOCOFEB: company name, address, phone number, email, currency.",
                    "method": "GET",
                    "url": f"{api_base}/tenant-info",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
                            {"name": "X-AI-Secret", "valueProvider": "fieldValue", "value": secret}
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [700, 200],
                "id": "p2-010-tool-tenant",
                "name": "get_company_info"
            },
            # Tool 6: escalate_to_human_seller
            {
                "parameters": {
                    "toolDescription": "Notify the SOCOFEB human sales team when human intervention, custom quotation, negotiation, or complaint handling is needed.",
                    "method": "POST",
                    "url": f"{api_base}/handoff",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
                            {"name": "X-AI-Secret", "valueProvider": "fieldValue", "value": secret},
                            {"name": "Content-Type", "valueProvider": "fieldValue", "value": "application/json"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": '={"reason": "{reason}", "summary": "{summary}", "customerPhone": "{customerPhone}", "customerName": "{customerName}"}',
                    "placeholderDefinitions": {
                        "values": [
                            {"name": "reason", "description": "Reason for handoff (e.g. Demande de contact commercial, Demande de remise)", "type": "string"},
                            {"name": "summary", "description": "Summary of customer request", "type": "string"},
                            {"name": "customerPhone", "description": "Customer phone number (from customer context or message)", "type": "string"},
                            {"name": "customerName", "description": "Customer name if provided, otherwise empty", "type": "string"}
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [900, 200],
                "id": "p2-011-tool-handoff",
                "name": "escalate_to_human_seller"
            },
            # Post-processing: Parse structured response
            {
                "parameters": {
                    "jsCode": """const rawText = $input.first().json.output || $input.first().json.text || '';
let parsed = null;

try {
  // Extract JSON block if wrapped in markdown
  let clean = rawText.trim();
  const match = clean.match(/\\{[\\s\\S]*\\}/);
  if (match) {
    clean = match[0];
  }
  parsed = JSON.parse(clean);
} catch (e) {
  parsed = {
    message: rawText,
    action: "reply",
    handoff: false,
    reason: null,
    products: []
  };
}

// Ensure required fields
return [{
  json: {
    customerMessage: $('Customer Input').first().json.customerMessage,
    aiResponse: {
      message: parsed.message || rawText,
      action: parsed.action || "reply",
      handoff: Boolean(parsed.handoff),
      reason: parsed.reason || null,
      products: parsed.products || []
    },
    meta: {
      tenant: "socofeb",
      status: "SUCCESS"
    }
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [100, -50],
                "id": "p2-012-format",
                "name": "Format AI Response"
            },
            {
                "parameters": {
                    "options": {}
                },
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [350, -50],
                "id": "p2-013-respond",
                "name": "Respond to Webhook"
            }
        ],
        "connections": {
            "When clicking ‘Execute workflow’": {
                "main": [[{"node": "Customer Input", "type": "main", "index": 0}]]
            },
            "Webhook Trigger": {
                "main": [[{"node": "Customer Input", "type": "main", "index": 0}]]
            },
            "Customer Input": {
                "main": [[{"node": "SOCOFEB AI Sales Agent", "type": "main", "index": 0}]]
            },
            "SOCOFEB AI Sales Agent": {
                "main": [[{"node": "Format AI Response", "type": "main", "index": 0}]]
            },
            "Format AI Response": {
                "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
            },
            "OpenAI Chat Model": {
                "ai_languageModel": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_languageModel", "index": 0}]]
            },
            "Window Buffer Memory": {
                "ai_memory": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_memory", "index": 0}]]
            },
            "search_products": {
                "ai_tool": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]]
            },
            "get_product_details": {
                "ai_tool": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]]
            },
            "get_product_price": {
                "ai_tool": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]]
            },
            "get_product_availability": {
                "ai_tool": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]]
            },
            "get_company_info": {
                "ai_tool": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]]
            },
            "escalate_to_human_seller": {
                "ai_tool": [[{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]]
            }
        },
        "settings": {
            "executionOrder": "v1"
        }
    }

    with open('/home/ubuntu/acya-app/scripts/n8n/socofeb_p2_sales_agent.json', 'w') as f:
        json.dump(workflow, f, indent=2)
    print("P2 Workflow JSON generated successfully")

if __name__ == '__main__':
    build_workflow()
