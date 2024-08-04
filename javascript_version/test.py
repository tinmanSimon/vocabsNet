
import random
import string
import json

def generate_random_string(min_length=3, max_length=12):
    length = random.randint(min_length, max_length)
    characters = string.ascii_lowercase
    return ''.join(random.choice(characters) for _ in range(length))

n = 200
words = [generate_random_string() for i in range(n)]
nodes = [{
    "id" : w,
    "group" : random.randint(1,9)
} for w in words]
e = 1000
links = [{
    "source" : random.choice(words),
    "target" : random.choice(words), 
    "value" : random.randint(1, 13)
} for _ in range(e)]

with open('test.json', 'w') as fp:
    json.dump({
    "nodes" : nodes,
    "links" : links
}, fp)