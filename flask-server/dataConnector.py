import random
import string
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from credentials import uri, dbName
import json
from datetime import datetime
from collections import defaultdict
import requests

class DataConnector:
    def __init__(self):
        self.__mg_client = None
        self.__connectMongo()
        self.__dictionaryUri = "https://api.dictionaryapi.dev/api/v2/entries/en/"
        self.__descriptionDict = {}
        self.__fieldOfView = 0
        self.__defaultFov = 200

    def __connectMongo(self):
        if self.__mg_client == None:
            self.__mg_client = MongoClient(uri, server_api=ServerApi('1'))
            self.__mg_db = self.__mg_client[dbName]
            self.__mg_nodes = self.__mg_db["nodes"]
            self.__mg_edges = self.__mg_db["edges"]
            self.__mg_metas = self.__mg_db["metas"]
            self.__mg_nodes.create_index("text", unique=True)
            self.__mg_edges.create_index("st_id", unique=True)
            self.__mg_metas.create_index("key", unique=True)

    def getDefinitions(self, wordStr):
        uri = self.__dictionaryUri + wordStr
        response = requests.get(uri)
        meanings = []
        if response.status_code == 200:
            res = response.json()
            meanings = res[0]["meanings"]
        definition = ""
        for meaning in meanings:
            definition += meaning["partOfSpeech"] + ":\n"
            for i, dictDef in enumerate(meaning["definitions"]):
                definition += f"{str(i + 1)}. {dictDef["definition"]}\n" 
        return definition

    def dropAll(self):
        self.__mg_nodes.delete_many({})
        self.__mg_edges.delete_many({})

    def pushManyWords(self, wordsList):
        self.__connectMongo()
        words = [{"text" : w, "definition" : ""} for w in wordsList]
        for w in words:
            w["definition"] = self.getDefinitions(w["text"])
            self.__descriptionDict[w["text"]] = w["definition"]
        try:
            self.__mg_nodes.insert_many(words)
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
        
    def dropManyWords(self, wordsList):
        self.__connectMongo()
        try:
            self.__mg_nodes.delete_many({"text" : {"$in" : wordsList}})
            self.__mg_edges.delete_many({
                "$or": [
                    {"source" : {"$in" : wordsList}},
                    {"target" : {"$in" : wordsList}}
                ]
            })
            return True
        except Exception as e:
            print(e)
            return False
        
    def dropManyEdges(self, edgesList, edgeType):
        self.__connectMongo()
        try:
            self.__mg_edges.delete_many({
                "st_id" : {"$in" : [source + " " + target + " " + edgeType for source, target in edgesList]}
            })
            return True
        except Exception as e:
            print(e)
            return False

    def getAllWords(self):
        self.__connectMongo()
        wordList = []
        for d in self.__mg_nodes.find():
            wordList.append(d)
            self.__descriptionDict[d["text"]] = d["definition"]
        return wordList
    
    def getCachedDescription(self, word):
        return self.__descriptionDict[word] if word in self.__descriptionDict else ""

    def getAllEdges(self):
        self.__connectMongo()
        edgeMap = defaultdict(set)
        for edge in self.__mg_edges.find():
            source, target, edgeType = edge["source"], edge["target"], edge["edgeType"]
            if (source, target) in edgeMap[edgeType] or (target, source) in edgeMap[edgeType]:
                continue 
            edgeMap[edgeType].add((source, target))
        return edgeMap

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

    def constructNodes(self, wordsList, edgeMap, focusNode = ""):
        return {
            "nodes" : [
                {
                    "id" : w,
                    "group" : random.randint(1,9),
                    "description" : self.__descriptionDict[w] if w in self.__descriptionDict else ""
                } for w in wordsList
            ],
            "links" : [{
                "source" : source,
                "target" : target,
                "value" : edgeType
            } for edgeType, edges in edgeMap.items() for source, target in edges],
            "focusNode" : focusNode
        } 
    
    def setAndPushFieldOfView(self, n):
        if n <= 0:
            print(f"Error: trying to set field of view of {n} which is <= 0!")
            return
        self.__mg_metas.update_one({"key" : {"$eq" : 'field_of_view'}}, {"$set": {'value': n}}, upsert=True)
        self.__fieldOfView = n
    
    def getFieldOfView(self):
        self.__connectMongo()
        if self.__fieldOfView <= 0:
            views = list(fov for fov in self.__mg_metas.find({"key" : {"$eq" : 'field_of_view'}}, {'_id': 0}))
            if len(views) != 1:
                print(f"Error: DB has {len(views)} different field of views now, this isn't right! Returning default fov value!")
                return self.__defaultFov
            self.__fieldOfView = views[0]['value']
        return self.__fieldOfView 


    def localBackup(self):
        self.__connectMongo()
        with open("backups/words-" + datetime.now().strftime("%d-%m-%Y-%H-%M-%S") + '.json', 'w') as f:
            json.dump(list(self.__mg_nodes.find({}, {'_id': 0})), f)
        with open("backups/edges-" + datetime.now().strftime("%d-%m-%Y-%H-%M-%S") + '.json', 'w') as f:
            json.dump(list(self.__mg_edges.find({}, {'_id': 0})), f)

