// TalkTime Frontend API Client
import { User, Conversation, ConversationMember, ConversationItem, Message, Notification } from '../types';

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api`;

export function resolveMediaUrl(url: string | null | undefined): string | null | undefined {
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('talktime_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || 'An error occurred during API request.');
    }

    return data;
  }

  // Auth APIs
  async register(body: { name: string; username: string; email: string; password: string; bio?: string; avatarUrl?: string }) {
    return this.request<{ success: boolean; data: { user: User; token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: { identifier: string; password: string }) {
    return this.request<{ success: boolean; data: { user: User; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async logout() {
    return this.request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request<{ success: boolean; data: { user: User } }>('/auth/me');
  }

  // Users APIs
  async searchUsers(query = '') {
    return this.request<{ success: boolean; data: { users: User[] } }>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  async getUser(id: string) {
    return this.request<{ success: boolean; data: { user: User } }>(`/users/${id}`);
  }

  async updateUser(id: string, updates: Partial<User> & { oldPassword?: string; newPassword?: string }) {
    return this.request<{ success: boolean; data: { user: User } }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request<{ success: boolean; data: { url: string } }>('/users/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  // Conversation APIs
  async getConversations() {
    return this.request<{ success: boolean; data: { conversations: ConversationItem[] } }>('/conversations');
  }

  async getConversation(id: string) {
    return this.request<{ success: boolean; data: { conversation: Conversation; members: ConversationMember[] } }>(`/conversations/${id}`);
  }

  async createDirectConversation(recipientId: string) {
    return this.request<{ success: boolean; data: { conversation: Conversation; members: ConversationMember[]; isNew: boolean } }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ isGroup: false, recipientId }),
    });
  }

  async createGroupConversation(data: { name: string; avatarUrl?: string; memberIds: string[] }) {
    return this.request<{ success: boolean; data: { conversation: Conversation; members: ConversationMember[]; isNew: boolean } }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ isGroup: true, ...data }),
    });
  }

  async updateConversation(id: string, updates: { name?: string; avatarUrl?: string }) {
    return this.request<{ success: boolean; data: { conversation: Conversation } }>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async addGroupMembers(id: string, userIds: string[]) {
    return this.request<{ success: boolean; data: { members: ConversationMember[] } }>(`/conversations/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  async removeGroupMember(id: string, userId: string) {
    return this.request<{ success: boolean; message: string }>(`/conversations/${id}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async markConversationRead(id: string) {
    return this.request<{ success: boolean; data: { updatedCount: number } }>(`/conversations/${id}/read`, {
      method: 'POST',
    });
  }

  // Messages APIs
  async getMessages(conversationId: string, limit = 50, before?: string) {
    const url = `/messages/conversations/${conversationId}/messages?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`;
    return this.request<{ success: boolean; data: { messages: Message[]; hasMore: boolean } }>(url);
  }

  async sendMessage(conversationId: string, data: { content?: string; messageType?: string; replyToId?: string | null; attachments?: any[] }) {
    return this.request<{ success: boolean; data: { message: Message } }>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadAttachment(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ success: boolean; data: { attachment: any } }>('/messages/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async editMessage(id: string, content: string) {
    return this.request<{ success: boolean; data: { message: Message } }>(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(id: string, mode: 'FOR_EVERYONE' | 'FOR_ME') {
    return this.request<{ success: boolean; data: { message: Message } }>(`/messages/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ mode }),
    });
  }

  async searchMessages(query: string, conversationId?: string) {
    const url = `/messages/search?q=${encodeURIComponent(query)}${conversationId ? `&conversationId=${conversationId}` : ''}`;
    return this.request<{ success: boolean; data: { results: any[] } }>(url);
  }

  // Notifications APIs
  async getNotifications() {
    return this.request<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean; message: string }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean; data: { markedCount: number } }>('/notifications/read-all', {
      method: 'PUT',
    });
  }

}

export const api = new ApiClient();
