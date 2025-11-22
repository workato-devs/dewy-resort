#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

import shutil

load_dotenv('../.env')

API_TOKEN = os.getenv('WORKATO_API_TOKEN')
HOST = os.getenv('WORKATO_HOST')

folders = ['Salesforce', 'atomic-salesforce-recipes', 'atomic-stripe-recipes', 'orchestrator-recipes']
# folders = ['orchestrator-recipes', 'atomic-stripe-recipes', 'atomic-salesforce-recipes', 'Salesforce', 'temp']

headers = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json'
}

for folder in folders:
    os.system(f'workato init --profile default --region custom --non-interactive --project-name {folder} --api-url {HOST} 2>/dev/null || true')
    
    if os.path.exists(f'../workato/{folder}'):
        shutil.copytree(f'../workato/{folder}', folder, dirs_exist_ok=True)
        print(f"Copied recipes to {folder}")
        os.system(f'cd {folder} && workato push')
    
    response = requests.post(
        f'{HOST}/api/folders',
        headers=headers,
        json={'name': folder}
    )
    print(f"Created {folder}: {response.status_code}")
