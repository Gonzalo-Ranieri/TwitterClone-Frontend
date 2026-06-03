import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '../api/client';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

// Mock the axios client
vi.mock('../api/client', () => {
  return {
    default: {
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
  };
});

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('allows a user to register successfully', async () => {
    (client.post as any).mockResolvedValueOnce({
      data: {
        token: 'mock-jwt-token',
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'newuser',
        email: 'newuser@example.com',
        bio: 'Hello world',
        avatarPlaceholder: 'avatar.png'
      }
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<div>Timeline Home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Enter values
    fireEvent.change(screen.getByLabelText(/Nombre de usuario label/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico label/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña label/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Biografía/i), { target: { value: 'Hello world' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Registrarse/i }));

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        bio: 'Hello world',
        avatarPlaceholder: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=newuser'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Timeline Home')).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(JSON.parse(localStorage.getItem('user') || '{}').username).toBe('newuser');
    });
  });

  it('allows a user to log in successfully', async () => {
    (client.post as any).mockResolvedValueOnce({
      data: {
        token: 'mock-jwt-token',
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'loginuser',
        email: 'loginuser@example.com'
      }
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div>Timeline Home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Enter values
    fireEvent.change(screen.getByLabelText(/Nombre de usuario o Email/i), { target: { value: 'loginuser' } });
    fireEvent.change(screen.getByLabelText(/Contraseña label/i), { target: { value: 'password123' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/api/auth/login', {
        usernameOrEmail: 'loginuser',
        password: 'password123'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Timeline Home')).toBeInTheDocument();
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
    });
  });

  it('redirects unauthorized users trying to access protected routes', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <div>Timeline Home (Protected)</div>
              </ProtectedRoute>
            } />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Since token is not present, ProtectedRoute should redirect to /login
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Timeline Home (Protected)')).not.toBeInTheDocument();
    });
  });
});
