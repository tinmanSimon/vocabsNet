import igraph as ig
import json
import requests
import chart_studio.plotly as py
import plotly.graph_objs as go
import numpy as np
import plotly.express as px
from collections import defaultdict

class Word:
    def __init__(self, text):
        # synonyms is a list of synonyms Words
        self.synonyms = [] 

        # antonyms is a list of antonyms Words
        self.antonyms = []

        # uncategorized connection to other Words
        self.uncatConnection = []

        # the cluster it belongs to. Each Word can only have
        # 1 cluster
        self.cluster = None

        self.text = text

    def getSynonyms(self):
        return self.synonyms

class WordsDict:
    def __init__(self, wordsList, name = ""):
        self.wordsDict =  defaultdict(None)
        for w in wordsList:
            self.wordsDict[w] = Word(w)
        self.name = name

    def addWordStr(self, wordStr):
        self.wordsDict[wordStr] = Word(wordStr)

    def addWordStrs(self, wordStrList):
        for w in wordStrList:
            self.wordsDict[w] = Word(w)

    def addWordObj(self, wordObj):
        self.wordsDict[wordObj.text] = wordObj

    def printWordsDict(self):
        dictName = self.name if self.name else "WordsDict"
        print(f"Printing words for {dictName}:")
        print([wordObj.text for wordObj in self.wordsDict.values()], "\n")

    def getWordObj(self, wordStr):
        return self.wordsDict[wordStr] if wordStr in self.wordsDict else None
    
    def getWordsStrs(self):
        return [wordObj.text for wordObj in self.wordsDict.values()]
    
    def addEdges(self, strEdges, edgeType = "synonyms"):
        for wordStr1, wordStr2 in strEdges:
            word1Obj, word2Obj = self.wordsDict[wordStr1], self.wordsDict[wordStr2]
            getattr(word1Obj, edgeType).append(word2Obj)
            getattr(word2Obj, edgeType).append(word1Obj)

    def printEdges(self, edgeType = "synonyms"):
        for wordObj in self.wordsDict.values():
            print(f"{wordObj.text}'s synonyms:")
            print([synonym.text for synonym in wordObj.getSynonyms()], "\n")

    
    

    

wordsList = ["repent", "atone", "amend", "insatiable"]


synonymEdges = []
antonymEdges = []
uncategorizedEdges = []
