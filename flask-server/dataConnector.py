import random
import string
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from credentials import uri


class DataConnector:
    def __init__(self):
        self.client = None
        self.connectMongo()

    def connectMongo(self):
        if self.client == None:
            self.client = MongoClient(uri, server_api=ServerApi('1'))
            try:
                self.client.admin.command('ping')
                print("Pinged your deployment. You successfully connected to MongoDB!")
            except Exception as e:
                print(e)


    def generate_random_string(self, min_length=3, max_length=20):
        length = random.randint(min_length, max_length)
        characters = string.ascii_lowercase
        return ''.join(random.choice(characters) for _ in range(length))

    def getRandStrAndLinks(self, n = 50, e = 150, enableSelfEdge = False):
        words = [self.generate_random_string() for i in range(n)]
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

    def constructNodes(self, wordsList, edgesList):
        return {
            "nodes" : [
                {
                    "id" : w,
                    "group" : random.randint(1,9),
                    "description" : " ".join(self.generate_random_string(2, 20) for s in range(30))
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

