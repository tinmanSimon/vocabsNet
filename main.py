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

wordsList = ["repent", "atone", "amend", "insatiable"]
vocabDict = WordsDict(wordsList, "Vocabularies")
vocabDict.addWordStrs(["a", "b", "C"])
vocabDict.addWordStrs(["d", "atone", "a"])
vocabDict.printWordsDict()


vocabDict.addEdges([("repent", "atone"), ("repent", "C"), ("repent", "a"), ("repent", "amend"), ("b", "insatiable"), ("b", "b")])
vocabDict.printEdges()


vocabDict.addEdges([("repent", "b"), ("repent", "a"), ("C", "a"), ("atone", "amend"), ("a", "insatiable"), ("C", "b"), ("C", "a")], "uncategorized edges")
vocabDict.printAllEdges()

vocabDict.removeEdges([("C", "b"), ("atone", "b"), ("repent", "a")], "uncategorized edges")
vocabDict.printAllEdges()