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

