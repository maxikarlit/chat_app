const msgCenter = document.getElementById('msg-center');
const textInput = document.getElementById('text-field');
const chatMessages = document.getElementById('chat-messages');

const API_URL = "http://127.0.0.1:5000";

const urlParams = new URLSearchParams(window.location.search);
let currentRoom = urlParams.get('room') || "global";

if (currentRoom !== 'global') {
  let savedRooms = JSON.parse(localStorage.getItem('asterisk_saved_rooms') || '[]');
  if (!savedRooms.includes(currentRoom)) {
    savedRooms.push(currentRoom);
    localStorage.setItem('asterisk_saved_rooms', JSON.stringify(savedRooms));
  }
}

const chatTitle = document.querySelector('.chat-title');
if (chatTitle) {
  chatTitle.innerText = currentRoom === 'global' ? 'Global Chat' : `Room: ${currentRoom}`;
}

let loadedMessageCount = 0; 
let username = localStorage.getItem('asterisk_username');

if (!username) {
  username = prompt('Please enter a username:') || 'Anonym';
  localStorage.setItem('asterisk_username', username);
}

let adminKey = localStorage.getItem('asterisk_admin_key') || "";

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    if (adminKey) {
      if (confirm("Möchtest du dich als Admin ausloggen?")) {
        localStorage.removeItem('asterisk_admin_key');
        adminKey = "";
        alert("Ausgeloggt!");
        location.reload();
      }
    } else {
      const input = prompt("Admin-Passwort eingeben:");
      if (input) {
        localStorage.setItem('asterisk_admin_key', input);
        adminKey = input;
        alert("Admin-Modus aktiviert!");
        location.reload();
      }
    }
  }
});

chatMessages.innerHTML = `
  <div class="message system-message">
    <div class="message-info" style="justify-content: center;">
      <span class="username">System</span>
    </div>
    <p class="message-text">Welcome to <b>Asterisk Chat!</b> a place that forefights the freedom of speech!</p>
  </div>
`;

async function deleteMessage(msgId) {
  if (!adminKey) return;

  try {
    const response = await fetch(`${API_URL}/messages/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msgId,
        admin_key: adminKey
      })
    });

    if (response.ok) {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) el.remove();
    } else {
      alert("Ungültiges Admin-Passwort! Bitte neu einloggen.");
      localStorage.removeItem('asterisk_admin_key');
      adminKey = "";
      location.reload();
    }
  } catch (err) {
    console.error("Fehler beim Löschen:", err);
  }
}

async function fetchMessages() {
  try {
    const response = await fetch(`${API_URL}/messages/${currentRoom}`);
    const messages = await response.json();

    if (messages.length > loadedMessageCount) {
      const newMessages = messages.slice(loadedMessageCount);

      newMessages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.id = `msg-${msg.id}`;
        
        const isMe = msg.username === username;
        messageElement.classList.add('message', isMe ? 'sent' : 'received');

        const deleteBtnHtml = adminKey 
          ? `<button class="delete-btn" onclick="deleteMessage(${msg.id})" title="Löschen">🗑️</button>` 
          : '';

        messageElement.innerHTML = `
          <div class="message-info">
            <span class="username">${msg.username}</span>
            <span class="time">${msg.time || ''}</span>
            ${deleteBtnHtml}
          </div>
          <p class="message-text">${msg.text}</p>
        `;

        chatMessages.appendChild(messageElement);
      });

      loadedMessageCount = messages.length;

      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
      });
    }

  } catch (error) {
    console.error('Error while loading the messages:', error);
  }
}

msgCenter.addEventListener('submit', async function (event) {
  event.preventDefault();

  const messageText = textInput.value.trim();

  if (messageText !== '') {
    try {
      await fetch(`${API_URL}/messages/${currentRoom}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          text: messageText,
        }),
      });

      textInput.value = '';
      fetchMessages();

    } catch (error) {
      console.error('Error while sending the message:', error);
    }
  }
});

fetchMessages();
setInterval(fetchMessages, 1000);
