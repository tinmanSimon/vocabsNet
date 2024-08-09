import igraph as ig
import json
import requests
import chart_studio.plotly as py
import plotly.graph_objs as go
import numpy as np
import plotly.express as px
from collections import defaultdict
from word import Word 
from wordsdict import WordsDict
from dataConnector import DataConnector

def randGenUpdateDB(d):
    words, edges = d.getRandStrAndLinks(200, 300)
    d.dropAll()
    d.pushManyWords(words)
    d.pushManyEdges(edges)

def testWordAndEdges():
    dataConn = DataConnector()
    dataConn.dropAll()
    wordsList, edgesList = dataConn.getAllWords(), dataConn.getAllEdges()
    vocabDict = WordsDict(wordsList, "Vocabularies")
    vocabDict.syncOnDB(dataConn)

    vocabDict.addWordStr("a")
    vocabDict.addWordStr("b")
    # vocabDict.addWordStr("a")
    vocabDict.addWordStrs(["c", "d"])
    # vocabDict.addWordStrs(["c", "d"])
    vocabDict.addWordStrs(["f", "g", "e", "k", "td", "zx"])
    # vocabDict.addWordStrs(["1", "2", "1"])

    vocabDict.addEdge("a", "b", "antonym")
    # vocabDict.addEdge("a", "b", "antonym")
    vocabDict.addEdge("c", "d", "synonym")
    vocabDict.addEdge("c", "d", "antonym")
    vocabDict.addEdges([("f", "g"), ("e", "k")], "uncat")
    vocabDict.addEdges([("f", "g"), ("e", "k")], "uncat2")
    vocabDict.addEdges([("a", "b"), ("a", "c"), ("a", "d"), ("f", "a"), ("e", "a")], "uncat3")
    # vocabDict.addEdges([("td", "zx"), ("td", "zx")], "uncat3")

    # vocabDict.removeWordByStr("c")
    # vocabDict.removeWordByStr("c")
    # vocabDict.removeWordByStrs(["f", "g", "e"])
    # vocabDict.removeWordByStrs(["a", "b", "td", "zx", "b"])
    # vocabDict.removeWordByStrs(["a", "b"])
    # vocabDict.removeWordByStrs(["a", "b"])

    # vocabDict.removeEdge("a", "b", "antonym")
    # vocabDict.removeEdge("c", "d", "synonym")
    # vocabDict.removeEdge("c", "d", "synonym")
    # vocabDict.removeEdges([("f", "g"), ("e", "k")], "uncat")
    # vocabDict.removeEdges([("f", "g"), ("e", "k"), ("f", "g")], "uncat2")
    # vocabDict.removeEdges([("td", "zx")], "uncat3")


    # vocabDict.removeWordByStr("a")

def testBackup():
    dataConn = DataConnector()
    dataConn.localBackup()




