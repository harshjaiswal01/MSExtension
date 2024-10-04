document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get(['token', 'refresh_token'], function (result) {
      if (result.token) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('board-section').style.display = 'block';
        fetchBoards(result.token);
      } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('board-section').style.display = 'none';
      }
    });
  });
  
  document.getElementById('login-btn').addEventListener('click', async function () {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    const response = await fetch('https://backend.melanatedsanctuary.com:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  
    if (response.ok) {
      const data = await response.json();
      const token = data.access_token;
      const refreshToken = data.refresh_token;
  
      chrome.storage.local.set({ token: token, refresh_token: refreshToken }, function () {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('board-section').style.display = 'block';
      });
  
      fetchBoards(token);
    }
  });
  
  
  async function fetchBoards(token) {
    const response = await fetch('https://backend.melanatedsanctuary.com:5000/users/vision-boards/subscribed', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  
    if (response.status === 401) {
      // If access token expired, try refreshing the token
      await refreshAccessToken();
    } else {
      const boards = await response.json();
      const select = document.getElementById('board-select');
      select.innerHTML = ''; // Clear existing options
  
      boards.filter(board => board.is_custom).forEach(board => {
        const option = document.createElement('option');
        option.value = board.id;
        option.textContent = board.name;
        select.appendChild(option);
      });
    }
  }
  
  async function refreshAccessToken() {
    chrome.storage.local.get(['refresh_token'], async function (result) {
      const refreshToken = result.refresh_token;
      if (!refreshToken) {
        // If no refresh token, show login
        document.getElementById('login-section').style.display = 'block';
        return;
      }
  
      const response = await fetch('https://backend.melanatedsanctuary.com:5000/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
  
      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.access_token;
  
        // Update access token in Chrome storage
        chrome.storage.local.set({ token: newAccessToken }, function () {
          fetchBoards(newAccessToken);
        });
      } else {
        // If refresh token fails, show login
        document.getElementById('login-section').style.display = 'block';
      }
    });
  }
  
  document.getElementById('post-btn').addEventListener('click', function () {
    const postButton = document.getElementById('post-btn');
    postButton.disabled = true;
    postButton.textContent = 'Posting...';
  
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const url = activeTab.url;
      const contentType = document.getElementById('content-type').value;
      const boardId = document.getElementById('board-select').value;
  
      console.log("Board ID:", boardId);
      console.log("Content Type:", contentType);
      console.log("URL:", url);
  
      chrome.storage.local.get(['token'], async function (result) {
        const token = result.token;
  
        const response = await fetch(`https://backend.melanatedsanctuary.com:5000/vision-boards/${boardId}/content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content_url: url, content_type: contentType })
        });
  
        if (response.ok) {
          console.log("Response OK:", response);
          postButton.textContent = 'Success!';
          setTimeout(() => {
            postButton.textContent = 'Post Current Site';
            postButton.disabled = false;
          }, 2000);
        } else {
          console.error("Response Error:", response);
          postButton.textContent = 'Failed! Try Again';
          setTimeout(() => {
            postButton.textContent = 'Post Current Site';
            postButton.disabled = false;
          }, 2000);
        }
      });
    });
  });
  