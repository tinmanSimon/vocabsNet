from flask import Flask, jsonify, request
from flask_cors import CORS
from  dataConnector import DataConnector
from wordsdict import WordsDict
import re


app = Flask(__name__)
cors = CORS(app, origins="*")
dataConn = DataConnector()
wordsList, edgeMap = dataConn.getAllWords(), dataConn.getAllEdges()
vocabDict = WordsDict(wordsList, "Vocabularies")
for edgeType, edgesSet in edgeMap.items():
    vocabDict.addEdges(list(edgesSet), edgeType)
vocabDict.syncOnDB(dataConn)

@app.route("/api/vocabnet/getdata", methods=["GET"])
def vocabnet():
    wordsList, edgeMap = vocabDict.getConnectedWordsEdges(vocabDict.getLastWordInHistory())
    data = dataConn.constructNodes(wordsList, edgeMap, vocabDict.getLastWordInHistory())
    print(f"last word in history: {vocabDict.getLastWordInHistory()}")
    return jsonify(data)

def isAlphaOrNum(w):
    return w and re.match("^[A-Za-z0-9_-]*$", w)

def parseWordsEdges(data):
    wordsList = [w.strip() for w in re.split(r"[,\s]+", data['words']) if isAlphaOrNum(w)]
    edgeType = data['edgetype'].strip()
    if not isAlphaOrNum(edgeType): 
        edgeType = ""
    edges = []
    for edge in data['edges'].split(','):
        edgeElements = [e for e in re.split(r"[,\s]+", edge) if isAlphaOrNum(e)]
        if len(edgeElements) == 2:
            source, target = edgeElements[0], edgeElements[1]
            if isAlphaOrNum(source) and isAlphaOrNum(target):
                edges.append((source, target))
    # print(f"wordsList: {wordsList}")
    # print(f"edgeType: {edgeType}")
    # print(f"edges: {edges}")
    return wordsList, edges, edgeType

@app.route("/api/vocabnet/addwords", methods=["POST"])
def addwords():
    data = request.get_json()
    print("Received data:", data)
    wordsList, edges, edgeType = parseWordsEdges(data)
    if wordsList: 
        print(f"add words to vocab: {wordsList}")
        vocabDict.addWordStrs(wordsList)
    if edgeType and edges:
        print(f"add type '{edgeType}' edges to vocab: {edges}")
        vocabDict.addEdges(edges, edgeType)

    focusWord = vocabDict.getLastWordInHistory()
    responseList, responseEdges = vocabDict.getConnectedWordsEdges(focusWord)
    responseData = dataConn.constructNodes(responseList, responseEdges, focusWord)
    return jsonify(responseData)

@app.route("/api/vocabnet/removewords", methods=["POST"])
def removeWords():
    data = request.get_json()
    print("Received data:", data)
    wordsList, edges, edgeType = parseWordsEdges(data)
    if wordsList: 
        print(f"add words to vocab: {wordsList}")
        vocabDict.removeWordByStrs(wordsList)
    if edgeType and edges:
        print(f"add type '{edgeType}' edges to vocab: {edges}")
        vocabDict.removeEdges(edges, edgeType)

    focusWord = vocabDict.getLastWordInHistory()
    responseList, responseEdges = vocabDict.getConnectedWordsEdges(focusWord)
    responseData = dataConn.constructNodes(responseList, responseEdges, focusWord)
    return jsonify(responseData)

if __name__ == "__main__" :
    app.run(debug=False, port=8080)

