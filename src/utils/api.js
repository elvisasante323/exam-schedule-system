import axios from "axios";

export const api = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL,
});

export async function getExams() {
  const { data } = await api.get("/api/exams");
  return data;
}

export async function getExamById(id) {
  const { data } = await api.get(`/api/exams/${id}`);
  return data;
}

export async function getCandidates() {
  const { data } = await api.get("/api/candidates");
  return data;
}

export async function getLocations() {
  const { data } = await api.get("/api/locations");
  return data;
}

export async function updateExamStatus(id, status) {
  const { data } = await api.patch(`/api/exams/${id}/status`, { status });
  return data;
}
