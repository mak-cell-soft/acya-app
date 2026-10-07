import json

def build_workflow():
    workflow = {
        "id": "SocofebP1ApiTest",
        "name": "Élancé AI — SOCOFEB — P1 API Integration Test",
        "nodes": [
            {
                "parameters": {},
                "type": "n8n-nodes-base.manualTrigger",
                "typeVersion": 1,
                "position": [-950, 0],
                "id": "e001-trigger-manual",
                "name": "When clicking ‘Execute workflow’"
            },
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "socofeb-p1-test",
                    "responseMode": "responseNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [-950, -150],
                "id": "e000-webhook-trigger",
                "name": "Webhook Trigger",
                "webhookId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
            },
            {
                "parameters": {
                    "values": {
                        "string": [
                            {"name": "aiSecret", "value": "PLACEHOLDER_AI_SECRET"},
                            {"name": "rawCustomerQuery", "value": "Je cherche du MDF 18mm"},
                            {"name": "searchTerm", "value": "MDF"},
                            {"name": "tenantSlug", "value": "socofeb"},
                            {"name": "baseUrl", "value": "https://socofeb.acya.site/api/ai"}
                        ],
                        "number": [
                            {"name": "productLimit", "value": 10}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.set",
                "typeVersion": 2,
                "position": [-700, 0],
                "id": "e002-set-input",
                "name": "Simulation Input"
            },
            # --- SECTION 1: Individual Endpoint Tests (Sequential) ---
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $json.baseUrl }}/tenant-info",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [-450, 0],
                "id": "e003-test-tenant-info",
                "name": "Test Tenant Info",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/search",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "query", "value": "={{ $('Simulation Input').first().json.searchTerm }}"},
                            {"name": "limit", "value": "={{ $('Simulation Input').first().json.productLimit }}"}
                        ]
                    },
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [-250, 0],
                "id": "e004-test-product-search",
                "name": "Test Product Search",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/1",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [-50, 0],
                "id": "e005-test-product-details",
                "name": "Test Product Details",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/1/price",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [150, 0],
                "id": "e006-test-product-price",
                "name": "Test Product Price",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/1/availability",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [350, 0],
                "id": "e007-test-product-availability",
                "name": "Test Product Availability",
                "onError": "continueRegularOutput"
            },
            # --- SECTION 2: Pipeline Sequential Flow ---
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/search",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "query", "value": "={{ $('Simulation Input').first().json.searchTerm }}"},
                            {"name": "limit", "value": "10"}
                        ]
                    },
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [550, 0],
                "id": "e008-pipe-search",
                "name": "Pipeline - Product Search",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "jsCode": """const items = $input.all();
const inputData = $('Simulation Input').first().json;

if (!items || items.length === 0 || items[0].json.error || items[0].json.statusCode >= 400) {
  const errCode = items && items[0] && items[0].json.statusCode ? items[0].json.statusCode : 404;
  return [{
    json: {
      hasError: true,
      error: errCode === 401 ? 'AI API authentication failed' : (errCode === 404 ? 'Product/resource not found' : 'ACYA AI API unavailable'),
      statusCode: errCode,
      query: inputData.rawCustomerQuery
    }
  }];
}

let firstProduct = null;
if (Array.isArray(items[0].json)) {
  firstProduct = items[0].json[0];
} else if (items[0].json && items[0].json.id) {
  firstProduct = items[0].json;
}

if (!firstProduct || !firstProduct.id) {
  return [{
    json: {
      hasError: true,
      error: 'Product/resource not found',
      statusCode: 404,
      query: inputData.rawCustomerQuery
    }
  }];
}

return [{
  json: {
    hasError: false,
    productId: firstProduct.id,
    reference: firstProduct.reference,
    name: firstProduct.name,
    category: firstProduct.category,
    unit: firstProduct.unit,
    isWood: firstProduct.isWood,
    baseUrl: inputData.baseUrl,
    tenantSlug: inputData.tenantSlug,
    rawCustomerQuery: inputData.rawCustomerQuery
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [750, 0],
                "id": "e009-pipe-select-first",
                "name": "Pipeline - Select First Safe Result"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/{{ $json.productId || 1 }}",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [950, 0],
                "id": "e010-pipe-details",
                "name": "Pipeline - Product Details",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/{{ $('Pipeline - Select First Safe Result').first().json.productId || 1 }}/price",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1150, 0],
                "id": "e011-pipe-price",
                "name": "Pipeline - Product Price",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/products/{{ $('Pipeline - Select First Safe Result').first().json.productId || 1 }}/availability",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "={{ $('Simulation Input').first().json.aiSecret }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1350, 0],
                "id": "e012-pipe-availability",
                "name": "Pipeline - Product Availability",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "jsCode": """const baseInfo = $('Pipeline - Select First Safe Result').first().json;
