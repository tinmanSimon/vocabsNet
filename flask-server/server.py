from flask import Flask, jsonify
import json
from flask_cors import CORS
import jsonData

app = Flask(__name__)
cors = CORS(app, origins="*")


@app.route("/api/vocabnet", methods=["GET"])

def vocabnet():
    return jsonify(jsonData.getRandStrAndLinks())

if __name__ == "__main__" :
    app.run(debug=True, port=8080)

 