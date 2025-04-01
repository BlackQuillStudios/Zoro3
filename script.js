// --- Get HTML Elements ---
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const loadingIndicator = document.getElementById('loading');
const errorDisplay = document.getElementById('error');

// --- Configuration ---
// 🚨 IMPORTANT: Replace 'YOUR_API_KEY' with your actual Google AI Studio API key
// Remember the security warning: This key is visible in the browser!
const API_KEY = 'YOUR_API_KEY'; // <--- PASTE YOUR KEY HERE
const MODEL_NAME = 'gemini-pro'; // Use a standard model available via REST API
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- System Instructions for Zoro (from your Python code) ---
const ZORO_SYSTEM_INSTRUCTIONS = {
    parts: [{
        text: `You are Zoro, a helpful and slightly adventurous chatbot assistant. Your primary goal is to assist the user accurately and clearly. Respond politely, but feel free to add a touch of curiosity or a hint of an adventurous spirit to your answers when appropriate (e.g., using phrases like "Let's explore that!" or "That's an interesting quest!"). Keep your responses relatively concise and easy to understand unless the user asks for more detail. Avoid making up information; if you don't know something, say so. Your name is Zoro.`
    }]
};

// Store conversation history (optional but good for context)
let conversationHistory = [];

// --- Functions ---

// Function to display errors
function displayError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
}

// Function to clear errors
function clearError() {
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';
}

// Function to add a message to the chatbox
function addMessageToChatbox(message, sender) {
    const messageElement = document.createElement('p');
    // Basic sanitization to prevent HTML injection (more robust needed for production)
    messageElement.textContent = message;
    messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
    chatbox.appendChild(messageElement);
    // Scroll to the bottom
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Function to show/hide loading indicator
function setLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
}

// Function to call the Google Gemini REST API
async function getBotResponse(userMessage) {
    setLoading(true);
    clearError(); // Clear previous errors
    sendButton.disabled = true; // Disable button while waiting
    userInput.disabled = true;  // Disable input while waiting

    // Add user message to history
    conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

    try {
        const requestBody = {
            contents: conversationHistory, // Send history
            systemInstruction: ZORO_SYSTEM_INSTRUCTIONS, // Add Zoro's instructions
            generationConfig: { // Optional: Configure output
                 // responseMimeType: "text/plain", // Usually default, uncomment if needed
                 // maxOutputTokens: 800,
                 // temperature: 0.7, // Example: control randomness
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorDetails = `Error: ${response.status}`;
            try {
                const errorData = await response.json();
                console.error("API Error Response:", errorData); // Log full error
                errorDetails += ` - ${errorData?.error?.message || 'Unknown API error. Check console for details.'}`;
            } catch (jsonError) {
                errorDetails += ` - Failed to parse error response. Status text: ${response.statusText}`;
                console.error("Failed to parse error JSON:", jsonError);
            }
             displayError(errorDetails); // Display user-friendly error
            throw new Error(errorDetails); // Throw for console logging
        }

        const data = await response.json();
        console.log("API Response:", data); // Log successful response for debugging

        // --- Extract the response text ---
        let botMessage = "Sorry, I encountered an issue processing that."; // Default error
        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0) {
             botMessage = data.candidates[0].content.parts[0].text;

             // Add bot response to history
             conversationHistory.push({ role: "model", parts: [{ text: botMessage }] });

        } else if (data.promptFeedback) {
             // Handle safety blocks or other feedback
             const blockReason = data.promptFeedback.blockReason;
             const safetyRatings = data.promptFeedback.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ');
             botMessage = `My response was blocked. Reason: ${blockReason || 'Not specified'}. ${safetyRatings ? `(Safety Details: ${safetyRatings})` : ''}`;
             console.warn("Response blocked by API:", data.promptFeedback);
              // Don't add blocked messages to history as a valid 'model' turn
        }
         else {
             console.warn("Unexpected API response structure:", data);
             botMessage = "Received an unexpected response format from the AI.";
              // Don't add unexpected formats to history
        }

        addMessageToChatbox(botMessage, 'bot');

    } catch (error) {
        console.error('Error sending message or fetching response:', error);
        // Error might have already been displayed by the !response.ok check
        if (errorDisplay.style.display === 'none') {
            displayError(`An unexpected error occurred: ${error.message}. Check the console.`);
        }
        // Make sure history doesn't get corrupted on error (e.g., don't add a model turn)
    } finally {
        setLoading(false); // Hide loading indicator
        sendButton.disabled = false; // Re-enable button
        userInput.disabled = false;  // Re-enable input
        userInput.focus();           // Set focus back to input
    }
}

// Function to handle sending a message
function handleSendMessage() {
    const message = userInput.value.trim();
    if (message && !sendButton.disabled) { // Only send if not empty and not loading
        clearError(); // Clear error on new message send
        addMessageToChatbox(message, 'user');
        userInput.value = ''; // Clear the input field
        getBotResponse(message); // Get the bot's response
    }
}

// --- Event Listeners ---

// Send message when button is clicked
sendButton.addEventListener('click', handleSendMessage);

// Send message when Enter key is pressed in the input field
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default form submission if wrapped in form
        handleSendMessage();
    }
});

// --- Initial Setup ---
userInput.focus(); // Focus the input field on load
// Optional: Limit conversation history length to avoid overly large requests
// (You can implement logic here to trim `conversationHistory` if it gets too long)