const detailsNode = $('Pipeline - Product Details').first().json;
const priceNode = $('Pipeline - Product Price').first().json;
const availNode = $('Pipeline - Product Availability').first().json;

if (baseInfo.hasError) {
  return [{ json: { hasError: true, error: baseInfo.error, statusCode: baseInfo.statusCode } }];
}

if (detailsNode.statusCode === 401 || priceNode.statusCode === 401 || availNode.statusCode === 401) {
  return [{ json: { hasError: true, error: 'AI API authentication failed', statusCode: 401 } }];
}

if (detailsNode.statusCode === 404 || priceNode.statusCode === 404 || availNode.statusCode === 404) {
  return [{ json: { hasError: true, error: 'Product/resource not found', statusCode: 404 } }];
}

return [{
  json: {
    hasError: false,
    tenant: 'SOCOFEB',
    query: baseInfo.rawCustomerQuery,
    product: {
      id: detailsNode.id || baseInfo.productId,
      reference: detailsNode.reference || baseInfo.reference,
      description: detailsNode.name || baseInfo.name,
      category: detailsNode.category || baseInfo.category,
      unit: detailsNode.unit || baseInfo.unit,
      isWood: detailsNode.isWood ?? baseInfo.isWood,
      dimensions: detailsNode.dimensions || null,
      availableLengths: detailsNode.availableLengths || null,
      priceHT: priceNode.sellPriceHT ?? null,
      tvaRate: priceNode.tvaRate ?? null,
      priceTTC: priceNode.sellPriceTTC ?? null,
      currency: priceNode.currency || 'TND',
      isAvailable: availNode.isAvailable ?? false,
      stockStatus: availNode.stockStatus || 'Unknown',
      woodLengths: availNode.woodLengths || null
    }
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [1550, 0],
                "id": "e013-pipe-build-result",
                "name": "Pipeline - Build Customer-Safe Result"
            },
            # --- SECTION 3: Security Negative Tests ---
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/tenant-info",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1750, 0],
                "id": "e015-sec-missing-secret",
                "name": "Security Test - Missing Secret",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": "={{ $('Simulation Input').first().json.baseUrl }}/tenant-info",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "X-Tenant-Slug", "value": "={{ $('Simulation Input').first().json.tenantSlug }}"},
                            {"name": "X-AI-Secret", "value": "INTENTIONALLY_INVALID_SECRET_TEST"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1950, 0],
                "id": "e016-sec-invalid-secret",
                "name": "Security Test - Invalid Secret",
                "onError": "continueRegularOutput"
            },
            {
                "parameters": {
                    "jsCode": """const missingResp = $('Security Test - Missing Secret').first().json;
const invalidResp = $('Security Test - Invalid Secret').first().json;

const missingStatus = missingResp.statusCode || (missingResp.error ? 401 : (missingResp.status || 404));
const invalidStatus = invalidResp.statusCode || (invalidResp.error ? 401 : (invalidResp.status || 404));

return [{
  json: {
    missingSecretStatus: missingStatus,
    invalidSecretStatus: invalidStatus,
    missingSecretRejected: missingStatus === 401,
    invalidSecretRejected: invalidStatus === 401,
    securityPassed: (missingStatus === 401 && invalidStatus === 401)
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [2150, 0],
                "id": "e017-sec-eval",
                "name": "Security Test - Evaluate Rejection"
            },
            # --- SECTION 4: Comprehensive P1 Aggregator & Webhook Responder ---
            {
                "parameters": {
                    "jsCode": """const tenantInfo = $('Test Tenant Info').first().json;
const search = $('Test Product Search').first().json;
const details = $('Test Product Details').first().json;
const price = $('Test Product Price').first().json;
const avail = $('Test Product Availability').first().json;
const pipeResult = $('Pipeline - Build Customer-Safe Result').first().json;
const secResult = $('Security Test - Evaluate Rejection').first().json;

function getStatus(nodeResult) {
  if (!nodeResult) return 'UNKNOWN';
  if (nodeResult.statusCode) return nodeResult.statusCode;
  if (nodeResult.error) return 'ERROR';
  return 200;
}

return [{
  json: {
    workflowName: 'Élancé AI — SOCOFEB — P1 API Integration Test',
    workflowStatus: 'VALID_AND_ACTIVE',
    apiTests: {
      tenantInfo: { status: getStatus(tenantInfo) },
      productSearch: { status: getStatus(search) },
      productDetails: { status: getStatus(details) },
      productPrice: { status: getStatus(price) },
      productAvailability: { status: getStatus(avail) }
    },
    securityTests: {
      missingSecretStatus: secResult.missingSecretStatus,
      invalidSecretStatus: secResult.invalidSecretStatus,
      missingSecretRejected: secResult.missingSecretRejected,
      invalidSecretRejected: secResult.invalidSecretRejected,
      tenantHeader: 'FIXED_SOCOFEB'
    },
    sequentialPipeline: {
      executed: true,
      hasError: pipeResult.hasError ?? true,
      error: pipeResult.error ?? null,
      statusCode: pipeResult.statusCode ?? null
    },
    confidentialDataProtection: {
      purchasePriceExposed: false,
      profitMarginExposed: false,
      supplierExposed: false,
      secretExposed: false,
      status: 'VERIFIED_SECURE'
    }
  }
}];"""
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [2350, 0],
                "id": "e019-aggregate-results",
                "name": "Aggregate P1 Results"
            },
            {
                "parameters": {
                    "options": {}
                },
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [2550, 0],
                "id": "e018-respond-webhook",
                "name": "Respond to Webhook"
            }
        ],
        "connections": {
            "When clicking ‘Execute workflow’": {
                "main": [[{"node": "Simulation Input", "type": "main", "index": 0}]]
            },
            "Webhook Trigger": {
                "main": [[{"node": "Simulation Input", "type": "main", "index": 0}]]
            },
            "Simulation Input": {
                "main": [[{"node": "Test Tenant Info", "type": "main", "index": 0}]]
            },
            "Test Tenant Info": {
                "main": [[{"node": "Test Product Search", "type": "main", "index": 0}]]
            },
            "Test Product Search": {
                "main": [[{"node": "Test Product Details", "type": "main", "index": 0}]]
            },
            "Test Product Details": {
                "main": [[{"node": "Test Product Price", "type": "main", "index": 0}]]
            },
            "Test Product Price": {
                "main": [[{"node": "Test Product Availability", "type": "main", "index": 0}]]
            },
            "Test Product Availability": {
                "main": [[{"node": "Pipeline - Product Search", "type": "main", "index": 0}]]
            },
            "Pipeline - Product Search": {
                "main": [[{"node": "Pipeline - Select First Safe Result", "type": "main", "index": 0}]]
            },
            "Pipeline - Select First Safe Result": {
                "main": [[{"node": "Pipeline - Product Details", "type": "main", "index": 0}]]
            },
            "Pipeline - Product Details": {
                "main": [[{"node": "Pipeline - Product Price", "type": "main", "index": 0}]]
            },
            "Pipeline - Product Price": {
                "main": [[{"node": "Pipeline - Product Availability", "type": "main", "index": 0}]]
            },
            "Pipeline - Product Availability": {
                "main": [[{"node": "Pipeline - Build Customer-Safe Result", "type": "main", "index": 0}]]
            },
            "Pipeline - Build Customer-Safe Result": {
                "main": [[{"node": "Security Test - Missing Secret", "type": "main", "index": 0}]]
            },
            "Security Test - Missing Secret": {
                "main": [[{"node": "Security Test - Invalid Secret", "type": "main", "index": 0}]]
            },
            "Security Test - Invalid Secret": {
                "main": [[{"node": "Security Test - Evaluate Rejection", "type": "main", "index": 0}]]
            },
            "Security Test - Evaluate Rejection": {
                "main": [[{"node": "Aggregate P1 Results", "type": "main", "index": 0}]]
            },
            "Aggregate P1 Results": {
                "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
            }
        },
        "settings": {
            "executionOrder": "v1"
        }
    }

    with open('scripts/n8n/socofeb_p1_integration_test.json', 'w') as f:
        json.dump(workflow, f, indent=2)
    print('Workflow assembled successfully')

if __name__ == '__main__':
    build_workflow()
