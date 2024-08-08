import random
import string
import json


def generate_random_string(min_length=3, max_length=12):
    length = random.randint(min_length, max_length)
    characters = string.ascii_lowercase
    return ''.join(random.choice(characters) for _ in range(length))

def getRandStrAndLinks(n = 200, e = 1000):
    words = [generate_random_string() for i in range(n)]
    nodes = [{
        "id" : w,
        "group" : random.randint(1,9)
    } for w in words]
    links, linkSet = [], set()
    for _ in range(e):
        i, loopLimit = 0, 5
        while i < loopLimit: 
            source, target = random.randint(0, n), random.randint(0, n)
            if not any(edge in linkSet for edge in [(source, target), (target, source)]): break
            i += 1
        links.append({
            "source" : random.choice(words),
            "target" : random.choice(words), 
            "value" : random.randint(1, 13)
        })
        linkSet.add((source, target))
    return {
        "nodes" : nodes,
        "links" : links
    }