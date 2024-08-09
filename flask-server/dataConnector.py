import random
import string
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from credentials import uri, dbName


class DataConnector:
    def __init__(self):
        self.__mg_client = None
        self.__connectMongo()

    def __connectMongo(self):
        if self.__mg_client == None:
            self.__mg_client = MongoClient(uri, server_api=ServerApi('1'))
            self.__mg_db = self.__mg_client[dbName]
            self.__mg_nodes = self.__mg_db["nodes"]
            self.__mg_edges = self.__mg_db["edges"]
            self.__mg_nodes.create_index("text", unique=True)
            self.__mg_edges.create_index("st_id", unique=True)

    def dropAll(self):
        self.__mg_nodes.delete_many({})
        self.__mg_edges.delete_many({})

    def pushManyWords(self, wordsList):
        self.__connectMongo()
        try:
            self.__mg_nodes.insert_many([{"text" : w} for w in wordsList])
            return True
        except Exception as e:
            print(e)
            return False

    def pushManyEdges(self, edgesList, edgeType):
        self.__connectMongo()
        try:
            self.__mg_edges.insert_many([
                {
                    "source" : source, 
                    "target" : target, 
                    "st_id" : source + " " + target + " " + edgeType,
                    "edgeType" : edgeType
                } for source, target in edgesList
            ])
            return True
        except Exception as e:
            print(e)
            return False

    def getAllWords(self):
        self.__connectMongo()
        return [d["text"] for d in self.__mg_nodes.find()]
    
    def getAllEdges(self):
        self.__connectMongo()
        return [(d["source"], d["target"]) for d in self.__mg_edges.find()]

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

