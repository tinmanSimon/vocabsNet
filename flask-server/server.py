from flask import Flask, jsonify
import json
from flask_cors import CORS
from  dataConnector import DataConnector
from wordsdict import WordsDict

app = Flask(__name__)
cors = CORS(app, origins="*")
dataConn = DataConnector()
wordsList, edgesList = dataConn.getRandStrAndLinks(200, 150)
vocabDict = WordsDict(wordsList, "Vocabularies")
vocabDict.addEdges(edgesList, "synonyms")

@app.route("/api/vocabnet", methods=["GET"])

def vocabnet():
    return jsonify(dataConn.constructNodes(wordsList, edgesList))

if __name__ == "__main__" :
    app.run(debug=True, port=8080)

