import axios from './axios-instance';
import type {
  Quiz,
  Question,
  QuestionOption,
  PaginatedResponse,
  ImportResult,
  QuizAttempt,
} from '@/types';

export const quizService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    courseId?: string;
  }): Promise<PaginatedResponse<Quiz>> {
    const { data } = await axios.get('/quizzes', { params });
    return data as PaginatedResponse<Quiz>;
  },

  async getById(id: string): Promise<Quiz> {
    const { data } = await axios.get(`/quizzes/${id}`);
    return data as Quiz;
  },

  async create(body: Partial<Quiz>): Promise<Quiz> {
    const { data } = await axios.post('/quizzes', body);
    return data as Quiz;
  },

  async bulkCreate(body: {
    title: string;
    description?: string;
    type: string;
    duration?: number;
    isPublished?: boolean;
    courseId?: string | null;
    chapterId?: string | null;
    questions: Array<{
      content: string;
      points: number;
      options: Array<{ content: string; isCorrect: boolean }>;
    }>;
  }): Promise<Quiz> {
    const { data } = await axios.post('/quizzes/bulk-create', body);
    return data as Quiz;
  },

  async update(id: string, body: Partial<Quiz>): Promise<Quiz> {
    const { data } = await axios.put(`/quizzes/${id}`, body);
    return data as Quiz;
  },

  async bulkUpdate(id: string, body: {
    title: string;
    description?: string;
    type: string;
    duration?: number;
    isPublished?: boolean;
    courseId?: string | null;
    chapterId?: string | null;
    questions: Array<{
      id?: string;
      content: string;
      points: number;
      options: Array<{ id?: string; content: string; isCorrect: boolean }>;
    }>;
  }): Promise<Quiz> {
    const { data } = await axios.put(`/quizzes/${id}/bulk-update`, body);
    return data as Quiz;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`/quizzes/${id}`);
  },

  async createQuestion(quizId: string, body: Partial<Question>): Promise<Question> {
    const { data } = await axios.post(`/quizzes/${quizId}/questions`, body);
    return data as Question;
  },

  async updateQuestion(quizId: string, questionId: string, body: Partial<Question>): Promise<Question> {
    const { data } = await axios.put(`/quizzes/${quizId}/questions/${questionId}`, body);
    return data as Question;
  },

  async deleteQuestion(quizId: string, questionId: string): Promise<void> {
    await axios.delete(`/quizzes/${quizId}/questions/${questionId}`);
  },

  async createOption(quizId: string, questionId: string, body: Partial<QuestionOption>): Promise<QuestionOption> {
    const { data } = await axios.post(`/quizzes/${quizId}/questions/${questionId}/options`, body);
    return data as QuestionOption;
  },

  async updateOption(quizId: string, questionId: string, optionId: string, body: Partial<QuestionOption>): Promise<QuestionOption> {
    const { data } = await axios.put(`/quizzes/${quizId}/questions/${questionId}/options/${optionId}`, body);
    return data as QuestionOption;
  },

  async deleteOption(quizId: string, questionId: string, optionId: string): Promise<void> {
    await axios.delete(`/quizzes/${quizId}/questions/${questionId}/options/${optionId}`);
  },

  async exportList(params?: { search?: string; type?: string; courseId?: string }): Promise<Blob> {
    const data = await axios.get('/quiz-manage/export-list', {
      params,
      responseType: 'blob',
    });
    return data as Blob;
  },

  async exportDetail(quizId: string): Promise<Blob> {
    const data = await axios.get(`/quiz-manage/export-detail/${quizId}`, {
      responseType: 'blob',
    });
    return data as Blob;
  },

  async downloadTemplate(): Promise<Blob> {
    const data = await axios.get('/quiz-manage/import-template', {
      responseType: 'blob',
    });
    return data as Blob;
  },

  async importQuizzes(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post('/quiz-manage/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as ImportResult;
  },

  async startAttempt(quizId: string): Promise<QuizAttempt> {
    const { data } = await axios.post(`/quizzes/${quizId}/attempts`);
    return data as QuizAttempt;
  },

  async submitAttempt(
    quizId: string,
    attemptId: string,
    answers: { questionId: string; selectedOptionId: string }[],
  ): Promise<QuizAttempt> {
    const { data } = await axios.post(
      `/quizzes/${quizId}/attempts/${attemptId}/submit`,
      { answers },
    );
    return data as QuizAttempt;
  },

  async getMyAttempts(quizId: string): Promise<QuizAttempt[]> {
    const { data } = await axios.get(`/quizzes/${quizId}/attempts/my`);
    return data as QuizAttempt[];
  },

  async getAttemptDetail(quizId: string, attemptId: string): Promise<QuizAttempt> {
    const { data } = await axios.get(`/quizzes/${quizId}/attempts/${attemptId}`);
    return data as QuizAttempt;
  },
};