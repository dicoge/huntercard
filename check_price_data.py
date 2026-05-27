import json

with open('data/yuyu-prices/yuyu-prices.json') as f:
    data = json.load(f)

prices = data.get('prices', {})
print(f'Total price entries: {len(prices)}')
keys = list(prices.keys())
print('First 20 keys:', keys[:20])
lower_count = sum(1 for k in keys if k == k.lower())
upper_count = sum(1 for k in keys if k == k.upper())
mixed_count = sum(1 for k in keys if k != k.lower() and k != k.upper())
print(f'All-lowercase: {lower_count}, All-uppercase: {upper_count}, Mixed: {mixed_count}')
sample = [k for k in keys if k.startswith('hbp') or k.startswith('hBP') or k.startswith('HBP')]
print('Sample hBP keys:', sample[:10])
test_id = 'HBP04-001'
print(f'Does \"{test_id.lower()}\" exist in prices? {test_id.lower() in prices}')
print(f'Does \"{test_id}\" exist in prices? {test_id in prices}')
