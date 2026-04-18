#!/usr/bin/env python3
"""
hololive TCG 卡牌資料爬蟲
從官方網站抓取卡牌資訊並轉換為 JSON 格式
"""

import json
import re
import sys
from typing import Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

# 官方卡牌列表頁面
OFFICIAL_CARDLIST_URL = "https://hololive-official-cardgame.com/cardlist/"

# 系列頁面（需要從卡牌列表頁面抓取）
SERIES_BASE_URL = "https://hololive-official-cardgame.com/cardlist/cardsearch/"

# 稀有度對應
RARITY_MAP = {
    'C': 'C',
    'U': 'U', 
    'R': 'R',
    'SR': 'SR',
    'UC': 'UC',
    'CP': 'CP',
    'コモン': 'C',
    'アンコモン': 'U',
    'レア': 'R',
    'スーパーレア': 'SR',
    'ウルトラレア': 'UC',
    'キャンペーンプロモ': 'CP',
}

def fetch_url(url: str) -> str:
    """抓取網頁內容"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        }
        req = Request(url, headers=headers)
        with urlopen(req, timeout=30) as response:
            return response.read().decode('utf-8')
    except URLError as e:
        print(f"Error fetching {url}: {e}")
        return ""

def extract_series_links(html: str) -> List[Dict[str, str]]:
    """從卡牌列表頁面提取系列連結"""
    series_list = []
    
    # 匹配系列連結的格式
    pattern = r'href="(/cardlist/cardsearch/\?expansion=[^"]+)"[^>]*>([^<]+)</a>'
    matches = re.findall(pattern, html)
    
    for match in matches:
        url_path = match[0]
        name = match[1].strip()
        
        # 提取系列代碼
        code_match = re.search(r'expansion=([^&"]+)', url_path)
        if code_match:
            code = code_match.group(1)
            series_list.append({
                'code': code,
                'name': name,
                'url': f"https://hololive-official-cardgame.com{url_path}"
            })
    
    return series_list

def extract_cards_from_series(html: str, series_code: str, series_name: str) -> List[Dict]:
    """從系列頁面提取卡牌資訊"""
    cards = []
    
    # 匹配卡牌卡號和名稱
    # 格式通常是: <div class="card-item"> 或類似的結構
    card_pattern = r'カード番号[^:]*：\s*([^\s<]+)|card-number|([hH][aA][sS][0-9]+-[0-9]+)'
    
    # 嘗試不同的匹配模式
    patterns = [
        r'([hH][aA][sS]\d+-\d+)',  # 卡號格式
        r'カード番号[^:]*：\s*([^\s<]+)',  # 日文格式
        r'card-number[^:]*:\s*([^\s<]+)',  # 英文格式
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, html)
        for match in matches:
            if isinstance(match, tuple):
                card_number = next((m for m in match if m), None)
            else:
                card_number = match
            
            if card_number:
                cards.append({
                    'cardNumber': card_number,
                    'series': series_name,
                    'seriesCode': series_code,
                })
    
    return cards

def main():
    """主程式"""
    print("開始抓取 hololive TCG 卡牌資料...")
    
    # 1. 抓取卡牌列表頁面
    print(f"抓取卡牌列表頁面: {OFFICIAL_CARDLIST_URL}")
    cardlist_html = fetch_url(OFFICIAL_CARDLIST_URL)
    
    if not cardlist_html:
        print("無法抓取卡牌列表頁面")
        return
    
    # 2. 提取系列資訊
    series_list = extract_series_links(cardlist_html)
    print(f"找到 {len(series_list)} 個系列")
    
    if not series_list:
        print("找不到任何系列")
        return
    
    # 3. 抓取每個系列的卡牌
    all_cards = []
    
    for series in series_list[:5]:  # 先抓取前5個系列（避免太多）
        print(f"\n抓取系列: {series['name']} ({series['code']})")
        print(f"URL: {series['url']}")
        
        series_html = fetch_url(series['url'])
        if series_html:
            cards = extract_cards_from_series(series_html, series['code'], series['name'])
            all_cards.extend(cards)
            print(f"  找到 {len(cards)} 張卡牌")
    
    # 4. 輸出結果
    output = {
        'version': '1.0.0',
        'lastUpdated': '2026-04-19',
        'source': 'hololive-official-cardgame.com',
        'series': series_list,
        'cards': all_cards,
    }
    
    # 寫入 JSON 檔案
    output_file = 'hololive-cards-raw.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n完成！已儲存到 {output_file}")
    print(f"總共 {len(all_cards)} 張卡牌")

if __name__ == '__main__':
    main()
