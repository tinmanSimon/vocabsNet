from word import Word
from collections import defaultdict

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