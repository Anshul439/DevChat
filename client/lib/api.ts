import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_ROOT_URL;

export const fetchMessages = async (user1: string, user2: string) => {
  try {
    const response = await axios.get(`${API_URL}/message`, {
      params: { user1, user2 },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const sendMessage = async (text: string, receiver: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/message`,
      { text, receiver },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};