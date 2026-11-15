import axios, { AxiosError } from 'axios'
import { getToken, limpiarSesion } from './sesion.js'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (esError401(error) && !error.config?.url?.includes('/auth/login')) {
      limpiarSesion()
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

export function esError401(error) {
  return error instanceof AxiosError && error.response?.status === 401
}

export { mensajeDeError } from './errores.js'
