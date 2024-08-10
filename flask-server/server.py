from flask import Flask, jsonify
from flask_cors import CORS
from  dataConnector import DataConnector
from wordsdict import WordsDict

app = Flask(__name__)
cors = CORS(app, origins="*")
dataConn = DataConnector()
wordsList, edgeMap = dataConn.getAllWords(), dataConn.getAllEdges()
vocabDict = WordsDict(wordsList, "Vocabularies")
for edgeType, edgesSet in edgeMap.items():
    vocabDict.addEdges(list(edgesSet), edgeType)
vocabDict.syncOnDB(dataConn)

@app.route("/api/vocabnet", methods=["GET"])

def vocabnet():
    wordsList, edgeMap = vocabDict.getConnectedWordsEdges(vocabDict.getLastWordInHistory())
    data = dataConn.constructNodes(wordsList, edgeMap, vocabDict.getLastWordInHistory())
    print(f"last word in history: {vocabDict.getLastWordInHistory()}")
    return jsonify(data)

if __name__ == "__main__" :
    app.run(debug=True, port=8080)

