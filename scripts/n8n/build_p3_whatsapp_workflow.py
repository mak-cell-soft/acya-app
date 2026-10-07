import json
import os

def build_workflow():
    api_base = "https://socofeb.acya.site/api/ai"
    
    # Exact P2-validated system prompt preserved without alteration
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
        "id": "SocofebP3WhatsAppAgent",
        "name": "Élancé AI — SOCOFEB — WhatsApp Production Agent",
        "nodes": [
            # 1. Webhook Trigger for socofeb-whatsapp (supports GET verification and POST events)
            {
                "parameters": {
                    "httpMethod": ["GET", "POST"],
                    "path": "socofeb-whatsapp",
                    "responseMode": "responseNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [-1100, 0],
                "id": "p3-000-webhook",
                "name": "WhatsApp Webhook Trigger",
                "webhookId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb7f"
            },
            # 2. Inbound Dispatcher & Normalization Node
            {
                "parameters": {
                    "jsCode": f"""const req = $input.first().json;
const query = req.query || {{}};
const body = req.body || {{}};
const headers = req.headers || {{}};

// -------------------------------------------------------------
// Case 1: Meta Webhook GET Verification Challenge
// -------------------------------------------------------------
if (query['hub.mode'] === 'subscribe') {{
  const configuredToken = $env.WHATSAPP_VERIFY_TOKEN;
  const incomingToken = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (configuredToken && incomingToken === configuredToken) {{
    return [{{
      json: {{
        shouldCallAi: false,
        responseMode: 'verification',
        challenge: challenge,
        statusCode: 200
      }}
    }}];
  }} else {{
    return [{{
      json: {{
        shouldCallAi: false,
        responseMode: 'forbidden',
        statusCode: 403
      }}
    }}];
  }}
}}

// -------------------------------------------------------------
// Case 2: Inbound POST Event Handling
// -------------------------------------------------------------
if (body.object && body.object !== 'whatsapp_business_account') {{
  return [{{
    json: {{
      shouldCallAi: false,
      responseMode: 'ack',
      reason: 'ignored_non_whatsapp',
      statusCode: 200
    }}
  }}];
}}

const entry = body.entry?.[0] || {{}};
const change = entry.changes?.[0] || {{}};
const value = change.value || body.value || body;

// Subcase 2.1: Status Updates (sent, delivered, read) -> Ack & ignore
if (value.statuses && value.statuses.length > 0) {{
  return [{{
    json: {{
      shouldCallAi: false,
      responseMode: 'ack',
      reason: 'status_update',
      statuses: value.statuses,
      statusCode: 200
    }}
  }}];
}}

// Subcase 2.2: Messages
const messages = value.messages || [];
if (!messages || messages.length === 0) {{
  return [{{
    json: {{
      shouldCallAi: false,
      responseMode: 'ack',
      reason: 'no_messages',
      statusCode: 200
    }}
  }}];
}}

const msg = messages[0];
const wamid = msg.id || 'wa_msg_' + Date.now();
const messageType = msg.type || 'text';

// Extract Contact & Identity
const contacts = value.contacts || [];
const contact = contacts[0] || {{}};
const customerName = contact.profile?.name || msg.from_name || 'Client WhatsApp';

// Normalize Phone Number to E.164 (+216XXXXXXXX)
let rawFrom = String(msg.from || '');
let digits = rawFrom.replace(/\\D/g, '');
let customerPhone = '';
if (digits.startsWith('216') && digits.length === 11) {{
  customerPhone = '+' + digits;
}} else if (digits.length === 8) {{
  customerPhone = '+216' + digits;
}} else if (digits.startsWith('00216')) {{
  customerPhone = '+' + digits.slice(2);
}} else if (digits.length > 0) {{
  customerPhone = '+' + digits;
}} else {{
  customerPhone = '+21699000001';
}}

const phoneNumberId = value.metadata?.phone_number_id || 'phone_id_simulated';
const wabaId = entry.id || 'waba_id_simulated';
const sessionId = 'socofeb_wa_' + customerPhone;

// Subcase 2.3: Non-text message (image, audio, video, sticker, location, etc.)
if (messageType !== 'text') {{
  return [{{
    json: {{
      shouldCallAi: false,
      responseMode: 'unsupported_media',
      wamid: wamid,
      customerPhone: customerPhone,
      customerName: customerName,
      phoneNumberId: phoneNumberId,
      sessionId: sessionId,
      messageType: messageType,
      statusCode: 200,
      fallbackMessage: 'عذرًا، المساعد الذكي لـ SOCOFEB يدعم الرسائل النصية فقط في الوقت الحالي. يرجى كتابة استفسارك نصيًا لمساعدتك.'
    }}
  }}];
}}

// Subcase 2.4: Standard text message -> Forward to AI Agent
const customerMessage = msg.text?.body || '';

return [{{
  json: {{
    shouldCallAi: true,
    wamid: wamid,
    customerPhone: customerPhone,
    customerName: customerName,
    customerMessage: customerMessage,
    phoneNumberId: phoneNumberId,
    wabaId: wabaId,
    sessionId: sessionId,
    promptText: '[Client : ' + customerName + ' | Tél : ' + customerPhone + '] ' + customerMessage
  }}
}}];
"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [-850, 0],
                "id": "p3-001-dispatcher",
                "name": "Normalize & Dispatch Request"
            },
            # 3. Router If Node (shouldCallAi)
            {
                "parameters": {
                    "options": {},
                    "conditions": {
                        "options": {
                            "version": 3,
                            "leftValue": "",
                            "caseSensitive": True,
                            "typeValidation": "strict"
                        },
                        "combinator": "and",
                        "conditions": [
                            {
                                "id": "cond-ai",
                                "leftValue": "={{ $json.shouldCallAi }}",
                                "rightValue": True,
                                "operator": {
                                    "type": "boolean",
                                    "operation": "true",
                                    "singleValue": True
                                }
                            }
                        ]
                    }
                },
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.3,
                "position": [-550, 0],
                "id": "p3-002-if-ai",
                "name": "Should Call AI?"
            },
            # 3b. Atomic Claim wamid in PostgreSQL
            {
                "parameters": {
                    "operation": "executeQuery",
                    "query": """INSERT INTO idempotency.whatsapp_messages (
    tenant,
    wamid,
    customer_phone,
    received_at,
    expires_at,
    status
)
VALUES (
    $1,
    $2,
    $3,
    NOW(),
    NOW() + INTERVAL '24 hours',
    'processing'
)
ON CONFLICT (tenant, wamid) DO NOTHING
RETURNING wamid;""",
                    "options": {
                        "queryReplacement": "={{ ['socofeb', $('Normalize & Dispatch Request').first().json.wamid, $('Normalize & Dispatch Request').first().json.customerPhone] }}"
                    }
                },
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.5,
                "position": [-350, 200],
                "id": "p3-002b-claim-wamid",
                "name": "Claim wamid — PostgreSQL",
                "credentials": {
                    "postgres": {
                        "id": "SocofebIdempotencyPostgres",
                        "name": "SOCOFEB Idempotency Postgres"
                    }
                }
            },
            # 3c. Evaluate wamid Claim Result
            {
                "parameters": {
                    "jsCode": """const pgResult = $input.first()?.json || {};
const originalData = $('Normalize & Dispatch Request').first()?.json || {};

// If atomic INSERT succeeded, wamid was returned
const isClaimGranted = Boolean(pgResult.wamid && pgResult.wamid === originalData.wamid);

return [{
  json: {
    ...originalData,
    isClaimGranted: isClaimGranted,
    claimStatus: isClaimGranted ? 'processing' : 'duplicate_ignored'
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [-150, 200],
                "id": "p3-002c-eval-claim",
                "name": "Evaluate wamid Claim"
            },
            # 3d. Check If Claim Was Granted
            {
                "parameters": {
                    "options": {},
                    "conditions": {
                        "options": {
                            "version": 3,
                            "leftValue": "",
                            "caseSensitive": True,
                            "typeValidation": "strict"
                        },
                        "combinator": "and",
                        "conditions": [
                            {
                                "id": "cond-claim-granted",
                                "leftValue": "={{ $json.isClaimGranted }}",
                                "rightValue": True,
                                "operator": {
                                    "type": "boolean",
                                    "operation": "true",
                                    "singleValue": True
                                }
                            }
                        ]
                    }
                },
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.3,
                "position": [50, 200],
                "id": "p3-002d-if-claim",
                "name": "Is Claim Granted?"
            },
            # 3e. Handle Duplicate wamid (Skip AI, Acknowledge Webhook)
            {
                "parameters": {
                    "jsCode": """const item = $input.first()?.json || {};

return [{
  json: {
    isDirectResponse: true,
    statusCode: 200,
    contentType: 'application/json',
    bodyText: JSON.stringify({
      status: 'ACKNOWLEDGED',
      reason: 'duplicate_wamid_ignored',
      wamid: item.wamid
    })
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [250, 400],
                "id": "p3-002e-dup-handler",
                "name": "Handle Duplicate wamid"
            },
            # 3f. Fast Early Webhook Acknowledgement (B4)
            {
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ JSON.stringify({ status: 'RECEIVED', wamid: $json.wamid }) }}",
                    "options": {
                        "responseCode": 200,
                        "responseHeaders": {
                            "entries": [
                                {
                                    "name": "Content-Type",
                                    "value": "application/json"
                                }
                            ]
                        }
                    }
                },
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [250, 100],
                "id": "p3-024-resp-early-ack",
                "name": "Respond to Webhook (Early Ack)"
            },
            # 4. Handle Non-AI Responses
            {
                "parameters": {
                    "jsCode": """const item = $input.first().json;
const mode = item.responseMode;

if (mode === 'verification') {
  return [{
    json: {
      isDirectResponse: true,
      statusCode: 200,
      contentType: 'text/plain',
      bodyText: item.challenge
    }
  }];
}

if (mode === 'forbidden') {
  return [{
    json: {
      isDirectResponse: true,
      statusCode: 403,
      contentType: 'text/plain',
      bodyText: 'Forbidden'
    }
  }];
}

if (mode === 'unsupported_media') {
  return [{
    json: {
      isDirectResponse: false,
      customerMessage: '[Message non-texte: ' + (item.messageType || 'media') + ']',
      aiResponse: {
        message: item.fallbackMessage,
        action: 'reply',
        handoff: false,
        reason: null,
        products: []
      },
      meta: {
        tenant: 'socofeb',
        status: 'UNSUPPORTED_MEDIA',
        customerPhone: item.customerPhone,
        customerName: item.customerName,
        phoneNumberId: item.phoneNumberId,
        wamid: item.wamid
      }
    }
  }];
}

// Default: ack / duplicate / status update
return [{
  json: {
    isDirectResponse: true,
    statusCode: 200,
    contentType: 'application/json',
    bodyText: JSON.stringify({ status: 'ACKNOWLEDGED', reason: item.reason, wamid: item.wamid })
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [-250, -200],
                "id": "p3-003-non-ai-handler",
                "name": "Handle Non-AI Responses"
            },
            # 5. Check Direct Response If Node
            {
                "parameters": {
                    "options": {},
                    "conditions": {
                        "options": {
                            "version": 3,
                            "leftValue": "",
                            "caseSensitive": True,
                            "typeValidation": "strict"
                        },
                        "combinator": "and",
                        "conditions": [
                            {
                                "id": "cond-direct",
                                "leftValue": "={{ $json.isDirectResponse }}",
                                "rightValue": True,
                                "operator": {
                                    "type": "boolean",
                                    "operation": "true",
                                    "singleValue": True
                                }
                            }
                        ]
                    }
                },
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.3,
                "position": [50, -200],
                "id": "p3-004-if-direct",
                "name": "Is Direct Response?"
            },
            # 6. Respond Direct (Challenge / Ack / Forbidden)
            {
                "parameters": {
                    "respondWith": "text",
                    "responseBody": "={{ $json.bodyText }}",
                    "options": {
                        "responseCode": "={{ $json.statusCode }}",
                        "responseHeaders": {
                            "entries": [
                                {"name": "Content-Type", "value": "={{ $json.contentType || 'text/plain' }}"}
                            ]
                        }
                    }
                },
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [350, -300],
                "id": "p3-005-resp-direct",
                "name": "Respond Direct"
            },
            # 7. SOCOFEB AI Sales Agent (Locked P2 Logic)
            {
                "parameters": {
                    "promptType": "define",
                    "text": "={{ $('Normalize & Dispatch Request').first().json.promptText }}",
                    "hasOutputParser": False,
                    "options": {
                        "systemMessage": system_prompt
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.agent",
                "typeVersion": 3.1,
                "position": [-200, 300],
                "id": "p3-007-agent",
                "name": "SOCOFEB AI Sales Agent"
            },
            # 8. OpenAI Chat Model
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
                "position": [-350, 550],
                "id": "p3-008-model",
                "name": "OpenAI Chat Model",
                "credentials": {
                    "openAiApi": {
                        "id": "qw8s8R2QNerWTt1T",
                        "name": "OpenAI account"
                    }
                }
            },
            # 9. Memory Buffer Window
            {
                "parameters": {
                    "sessionIdType": "customKey",
                    "sessionKey": "={{ $('Normalize & Dispatch Request').first().json.sessionId }}",
                    "contextWindowLength": 5
                },
                "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
                "typeVersion": 1.3,
                "position": [-150, 550],
                "id": "p3-009-memory",
                "name": "Window Buffer Memory"
            },
            # Tool 1: search_products
            {
                "parameters": {
                    "toolDescription": "Search products in the SOCOFEB catalog by keywords or reference (e.g. MDF, Chêne, mélaminé). Returns customer-safe product list.",
                    "method": "GET",
                    "url": f"{api_base}/products/search?query={{query}}&limit=10",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"}
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
                "position": [0, 550],
                "id": "p3-010-tool-search",
                "name": "search_products",
                "credentials": {
                    "httpHeaderAuth": {
                        "id": "AcyaAiServiceAuth",
                        "name": "ACYA AI Service Header Auth"
                    }
                }
            },
            # Tool 2: get_product_details
            {
                "parameters": {
                    "toolDescription": "Get complete technical dimensions, thickness, width, length and details of a specific SOCOFEB product by its numeric ID.",
                    "method": "GET",
                    "url": f"{api_base}/products/{{id}}",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"}
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
                "position": [200, 550],
                "id": "p3-011-tool-details",
                "name": "get_product_details",
                "credentials": {
                    "httpHeaderAuth": {
                        "id": "AcyaAiServiceAuth",
                        "name": "ACYA AI Service Header Auth"
                    }
                }
            },
            # Tool 3: get_product_price
            {
                "parameters": {
                    "toolDescription": "Get official customer selling price (SellPriceHT, TVA, SellPriceTTC) in TND for a SOCOFEB product by its numeric ID. Never invents prices.",
                    "method": "GET",
                    "url": f"{api_base}/products/{{id}}/price",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"}
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
                "position": [400, 550],
                "id": "p3-012-tool-price",
                "name": "get_product_price",
                "credentials": {
                    "httpHeaderAuth": {
                        "id": "AcyaAiServiceAuth",
                        "name": "ACYA AI Service Header Auth"
                    }
                }
            },
            # Tool 4: get_product_availability
            {
                "parameters": {
                    "toolDescription": "Check stock availability and quantities across SOCOFEB sales sites for a product by its numeric ID.",
                    "method": "GET",
                    "url": f"{api_base}/products/{{id}}/availability",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"}
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
                "position": [600, 550],
                "id": "p3-013-tool-avail",
                "name": "get_product_availability",
                "credentials": {
                    "httpHeaderAuth": {
                        "id": "AcyaAiServiceAuth",
                        "name": "ACYA AI Service Header Auth"
                    }
                }
            },
            # Tool 5: get_company_info
            {
                "parameters": {
                    "toolDescription": "Get public business information for SOCOFEB: company name, address, phone number, email, currency.",
                    "method": "GET",
                    "url": f"{api_base}/tenant-info",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"}
                        ]
                    }
                },
                "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
                "typeVersion": 1.1,
                "position": [800, 550],
                "id": "p3-014-tool-tenant",
                "name": "get_company_info",
                "credentials": {
                    "httpHeaderAuth": {
                        "id": "AcyaAiServiceAuth",
                        "name": "ACYA AI Service Header Auth"
                    }
                }
            },
            # Tool 6: escalate_to_human_seller
            {
                "parameters": {
                    "toolDescription": "Notify the SOCOFEB human sales team when human intervention, custom quotation, negotiation, or complaint handling is needed.",
                    "method": "POST",
                    "url": f"{api_base}/handoff",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "parametersHeaders": {
                        "values": [
                            {"name": "X-Tenant-Slug", "valueProvider": "fieldValue", "value": "socofeb"},
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
                "position": [1000, 550],
                "id": "p3-015-tool-handoff",
                "name": "escalate_to_human_seller",
                "credentials": {
                    "httpHeaderAuth": {
                        "id": "AcyaAiServiceAuth",
                        "name": "ACYA AI Service Header Auth"
                    }
                }
            },
            # 10. Format AI Response (Parses AI JSON output)
            {
                "parameters": {
                    "jsCode": """const rawText = $input.first().json.output || $input.first().json.text || '';
const norm = $('Normalize & Dispatch Request').first().json;
let parsed = null;

try {
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

return [{
  json: {
    customerMessage: norm.customerMessage,
    aiResponse: {
      message: parsed.message || rawText,
      action: parsed.action || "reply",
      handoff: Boolean(parsed.handoff),
      reason: parsed.reason || null,
      products: parsed.products || []
    },
    meta: {
      tenant: "socofeb",
      status: "SUCCESS",
      customerPhone: norm.customerPhone,
      customerName: norm.customerName,
      phoneNumberId: norm.phoneNumberId,
      wamid: norm.wamid
    }
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [150, 300],
                "id": "p3-016-format-response",
                "name": "Format AI Response"
            },
            # 11. Prepare Outbound WhatsApp Message
            {
                "parameters": {
                    "jsCode": """const item = $input.first().json;
const aiMsg = item.aiResponse?.message || 'Merci pour votre message.';
const meta = item.meta || {};

// Sanitize message: limit length to 4096 chars, remove leading/trailing extra whitespace
let cleanText = String(aiMsg).trim();
if (cleanText.length > 4096) {
  cleanText = cleanText.substring(0, 4090) + '...';
}

// Construct Meta Graph API payload
const metaOutboundPayload = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: meta.customerPhone ? meta.customerPhone.replace(/\\+/g, '') : '',
  type: "text",
  text: {
    preview_url: false,
    body: cleanText
  }
};

return [{
  json: {
    ...item,
    outboundPayload: metaOutboundPayload,
    outboundStatus: "PREPARED_FOR_DISPATCH"
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [450, 200],
                "id": "p3-017-outbound-prep",
                "name": "Format Outbound Message"
            },
            # 12. Dispatch Outbound Message (Simulated in P3.2-A, Live in P3.2-B)
            {
                "parameters": {
                    "jsCode": """const item = $input.first().json;

// In P3.2-A (Simulation mode), we validate the contract and record simulated delivery.
// In P3.2-B, real Graph API call is made via HTTP Request Node with configured credentials.
item.outboundStatus = "SIMULATED_SUCCESS";

return [{ json: item }];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [700, 200],
                "id": "p3-018-dispatch-node",
                "name": "Dispatch Outbound Message"
            },
            # 12b. Update Status to Completed in PostgreSQL
            {
                "parameters": {
                    "operation": "executeQuery",
                    "query": """UPDATE idempotency.whatsapp_messages
SET status = 'completed'
WHERE tenant = $1 AND wamid = $2;""",
                    "options": {
                        "queryReplacement": "={{ ['socofeb', $('Normalize & Dispatch Request').first().json.wamid] }}"
                    }
                },
                "type": "n8n-nodes-base.postgres",
                "typeVersion": 2.5,
                "position": [950, 200],
                "id": "p3-018b-update-completed",
                "name": "Update Status — Completed",
                "credentials": {
                    "postgres": {
                        "id": "SocofebIdempotencyPostgres",
                        "name": "SOCOFEB Idempotency Postgres"
                    }
                }
            }
        ],
        "connections": {
            "WhatsApp Webhook Trigger": {
                "main": [
                    [{"node": "Normalize & Dispatch Request", "type": "main", "index": 0}],
                    [{"node": "Normalize & Dispatch Request", "type": "main", "index": 0}]
                ]
            },
            "Normalize & Dispatch Request": {
                "main": [
                    [{"node": "Should Call AI?", "type": "main", "index": 0}]
                ]
            },
            "Should Call AI?": {
                "main": [
                    # Output 0 (True: Inbound message -> claim wamid first)
                    [{"node": "Claim wamid — PostgreSQL", "type": "main", "index": 0}],
                    # Output 1 (False: non-AI or direct response)
                    [{"node": "Handle Non-AI Responses", "type": "main", "index": 0}]
                ]
            },
            "Claim wamid — PostgreSQL": {
                "main": [
                    [{"node": "Evaluate wamid Claim", "type": "main", "index": 0}]
                ]
            },
            "Evaluate wamid Claim": {
                "main": [
                    [{"node": "Is Claim Granted?", "type": "main", "index": 0}]
                ]
            },
            "Is Claim Granted?": {
                "main": [
                    # Output 0 (True: claim granted -> early ack)
                    [{"node": "Respond to Webhook (Early Ack)", "type": "main", "index": 0}],
                    # Output 1 (False: duplicate -> direct ack)
                    [{"node": "Handle Duplicate wamid", "type": "main", "index": 0}]
                ]
            },
            "Respond to Webhook (Early Ack)": {
                "main": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "main", "index": 0}]
                ]
            },
            "Handle Duplicate wamid": {
                "main": [
                    [{"node": "Respond Direct", "type": "main", "index": 0}]
                ]
            },
            "Handle Non-AI Responses": {
                "main": [
                    [{"node": "Is Direct Response?", "type": "main", "index": 0}]
                ]
            },
            "Is Direct Response?": {
                "main": [
                    # Output 0 (True: direct challenge or ack)
                    [{"node": "Respond Direct", "type": "main", "index": 0}],
                    # Output 1 (False: unsupported media message)
                    [{"node": "Format Outbound Message", "type": "main", "index": 0}]
                ]
            },
            "OpenAI Chat Model": {
                "ai_languageModel": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_languageModel", "index": 0}]
                ]
            },
            "Window Buffer Memory": {
                "ai_memory": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_memory", "index": 0}]
                ]
            },
            "search_products": {
                "ai_tool": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]
                ]
            },
            "get_product_details": {
                "ai_tool": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]
                ]
            },
            "get_product_price": {
                "ai_tool": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]
                ]
            },
            "get_product_availability": {
                "ai_tool": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]
                ]
            },
            "get_company_info": {
                "ai_tool": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]
                ]
            },
            "escalate_to_human_seller": {
                "ai_tool": [
                    [{"node": "SOCOFEB AI Sales Agent", "type": "ai_tool", "index": 0}]
                ]
            },
            "SOCOFEB AI Sales Agent": {
                "main": [
                    [{"node": "Format AI Response", "type": "main", "index": 0}]
                ]
            },
            "Format AI Response": {
                "main": [
                    [{"node": "Format Outbound Message", "type": "main", "index": 0}]
                ]
            },
            "Format Outbound Message": {
                "main": [
                    [{"node": "Dispatch Outbound Message", "type": "main", "index": 0}]
                ]
            },
            "Dispatch Outbound Message": {
                "main": [
                    [{"node": "Update Status — Completed", "type": "main", "index": 0}]
                ]
            },
            "Update Status — Completed": {
                "main": []
            }
        },
        "settings": {
            "executionOrder": "v1"
        }
    }

    out_path = '/home/ubuntu/acya-app/scripts/n8n/socofeb_p3_whatsapp_agent.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    print("P3 WhatsApp Workflow JSON generated successfully at", out_path)

if __name__ == '__main__':
    build_workflow()
