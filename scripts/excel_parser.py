import os
import json
import requests
import pandas as pd
from io import BytesIO
from datetime import datetime

def load_links():
    with open('data/immigration_data_links.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['files']

def download_excel(url):
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return BytesIO(resp.content)

def parse_entry_visas_xlsx(file_stream):
    # Замени на нужный лист и структуру!
    xl = pd.ExcelFile(file_stream)
    # В большинстве файлов gov.uk лист с данными называется 'Data' или подобно
    for sheet in xl.sheet_names:
        if 'data' in sheet.lower():
            df = xl.parse(sheet)
            break
        else:
            df = xl.parse(xl.sheet_names[0])
    # Фильтрация и преобразование под нужный формат (пример)
    # Ожидается, что столбцы содержат "Year", "Quarter", "Visa Type", "Nationality", "Value"
    keep_cols = [c for c in df.columns if any(x in c.lower() for x in ['year','quart','type','nation','value','issued'])]
    df = df[keep_cols]
    return df

def main():
    all_data = []
    files = load_links()
    for fileinfo in files:
        print(f"[i] Fetching: {fileinfo['title']}")
        try:
            xls_stream = download_excel(fileinfo['url'])
            df = parse_entry_visas_xlsx(xls_stream)
            df['Source file'] = fileinfo['title']
            df['Fetched at'] = fileinfo['fetched']
            all_data.append(df)
        except Exception as ex:
            print(f"[!] Failed {fileinfo['title']}: {ex}")
    # Объединить все таблицы
    if all_data:
        big = pd.concat(all_data, ignore_index=True)
        os.makedirs('data', exist_ok=True)
        big.to_csv('data/visas_flat.csv', index=False, encoding='utf-8-sig')
        print('[✓] Saved data/visas_flat.csv')
    else:
        print('[X] No data parsed!')

if __name__ == '__main__':
    main()
