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
vocabDict.addWordStrs(["a", "b", "C", "d"])
# vocabDict.addWordStrs(["d", "atone", "a"])
# vocabDict.printWordsDict()


vocabDict.addEdges([("repent", "atone"), ("repent", "C"), ("repent", "a"), ("repent", "amend"), ("b", "insatiable")])
# vocabDict.addEdges([("b", "b")])
# vocabDict.printEdges()


vocabDict.addEdges([("repent", "b"), ("repent", "a"), ("C", "a"), ("atone", "amend"), ("a", "insatiable"), ("C", "b")], "uncategorized edges")
# vocabDict.addEdges([("C", "a")], "uncategorized edges")
# vocabDict.printAllEdges()

vocabDict.removeEdges([("C", "b"), ("repent", "a")], "uncategorized edges")
# vocabDict.removeEdges([("atone", "b")], "uncategorized edges")
vocabDict.printAllEdges()
vocabDict.printWordsDict()

# vocabDict.removeWordByStrs(["repent", "a"])
# vocabDict.printAllEdges()
# vocabDict.printWordsDict()