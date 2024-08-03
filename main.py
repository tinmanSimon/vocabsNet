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
        self.text = text
        self.__edgesDict = defaultdict(list)

        # internal variable for memorizing the connected Words' texts
        self.__edgesMemory = defaultdict(set)

    def __isEdgeToMyself(self, destWordObj):
        return destWordObj.text == self.text

    def __edgeExists(self, destWordStr, edgeType = "synonyms"):
        return destWordStr in self.__edgesMemory[edgeType]

    def addEdge(self, destWordObj, edgeType = "synonyms"):
        if self.__isEdgeToMyself(destWordObj):
            print(f"Error: {self.text} tried to add edge to itself!", "\n")
            return
        if self.__edgeExists(destWordObj.text, edgeType): 
            print(f"Error: {self.text} tried to add '{edgeType}' edge to {destWordObj.text}, but the edge already exists!")
            return
        self.__edgesDict[edgeType].append(destWordObj)
        self.__edgesMemory[edgeType].add(destWordObj.text)

    def removeEdge(self, destWordObj, edgeType):
        if not destWordObj in self.__edgesDict[edgeType]:
            print(f"Error: {self.text} tried to remove '{edgeType}' edge to {destWordObj.text}, but the edge doesn't exist!")
            return 
        self.__edgesDict[edgeType].remove(destWordObj)
        self.__edgesMemory[edgeType].remove(destWordObj.text)

    def removeEdgeByStr(self, destWordStr, edgeType):
        destWordObj = next((wordObj for wordObj in self.__edgesDict[edgeType] if destWordStr == wordObj.text), None)
        if not destWordObj:
            print(f"Error: {self.text} tried to remove '{edgeType}' edge to {destWordStr}, but the edge doesn't exist!")
            return 
        self.removeEdge(destWordObj, edgeType)

    def printNeighbors(self, edgeType):
        wordsObjList = self.__edgesDict[edgeType]
        if not wordsObjList: return
        print(f"For {self.text}'s {edgeType} neighbors:")
        print("    ", [wordObj.text for wordObj in wordsObjList])

    def printAllNeighbors(self):
        print(f"Printing neighbors for {self.text}:")
        for edgeType, _ in self.__edgesDict.items():
            self.printNeighbors(edgeType)


class WordsDict:
    def __init__(self, wordsList, name = "WordsDict"):
        self.wordsDict =  defaultdict(None)
        for w in wordsList:
            self.wordsDict[w] = Word(w)
        self.name = name

    def __validationCheck(self, functionName, invalidExistStatus, wordStr1, wordStr2 = ""):
        if self.wordExists(wordStr1) == invalidExistStatus:
            print(f"Error {functionName}: {self.name} validationCheck, '{wordStr1}' exist status == {invalidExistStatus}!")
            return False
        elif wordStr2 and (self.wordExists(wordStr2) == invalidExistStatus):
            print(f"Error {functionName}: {self.name} validationCheck, '{wordStr2}' exist status == {invalidExistStatus}!")
            return False
        elif wordStr1 == wordStr2:
            print(f"Error {functionName}: {self.name} validationCheck, '{wordStr1}' is dealing with itself!")
            return False
        return True

    def wordExists(self, wordStr):
        return wordStr in self.wordsDict

    def addWordStr(self, wordStr):
        if not self.__validationCheck("addWordStr", True, wordStr): return
        self.wordsDict[wordStr] = Word(wordStr)

    def addWordStrs(self, wordStrList):
        for w in wordStrList:
            self.addWordStr(w)

    def addWordObj(self, wordObj):
        if not self.__validationCheck("addWordObj", True, wordObj.text): return
        self.wordsDict[wordObj.text] = wordObj

    def getWordObj(self, wordStr):
        return self.wordsDict[wordStr] if self.wordExists(wordStr) else None
    
    def getAllWordsStrs(self):
        return list(self.wordsDict.keys())
    
    def addEdge(self, wordStr1, wordStr2, edgeType = "synonyms"):
        if not self.__validationCheck("addEdge", False, wordStr1, wordStr2): return 
        wordObj1, wordObj2 = self.wordsDict[wordStr1], self.wordsDict[wordStr2]
        wordObj1.addEdge(wordObj2, edgeType)
        wordObj2.addEdge(wordObj1, edgeType)
    
    def addEdges(self, strEdges, edgeType = "synonyms"):
        for wordStr1, wordStr2 in strEdges:
            self.addEdge(wordStr1, wordStr2, edgeType)

    def removeEdge(self, wordStr1, wordStr2, edgeType = "synonyms"):
        if not self.__validationCheck("removeEdge", False, wordStr1, wordStr2): return 
        wordObj1, wordObj2 = self.wordsDict[wordStr1], self.wordsDict[wordStr2]
        wordObj1.removeEdgeByStr(wordObj2.text, edgeType)
        wordObj2.removeEdgeByStr(wordObj1.text, edgeType)

    def removeEdges(self, strEdges, edgeType = "synonyms"):
        for wordStr1, wordStr2 in strEdges:
            self.removeEdge(wordStr1, wordStr2, edgeType)

    def printWordsDict(self):
        print(f"Printing words for {self.name}:")
        print(self.getAllWordsStrs(), "\n")

    def printEdges(self, edgeType = "synonyms"):
        print(f"Printing {edgeType} of {self.name}")
        for wordObj in self.wordsDict.values():
            wordObj.printNeighbors(edgeType)
        print("\n")

    def printAllEdges(self):
        for wordObj in self.wordsDict.values():
            wordObj.printAllNeighbors()
            print("\n")
        print("\n")


    

    

wordsList = ["repent", "atone", "amend", "insatiable"]
vocabDict = WordsDict(wordsList, "Vocabularies")
vocabDict.addWordStrs(["a", "b", "C"])
vocabDict.addWordStrs(["d", "atone", "a"])
vocabDict.printWordsDict()


vocabDict.addEdges([("repent", "atone"), ("repent", "C"), ("repent", "a"), ("repent", "amend"), ("b", "insatiable"), ("b", "b")])
vocabDict.printEdges()


vocabDict.addEdges([("repent", "b"), ("repent", "a"), ("C", "a"), ("atone", "amend"), ("a", "insatiable"), ("C", "b"), ("C", "a")], "uncategorized edges")
vocabDict.printAllEdges()