import { apiRequest } from '../auth/api/authApi'

export function sendAssistantMessage(message, { signal } = {}) {
  return apiRequest('/assistant/messages', {
    method: 'POST',
    body: JSON.stringify({ message }),
    signal,
  })
}