import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
from urllib.parse import urljoin

DATA_FILE = 'data/immigration_data_links.json'
BASE_URL = 'https://www.gov.uk'
TARGET_URL = 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables#entry-clearance-visas-granted-outside-the-uk'


def scrape_gov_uk():
    response = requests.get(TARGET_URL, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')

    files = []
    for link in soup.find_all('a'):
        href = link.get('href', '')
        text = link.get_text(strip=True)
        if not href:
            continue
        # Только Excel-файлы с въездными визами
        if any(x in text.lower() for x in ['entry clearance visa', 'entry clearance visas', 'detailed entry clearance']):
            if href.endswith('.xlsx') or href.endswith('.xls'):
                full_url = urljoin(BASE_URL, href)
                files.append({
                    'title': text,
                    'url': full_url,
                    'fetched': datetime.now().isoformat()
                })

    return files


def load_existing_links():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'files': [], 'last_updated': None}


def save_links(data):
    os.makedirs('data', exist_ok=True)
    data['last_updated'] = datetime.now().isoformat()
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    prev = load_existing_links()
    new_files = scrape_gov_uk()
    existing_urls = {f['url'] for f in prev.get('files', [])}
    new_urls = {f['url'] for f in new_files}
    if new_urls != existing_urls:
        print('[✓] New data found, updating list')
        save_links({'files': new_files, 'last_updated': datetime.now().isoformat()})
    else:
        print('[i] No new data files detected')

if __name__ == '__main__':
    main()
