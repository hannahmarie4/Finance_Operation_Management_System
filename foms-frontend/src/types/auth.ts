/**
 * FOMS Auth Types
 * FR-001 / FR-005: Five authorized roles for FOMS access.
 */

export type UserRole =
  | 'Finance Manager'
  | 'Financial Manager'
  | 'Head Accountant'
  | 'Accountant'
  | 'Assistant of Finance Manager'
  | 'Assistant of Financial Manager';

export interface User {
  employeeId: string;
  fullName: string;
  role: UserRole;
  avatarInitials: string;
  /** ISO string of the last successful login */
  lastLogin?: string;
  /** ISO strings of recent login timestamps (up to 5) */
  loginHistory?: string[];
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface RegisterUserParams {
  employeeId: string;
  fullName: string;
  role: UserRole;
  password: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerUser: (params: RegisterUserParams) => Promise<{ success: boolean; error?: string }>;
}
