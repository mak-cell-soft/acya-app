import urllib.request
import urllib.error
import json
import os
import ssl

def get_secret():
    with open('/home/ubuntu/acya-app/.env', 'r') as f:
        for line in f:
            if line.startswith('AI_SERVICE_SECRET='):
                return line.strip().split('=', 1)[1]
    raise Exception("AI_SERVICE_SECRET not found in .env")

def make_request(url, headers):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            return status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        return e.code, body
    except Exception as e:
        return 0, str(e)

def run_tests():
    secret = get_secret()
    base_url = "https://socofeb.acya.site/api/ai"
    
    print("=== 1. SECURITY TESTS ===")
    # A. Missing secret
    status_missing, _ = make_request(f"{base_url}/tenant-info", {"X-Tenant-Slug": "socofeb"})
    print(f"A. Missing X-AI-Secret: HTTP {status_missing} (Expected: 401)")
    assert status_missing == 401, f"Expected 401, got {status_missing}"
    
    # B. Invalid secret
    status_invalid, _ = make_request(f"{base_url}/tenant-info", {
        "X-Tenant-Slug": "socofeb",
        "X-AI-Secret": "INVALID_TEST_SECRET_VALUE"
    })
    print(f"B. Invalid X-AI-Secret: HTTP {status_invalid} (Expected: 401)")
    assert status_invalid == 401, f"Expected 401, got {status_invalid}"
    
    print("\n=== 2. LIVE ENDPOINT TESTS (VALID SECRET) ===")
    # C. Tenant Info
    status_tenant, body_tenant = make_request(f"{base_url}/tenant-info", {
        "X-Tenant-Slug": "socofeb",
        "X-AI-Secret": secret
    })
    print(f"1. GET /api/ai/tenant-info: HTTP {status_tenant}")
    assert status_tenant == 200, f"Expected 200, got {status_tenant}: {body_tenant}"
    tenant_data = json.loads(body_tenant)
    print(f"   Tenant: {tenant_data.get('companyName')}, Slug: {tenant_data.get('tenantSlug')}, Currency: {tenant_data.get('currency')}")
    
    # D. Product Search
    status_search, body_search = make_request(f"{base_url}/products/search?query=MDF&limit=10", {
        "X-Tenant-Slug": "socofeb",
        "X-AI-Secret": secret
    })
    print(f"2. GET /api/ai/products/search?query=MDF&limit=10: HTTP {status_search}")
    assert status_search == 200, f"Expected 200, got {status_search}: {body_search}"
    products = json.loads(body_search)
    print(f"   Products found: {len(products)}")
    
    product_id = None
    if len(products) > 0:
        first_prod = products[0]
        product_id = first_prod.get('id')
        print(f"   Sample Product: ID={product_id}, Ref={first_prod.get('reference')}, Name={first_prod.get('name')}")
    else:
        # Fallback search without filter to get any active product
        status_search_all, body_search_all = make_request(f"{base_url}/products/search?query=a&limit=5", {
            "X-Tenant-Slug": "socofeb",
            "X-AI-Secret": secret
        })
        prods_all = json.loads(body_search_all)
        if len(prods_all) > 0:
            product_id = prods_all[0].get('id')
            print(f"   Fallback Product: ID={product_id}, Ref={prods_all[0].get('reference')}")
            
    assert product_id is not None, "At least one product must exist for testing"
    
    # E. Product Details
    status_details, body_details = make_request(f"{base_url}/products/{product_id}", {
        "X-Tenant-Slug": "socofeb",
        "X-AI-Secret": secret
    })
    print(f"3. GET /api/ai/products/{product_id}: HTTP {status_details}")
    assert status_details == 200, f"Expected 200, got {status_details}"
    prod_detail = json.loads(body_details)
    print(f"   Details: Ref={prod_detail.get('reference')}, Unit={prod_detail.get('unit')}, IsWood={prod_detail.get('isWood')}")
    
    # F. Product Price
    status_price, body_price = make_request(f"{base_url}/products/{product_id}/price", {
        "X-Tenant-Slug": "socofeb",
        "X-AI-Secret": secret
    })
    print(f"4. GET /api/ai/products/{product_id}/price: HTTP {status_price}")
    assert status_price == 200, f"Expected 200, got {status_price}"
    price_data = json.loads(body_price)
    print(f"   Price: SellHT={price_data.get('sellPriceHT')}, TVA={price_data.get('tvaRate')}%, SellTTC={price_data.get('sellPriceTTC')}, Currency={price_data.get('currency')}")
    # Verify confidential data is NOT present
    for confidential_field in ['buyPriceHT', 'buyPriceTTC', 'buyPrice', 'margin', 'profitMargin', 'cost']:
        assert confidential_field not in price_data, f"Confidential field {confidential_field} exposed in price response!"
    print("   Confidential price fields absent: VERIFIED")
    
    # G. Product Availability
    status_avail, body_avail = make_request(f"{base_url}/products/{product_id}/availability", {
        "X-Tenant-Slug": "socofeb",
        "X-AI-Secret": secret
    })
    print(f"5. GET /api/ai/products/{product_id}/availability: HTTP {status_avail}")
    assert status_avail == 200, f"Expected 200, got {status_avail}"
    avail_data = json.loads(body_avail)
    print(f"   Availability: isAvailable={avail_data.get('isAvailable')}, stockStatus={avail_data.get('stockStatus')}, Unit={avail_data.get('unit')}")
    
    print("\nALL LIVE API AND SECURITY TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
