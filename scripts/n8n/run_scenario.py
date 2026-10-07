import requests
import json
import subprocess
import sys
import time

def run_scenario(scenario_num, customer_message, session_id, customer_phone=None, customer_name=None):
    url = "http://127.0.0.1:5678/webhook/socofeb-p2-test"
    headers = {"Content-Type": "application/json"}
    payload = {
        "customerMessage": customer_message,
        "sessionId": session_id
    }
    if customer_phone:
        payload["customerPhone"] = customer_phone
    if customer_name:
        payload["customerName"] = customer_name
    
    t0 = time.time()
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=45)
        http_status = resp.status_code
        try:
            http_body = resp.json()
        except:
            http_body = resp.text
    except Exception as e:
        http_status = 500
        http_body = {"error": str(e)}
    duration = time.time() - t0

    # Query Postgres for the execution record
    cmd = [
        "sudo", "docker", "exec", "postgres-n8n", "psql", "-U", "n8n_user", "-d", "n8n_db", "-t", "-A", "-c",
        "SELECT id, status, EXTRACT(EPOCH FROM (\"stoppedAt\" - \"startedAt\")) FROM execution_entity WHERE \"workflowId\" = 'SocofebP2SalesAgent' ORDER BY \"startedAt\" DESC LIMIT 1;"
    ]
    exec_row = subprocess.check_output(cmd).decode('utf-8').strip().split('|')
    exec_id = int(exec_row[0]) if exec_row and exec_row[0] else None
    exec_status = exec_row[1] if len(exec_row) > 1 else "unknown"
    exec_duration = float(exec_row[2]) if len(exec_row) > 2 and exec_row[2] else duration

    # Query execution data for node runs and tool calls
    dump_cmd = [
        "sudo", "docker", "exec", "postgres-n8n", "psql", "-U", "n8n_user", "-d", "n8n_db", "-t", "-A", "-c",
        f"SELECT data FROM execution_data WHERE \"executionId\" = {exec_id};"
    ]
    raw_data = subprocess.check_output(dump_cmd).decode('utf-8', errors='ignore')
    
    # Accurate parsing via flatted
    parse_script = """
const { parse } = require('/usr/local/lib/node_modules/n8n/node_modules/flatted');
const fs = require('fs');
try {
  const d = parse(fs.readFileSync(0, 'utf-8'));
  const runData = d.resultData.runData || {};
  const toolNames = ['search_products', 'get_product_details', 'get_product_price', 'get_product_availability', 'get_company_info', 'escalate_to_human_seller'];
  const executed = [];
  for (const t of toolNames) {
    if (runData[t]) {
      const runs = runData[t].map(r => {
        let args = null;
        try {
          args = r.data?.main?.[0]?.[0]?.json || r.inputOverride;
        } catch(e) {}
        return {
          args: args,
          executionCount: r.executionCount
        };
      });
      executed.push({ tool: t, runs: runs, totalCalls: runData[t].length });
    }
  }
  const agentRuns = runData['SOCOFEB AI Sales Agent'] ? runData['SOCOFEB AI Sales Agent'].length : 1;
  const llmRuns = runData['OpenAI Chat Model'] ? runData['OpenAI Chat Model'].length : 1;
  console.log(JSON.stringify({ tools: executed, agentIterations: agentRuns, llmCalls: llmRuns }));
} catch(e) {
  console.log(JSON.stringify({ error: e.message, tools: [] }));
}
"""
    node_proc = subprocess.run(
        ['sudo', 'docker', 'exec', '-i', 'n8n', 'node', '-e', parse_script],
        input=raw_data,
        text=True,
        capture_output=True
    )
    
    detailed_tools = []
    agent_iterations = 1
    llm_calls = 1
    try:
        parsed_tools = json.loads(node_proc.stdout)
        detailed_tools = parsed_tools.get('tools', [])
        agent_iterations = parsed_tools.get('agentIterations', 1)
        llm_calls = parsed_tools.get('llmCalls', 1)
    except Exception as e:
        detailed_tools = [{"error": str(e), "raw": node_proc.stderr}]

    result = {
        "scenario": scenario_num,
        "sessionId": session_id,
        "customerMessage": customer_message,
        "executionId": exec_id,
        "executionStatus": exec_status,
        "httpStatus": http_status,
        "durationSeconds": round(exec_duration, 2),
        "agentIterations": agent_iterations,
        "llmCalls": llm_calls,
        "toolsInvoked": [t['tool'] for t in detailed_tools],
        "toolDetails": detailed_tools,
        "response": http_body
    }
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result

if __name__ == '__main__':
    sc_num = int(sys.argv[1])
    msg = sys.argv[2]
    sid = sys.argv[3]
    phone = sys.argv[4] if len(sys.argv) > 4 else None
    name = sys.argv[5] if len(sys.argv) > 5 else None
    run_scenario(sc_num, msg, sid, phone, name)
