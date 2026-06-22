import json

log_path = r'C:\Users\Vishwas shetty\.gemini\antigravity-ide\brain\d8badc80-a4fa-4036-9443-d1170c40afda\.system_generated\logs\transcript.jsonl'
with open(log_path, encoding='utf-8') as f:
    for line in reversed(list(f)):
        if '"type":"USER_INPUT"' in line and 'Fix TelegramChannels' in line:
            obj = json.loads(line)
            with open('user_request.txt', 'w', encoding='utf-8') as out:
                out.write(obj['content'])
            break
