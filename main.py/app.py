import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ADMIN_SECRET = os.environ.get("ADMIN_SECRET")

def init_db():
    conn = sqlite3.connect('chat.db', timeout=10)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL,
            username TEXT NOT NULL,
            text TEXT NOT NULL,
            time TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/messages/<room_id>', methods=['GET'])
def get_messages(room_id):
    conn = sqlite3.connect('chat.db', timeout=10)
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, text, time FROM messages WHERE room = ? ORDER BY id ASC', (room_id,))
    rows = cursor.fetchall()
    conn.close()
    
    messages = []
    for row in rows:
        messages.append({
            "id": row[0],
            "username": row[1],
            "text": row[2],
            "time": row[3]
        })
    return jsonify(messages)

@app.route('/messages/<room_id>', methods=['POST'])
def send_message(room_id):
    data = request.json
    username = data.get("username", "Anonym")
    text = data.get("text", "")
    time_str = datetime.now().strftime("%H:%M")
    
    conn = sqlite3.connect('chat.db', timeout=10)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO messages (room, username, text, time) VALUES (?, ?, ?, ?)',
                   (room_id, username, text, time_str))
    conn.commit()
    conn.close()
    
    return jsonify({"status": "ok"})

@app.route('/messages/delete', methods=['POST'])
def delete_message():
    data = request.json
    msg_id = data.get("id")
    admin_key = data.get("admin_key")

    if admin_key != ADMIN_SECRET:
        return jsonify({"status": "error", "message": "Falsches Admin-Passwort!"}), 403

    conn = sqlite3.connect('chat.db', timeout=10)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM messages WHERE id = ?', (msg_id,))
    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)