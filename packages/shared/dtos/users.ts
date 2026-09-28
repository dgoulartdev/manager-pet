export interface UpdateUserRequest {
  name?: string;
  email?: string;
  // Obrigatória quando o e-mail muda: é o e-mail que dá acesso à conta.
  current_password?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
