import requests
import json
import time
import subprocess
import sys

BASE_URL = "http://127.0.0.1:5678/webhook/socofeb-whatsapp"
HEADERS = {"Content-Type": "application/json"}

def test_get_verification():
    print("\n--- Testing Webhook GET Verification Challenge ---")
    url = f"{BASE_URL}?hub.mode=subscribe&hub.verify_token=socofeb_wa_verify_token_2026&hub.challenge=test_challenge_998877"
    r = requests.get(url, timeout=10)
    print("Status Code:", r.status_code)
    print("Content-Type:", r.headers.get("Content-Type"))
    print("Response Body:", r.text)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.text == "test_challenge_998877", f"Expected challenge string, got {r.text}"
    print("✅ Webhook GET Verification Passed!")

def build_meta_payload(message_text, message_id, message_type="text", customer_phone="21699000001", customer_name="P3 Test Customer"):
    msg_obj = {
        "from": customer_phone,
        "id": message_id,
        "timestamp": str(int(time.time())),
        "type": message_type
    }
    if message_type == "text":
        msg_obj["text"] = {"body": message_text}
    else:
        msg_obj[message_type] = {"id": "media_mock_id_12345"}

    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "100200300400500",
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "21671856598",
                        "phone_number_id": "phone_id_socofeb_p3"
                    },
                    "contacts": [{
                        "profile": {"name": customer_name},
                        "wa_id": customer_phone
                    }],
                    "messages": [msg_obj]
                }
            }]
        }]
    }
    return payload

def run_scenario(scenario_id, title, message_text, message_id, message_type="text", customer_phone="21699000001", customer_name="P3 Test Customer"):
    print(f"\n=======================================================")
    print(f"Executing {scenario_id}: {title}")
    print(f"Message: {message_text} | Type: {message_type} | ID: {message_id}")
    print(f"=======================================================")
    
    payload = build_meta_payload(message_text, message_id, message_type, customer_phone, customer_name)
    t0 = time.time()
    resp = requests.post(BASE_URL, json=payload, headers=HEADERS, timeout=45)
    duration = time.time() - t0
    
    print(f"HTTP Status: {resp.status_code} (took {round(duration, 2)}s)")
    try:
        body = resp.json()
        print("Response:", json.dumps(body, indent=2, ensure_ascii=False))
    except:
        body = resp.text
        print("Response Text:", body)

    return {
        "scenario": scenario_id,
        "title": title,
        "httpStatus": resp.status_code,
        "duration": round(duration, 2),
        "response": body
    }

def run_all_scenarios():
    test_get_verification()
    
    scenarios = [
        ("P3-01", "French MDF search", "Bonjour, avez-vous du MDF 18mm disponible ?", "wamid.P3_SCENARIO_01", "text"),
        ("P3-02", "Derja stock question", "عسلامة، عندكم MDF 18mm ؟", "wamid.P3_SCENARIO_02", "text"),
        ("P3-03", "Price question", "شحال سوم MDF 18mm ؟", "wamid.P3_SCENARIO_03", "text"),
        ("P3-04", "Ambiguous request", "نحب خشب لل cuisine.", "wamid.P3_SCENARIO_04", "text"),
        ("P3-05", "Non-existent product", "Vous avez du produit XYZ-DOES-NOT-EXIST ?", "wamid.P3_SCENARIO_05", "text"),
        ("P3-06", "Explicit human request", "نحب نحكي مع commercial.", "wamid.P3_SCENARIO_06", "text"),
        ("P3-07", "Company info question", "وين موجودين؟", "wamid.P3_SCENARIO_07", "text"),
        ("P3-08", "Unsupported delivery policy", "Vous livrez gratuitement à Tunis ?", "wamid.P3_SCENARIO_08", "text"),
        ("P3-09", "Duplicate wamid idempotency", "Bonjour, avez-vous du MDF 18mm disponible ?", "wamid.P3_SCENARIO_01", "text"),
        ("P3-10", "Unsupported media type", "", "wamid.P3_SCENARIO_10", "image")
    ]
    
    results = []
    for sc_id, title, text, msg_id, mtype in scenarios:
        res = run_scenario(sc_id, title, text, msg_id, mtype)
        results.append(res)
        time.sleep(1)
        
    print("\n=======================================================")
    print("ALL P3 SIMULATION SCENARIOS COMPLETE")
    print("=======================================================")
    with open('/home/ubuntu/acya-app/scripts/n8n/p3_simulation_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("Results saved to /home/ubuntu/acya-app/scripts/n8n/p3_simulation_results.json")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'verify':
        test_get_verification()
    else:
        run_all_scenarios()
