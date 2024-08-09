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

def randGenUpdateDB():
    d = DataConnector()
    words, edges = d.getRandStrAndLinks(200, 300)
    d.dropAll()
    d.pushManyWords(words)
    d.pushManyEdges(edges)