from flask import Flask, jsonify, request, current_app
from dataConnector import DataConnector
from wordsdict import WordsDict
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from credentials import JWT_SECRET_KEY
from datetime import timedelta

import re
import logging

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

jwt = JWTManager(app)
bcrypt = Bcrypt(app)

dataConn = DataConnector()
wordsList, edgeMap = dataConn.getAllWords(), dataConn.getAllEdges()
vocabDict = WordsDict(wordsList, "Vocabularies")
for edgeType, edgesSet in edgeMap.items():
    vocabDict.addEdges(list(edgesSet), edgeType)
vocabDict.syncOnDB(dataConn)
app.config['SHARED_DATA'] = vocabDict

@app.route("/api/vocabnet/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    passwordInput = data.get("password")
    correct_PWD_hash = dataConn.getPwdHash(username)
    loginSuccess, access_token = False, ""
    if correct_PWD_hash and bcrypt.check_password_hash(correct_PWD_hash, passwordInput):
        access_token = create_access_token(identity=username)
        loginSuccess = True
    return jsonify({
        "type" : "login", 
        "success" : loginSuccess,
        "access_token": access_token
    })

@app.route("/api/vocabnet/note", methods=["GET", "POST", "DELETE"])
@jwt_required()
def note():
    try:
        vocabDict = current_app.config['SHARED_DATA']
        current_user = get_jwt_identity()
        
        if request.method == "GET":
            # Get note for a word
            focus_word = request.args.get("focusWord")
            if not focus_word:
                return jsonify({"error": "focusWord parameter is required"}), 400
                
            if not vocabDict.wordExists(focus_word):
                return jsonify({"error": f"Word '{focus_word}' does not exist"}), 404
                
            note_content = dataConn.getNote(focus_word)
            return jsonify({
                "word": focus_word,
                "note": note_content
            })
            
        elif request.method == "POST":
            # Save or update a note
            data = request.get_json()
            if not data:
                return jsonify({"error": "Missing request data"}), 400
                
            focus_word = data.get("focusWord")
            note_content = data.get("note", "")
            
            if not focus_word:
                return jsonify({"error": "focusWord is required"}), 400
                
            if not vocabDict.wordExists(focus_word):
                return jsonify({"error": f"Word '{focus_word}' does not exist"}), 404
                
            success = dataConn.saveNote(focus_word, note_content, current_user)
            
            if success:
                return jsonify({
                    "word": focus_word,
                    "note": note_content,
                    "success": True
                })
            else:
                return jsonify({
                    "error": "Failed to save note",
                    "success": False
                }), 500
                
        elif request.method == "DELETE":
            # Delete a note
            focus_word = request.args.get("focusWord")
            if not focus_word:
                return jsonify({"error": "focusWord parameter is required"}), 400
                
            if not vocabDict.wordExists(focus_word):
                return jsonify({"error": f"Word '{focus_word}' does not exist"}), 404
                
            success = dataConn.deleteNote(focus_word)
            
            return jsonify({
                "word": focus_word,
                "success": success
            })
            
    except Exception as e:
        logging.error(f"Error handling note: {str(e)}")
        return jsonify({
            "error": "Server error processing note",
            "success": False
        }), 500

@app.route("/api/vocabnet/getdata", methods=["GET"])
@jwt_required()
def vocabnet():
    vocabDict = current_app.config['SHARED_DATA']
    wordsList, edgeMap = vocabDict.getConnectedWordsEdges(vocabDict.getLastWordInHistory(), dataConn.getFieldOfView())
    data = dataConn.constructNodes(wordsList, edgeMap, vocabDict.getLastWordInHistory(), vocabDict.getWordHistory())
    print(f"last word in history: {vocabDict.getLastWordInHistory()}")
    return jsonify(data)

def isAlphaOrNum(w):
    return w and re.match("^[A-Za-z0-9_-]*$", w)

def isNum(w):
    return w and re.match("^[0-9]*$", w)

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
@jwt_required()
def addwords():
    vocabDict = current_app.config['SHARED_DATA']
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
    responseList, responseEdges = vocabDict.getConnectedWordsEdges(focusWord, dataConn.getFieldOfView())
    responseData = dataConn.constructNodes(responseList, responseEdges, focusWord, vocabDict.getWordHistory())
    return jsonify(responseData)

@app.route("/api/vocabnet/removewords", methods=["POST"])
@jwt_required()
def removeWords():
    vocabDict = current_app.config['SHARED_DATA']
    data = request.get_json()
    print("Received data:", data)
    wordsList, edges, edgeType = parseWordsEdges(data)
    if wordsList: 
        print(f"remove words to vocab: {wordsList}")
        vocabDict.removeWordByStrs(wordsList)
    if edgeType and edges:
        print(f"remove type '{edgeType}' edges to vocab: {edges}")
        vocabDict.removeEdges(edges, edgeType)

    focusWord = vocabDict.getLastWordInHistory()
    responseList, responseEdges = vocabDict.getConnectedWordsEdges(focusWord, dataConn.getFieldOfView())
    responseData = dataConn.constructNodes(responseList, responseEdges, focusWord, vocabDict.getWordHistory())
    return jsonify(responseData)

@app.route("/api/vocabnet/search", methods=["POST"])
@jwt_required()
def searchWord():
    vocabDict = current_app.config['SHARED_DATA']
    data = request.get_json()
    print("Received data:", data)
    wordsList = [w.strip() for w in re.split(r"[,\s]+", data['word']) if isAlphaOrNum(w)]
    if len(wordsList) != 1:
        print(f"Error: server searchWord received word: {data['word']}")
        return jsonify({"error" : f"invalid search word: '{data['word']}'"})
    focusWord = wordsList[0]
    if not vocabDict.wordExists(focusWord):
        print(f"Error: server searchWord received word: '{data['word']}' and it doesn't exist!")
        return jsonify({"error" : f"Search word '{data['word']}' doesn't exist!"})
    responseList, responseEdges = vocabDict.getConnectedWordsEdges(focusWord, dataConn.getFieldOfView())
    responseData = dataConn.constructNodes(responseList, responseEdges, focusWord, vocabDict.getWordHistory())
    return jsonify(responseData)

@app.route("/api/vocabnet/fov", methods=["POST"])
@jwt_required()
def changeFov():
    vocabDict = current_app.config['SHARED_DATA']
    data = request.get_json()
    print("Received data:", data)
    wordsList = [w.strip() for w in re.split(r"[,\s]+", data['fov']) if isAlphaOrNum(w)]
    if len(wordsList) != 1 or not isNum(wordsList[0]) or int(wordsList[0]) <= 0:
        print(f"Error: server changeFov received fov: {data['fov']}")
        return jsonify({"error" : f"invalid fov: '{data['fov']}'"})
    fov = int(wordsList[0])
    wordsList = [w.strip() for w in re.split(r"[,\s]+", data['focusWord']) if isAlphaOrNum(w)]
    if len(wordsList) != 1:
        print(f"Error: server changeFov received fov: {data['focusWord']}")
        return jsonify({"error" : f"invalid fov: '{data['focusWord']}'"})
    focusWord = wordsList[0]
    dataConn.setAndPushFieldOfView(fov)
    responseList, responseEdges = vocabDict.getConnectedWordsEdges(focusWord, dataConn.getFieldOfView())
    responseData = dataConn.constructNodes(responseList, responseEdges, focusWord, vocabDict.getWordHistory())
    return jsonify(responseData)

@app.route("/api/vocabnet/backup", methods=["POST"])
@jwt_required()
def backup():
    vocabDict = current_app.config['SHARED_DATA']
    data = request.get_json()
    print("Received data:", data)
    if data["backup"] == True:
        dataConn.localBackup()
    return jsonify({"backup" : "done"})

@app.route("/api/vocabnet/notes/all", methods=["GET"])
@jwt_required()
def get_all_notes():
    try:
        vocabDict = current_app.config['SHARED_DATA']
        notes = dataConn.getAllNotes()
        
        # Filter notes to only include words that exist in the vocabulary
        filtered_notes = {word: note for word, note in notes.items() if vocabDict.wordExists(word)}
        
        return jsonify({
            "notes": filtered_notes,
            "count": len(filtered_notes)
        })
    except Exception as e:
        logging.error(f"Error retrieving all notes: {str(e)}")
        return jsonify({
            "error": "Server error retrieving notes",
            "success": False
        }), 500

if __name__ == "__main__" :
    app.run(host='0.0.0.0', port=8000, ssl_context=('cert.pem', 'key.pem'))

