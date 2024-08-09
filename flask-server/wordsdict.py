from word import Word
from collections import defaultdict

class WordsDict:
    def __init__(self, wordsList, name = "WordsDict"):
        # internal dictionary for accumulated Words
        # key is the string of the Word
        # value is the Word object
        self.__wordsDict =  defaultdict(None)
        self.__edgesDict = defaultdict(set)
        for w in wordsList:
            self.__wordsDict[w] = Word(w)
        self.name = name
        self.__historyStack = [w for w in wordsList]
        self.__dataConnector = None

    def syncOnDB(self, dataConnector):
        self.__dataConnector = dataConnector

    def __validationCheck(self, functionName, wordsInvalidExistStatus, wordStr1, wordStr2 = "", edgeType = "", edgeInvalidExistStatus = True):
        if self.wordExists(wordStr1) == wordsInvalidExistStatus:
            print(f"Error {functionName}: {self.name} validationCheck, '{wordStr1}' exist status == {wordsInvalidExistStatus}!")
            return False
        elif wordStr2 and (self.wordExists(wordStr2) == wordsInvalidExistStatus):
            print(f"Error {functionName}: {self.name} validationCheck, '{wordStr2}' exist status == {wordsInvalidExistStatus}!")
            return False
        elif wordStr1 == wordStr2:
            print(f"Error {functionName}: {self.name} validationCheck, '{wordStr1}' is dealing with itself!")
            return False
        elif edgeType and self.edgeExists((wordStr1, wordStr2), edgeType) == edgeInvalidExistStatus:
            print(f"Error {functionName}: {self.name} validationCheck, edge ({wordStr1}, {wordStr2}) exist status == {edgeInvalidExistStatus}!")
            return False
        return True

    def wordExists(self, wordStr):
        return wordStr in self.__wordsDict
    
    def edgeExists(self, edge, edgeType):
        return edge in self.__edgesDict[edgeType]

    def addWordStr(self, wordStr, syncWithDB = True):
        if not self.__validationCheck("addWordStr", True, wordStr): return
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.pushManyWords([wordStr])
            if dbRes == False: return
        self.__wordsDict[wordStr] = Word(wordStr)
        self.__historyStack.append(wordStr)

    def addWordStrs(self, wordStrList, syncWithDB = True):
        if len(set(wordStrList)) != len(wordStrList): 
            print(f"Error: addWordStrs wordStrList has identical items inside! wordStrList: {wordStrList}")
            return
        for w in wordStrList:
            if not self.__validationCheck("addWordStrs", True, w): return
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.pushManyWords(wordStrList)
            if dbRes == False: return
        for w in wordStrList:
            self.addWordStr(w, syncWithDB = False)

    def getWordObj(self, wordStr):
        return self.__wordsDict[wordStr] if self.wordExists(wordStr) else None
    
    def getAllWordsStrs(self):
        return list(self.__wordsDict.keys())
    
    def addEdge(self, wordStr1, wordStr2, edgeType = "synonyms", syncWithDB = True):
        if not self.__validationCheck("addEdge", False, wordStr1, wordStr2, edgeType=edgeType, edgeInvalidExistStatus = True): return 
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.pushManyEdges([(wordStr1, wordStr2)], edgeType)
            if dbRes == False: return 
        wordObj1, wordObj2 = self.__wordsDict[wordStr1], self.__wordsDict[wordStr2]
        wordObj1.addEdge(wordObj2, edgeType)
        wordObj2.addEdge(wordObj1, edgeType)
        self.__edgesDict[edgeType].add((wordStr1, wordStr2))
    
    def addEdges(self, strEdges, edgeType = "synonyms", syncWithDB = True):
        if len(set(strEdges)) != len(strEdges): 
            print(f"Error: addEdges strEdges list has identical items inside! strEdges: {strEdges}")
            return
        for wordStr1, wordStr2 in strEdges:
            if not self.__validationCheck("addEdges", False, wordStr1, wordStr2, edgeType=edgeType, edgeInvalidExistStatus = True): 
                return 
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.pushManyEdges(strEdges, edgeType)
            if dbRes == False: return 
        for wordStr1, wordStr2 in strEdges:
            self.addEdge(wordStr1, wordStr2, edgeType, syncWithDB = False)

    def removeWordByStr(self, wordStr, syncWithDB = True):
        if not self.__validationCheck("removeWordByStr", False, wordStr): return 
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.dropManyWords([wordStr])
            if dbRes == False: return 
        wordObj = self.__wordsDict[wordStr]
        wordObj.disconnectAllEdges()
        self.__wordsDict.pop(wordStr)
        self.__historyStack.remove(wordStr)

    def removeWordByStrs(self, wordStrList, syncWithDB = True):
        if len(set(wordStrList)) != len(wordStrList): 
            print(f"Error: removeWordByStrs wordStrList list has identical items inside! wordStrList: {wordStrList}")
            return
        for wordStr in wordStrList:
            if not self.__validationCheck("removeWordByStrs", False, wordStr): return 
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.dropManyWords(wordStrList)
            if dbRes == False: return 
        for wordStr in wordStrList:
            self.removeWordByStr(wordStr, False)
        

    def removeEdge(self, wordStr1, wordStr2, edgeType = "synonyms", syncWithDB = True):
        if not self.__validationCheck("removeEdge", False, wordStr1, wordStr2, edgeType=edgeType, edgeInvalidExistStatus = False): return 
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.dropManyEdges([(wordStr1, wordStr2)], edgeType)
            if dbRes == False: return 
        wordObj1, wordObj2 = self.__wordsDict[wordStr1], self.__wordsDict[wordStr2]
        wordObj1.removeEdgeByStr(wordObj2.text, edgeType)
        wordObj2.removeEdgeByStr(wordObj1.text, edgeType)
        self.__edgesDict[edgeType].remove((wordStr1, wordStr2))

    def removeEdges(self, strEdges, edgeType = "synonyms", syncWithDB = True):
        if len(set(strEdges)) != len(strEdges): 
            print(f"Error: removeEdges strEdges list has identical items inside! strEdges: {strEdges}")
            return
        for wordStr1, wordStr2 in strEdges:
            if not self.__validationCheck("removeEdges", False, wordStr1, wordStr2, edgeType=edgeType, edgeInvalidExistStatus = False): return 
        if self.__dataConnector and syncWithDB:
            dbRes = self.__dataConnector.dropManyEdges(strEdges, edgeType)
            if dbRes == False: return 
        for wordStr1, wordStr2 in strEdges:
            self.removeEdge(wordStr1, wordStr2, edgeType, False)

    def printWordsDict(self):
        print(f"Printing words for {self.name}:")
        print(self.getAllWordsStrs(), "\n")

    def printEdges(self, edgeType = "synonyms"):
        print(f"Printing {edgeType} of {self.name}")
        for wordObj in self.__wordsDict.values():
            wordObj.printNeighbors(edgeType)
        print("\n")

    def printAllEdges(self):
        for wordObj in self.__wordsDict.values():
            wordObj.printAllNeighbors()
            print("\n")
        print("\n")
        