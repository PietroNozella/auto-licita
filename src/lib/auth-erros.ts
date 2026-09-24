// Traduz erros crus do Supabase Auth para mensagens em português.
export function traduzirErroAuth(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "Email ou senha inválidos."
  }
  if (/user already registered|already been registered/i.test(message)) {
    return "Este email já está cadastrado. Tente fazer login."
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirme seu email antes de entrar."
  }
  if (/password should be at least/i.test(message)) {
    return "A senha deve ter no mínimo 6 caracteres."
  }
  return message
}
