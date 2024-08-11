import requests

word = "contemplative"
dictionaryUri = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
response = requests.get(dictionaryUri)

if response.status_code == 200:
    res = response.json()
    meanings = res[0]["meanings"]