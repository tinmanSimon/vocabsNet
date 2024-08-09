import random
import string


def generate_random_string(min_length=3, max_length=12):
    length = random.randint(min_length, max_length)
    characters = string.ascii_lowercase
    return ''.join(random.choice(characters) for _ in range(length))

def getRandStrAndLinks(n = 50, e = 150, enableSelfEdge = False):
    words = [generate_random_string() for i in range(n)]
    edges, edgeSet = [], set()
    for _ in range(e):
        i, loopLimit = 0, 50
        while i < loopLimit: 
            source, target = random.randint(0, n - 1), random.randint(0, n - 1)
            if (source, target) not in edgeSet and (target, source) not in edgeSet: 
                if source != target or enableSelfEdge: break
            i += 1
        edges.append((words[source], words[target]))
        edgeSet.add((source, target))
    return [words, edges]

def constructNodes(wordsList, edgesList):
    return {
        "nodes" : [
            {
                "id" : w,
                "group" : random.randint(1,9),
                "description" : " ".join(generate_random_string(2, 15) for s in range(30))
            } for w in wordsList
        ],
        "links" : [
            {
                "source" : source,
                "target" : target,
                "value" : random.randint(1, 13)
            } for source, target in edgesList
        ]
    } 

